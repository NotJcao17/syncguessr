import { NextRequest, NextResponse } from "next/server";

// In-memory cache for audio buffers to avoid re-fetching the same track within 1 hour
const audioCache = new Map<number, { buffer: ArrayBuffer; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idStr = searchParams.get("id");
  if (!idStr) {
    return new NextResponse("Missing track id", { status: 400 });
  }

  const trackId = parseInt(idStr, 10);
  if (isNaN(trackId)) {
    return new NextResponse("Invalid track id", { status: 400 });
  }

  // Check cache
  const cached = audioCache.get(trackId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return new NextResponse(cached.buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(cached.buffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  try {
    // 1. Fetch fresh signed preview URL directly from Deezer API
    const dzRes = await fetch(`https://api.deezer.com/track/${trackId}`, {
      cache: "no-store",
    });

    if (!dzRes.ok) {
      return new NextResponse("Track metadata not found on Deezer", { status: 404 });
    }

    const dzData = await dzRes.json();
    const previewUrl = dzData.preview;

    if (!previewUrl) {
      return new NextResponse("Track has no audio preview on Deezer", { status: 404 });
    }

    // 2. Stream audio bytes from Deezer CDN
    const audioRes = await fetch(previewUrl, { cache: "no-store" });
    if (!audioRes.ok) {
      return new NextResponse("Failed to fetch audio from Deezer CDN", { status: 502 });
    }

    const arrayBuffer = await audioRes.arrayBuffer();

    // Cache the buffer
    audioCache.set(trackId, { buffer: arrayBuffer, timestamp: now });

    // Clean up old cache entries if map grows large (> 100 entries)
    if (audioCache.size > 100) {
      const oldestKey = audioCache.keys().next().value;
      if (oldestKey) audioCache.delete(oldestKey);
    }

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(arrayBuffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error proxying audio";
    console.warn(`[StreamAPI] Error fetching track ${trackId}:`, message);
    return new NextResponse("Internal stream error", { status: 500 });
  }
}
