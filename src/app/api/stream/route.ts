import { NextRequest, NextResponse } from "next/server";
import { openTrackToken } from "@/lib/token";

// Deezer preview URLs are signed and expire, so each one is resolved fresh and the audio proxied.
const audioCache = new Map<number, { buffer: ArrayBuffer; at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 120;

async function fetchWithTimeout(url: string, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const audioResponse = (buffer: ArrayBuffer) =>
  new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });

export async function GET(request: NextRequest) {
  const trackId = openTrackToken(request.nextUrl.searchParams.get("t"));
  if (trackId === null) return new NextResponse("Ronda inválida", { status: 400 });

  const cached = audioCache.get(trackId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return audioResponse(cached.buffer);

  try {
    const meta = await fetchWithTimeout(`https://api.deezer.com/track/${trackId}`, 8000);
    const data = meta.ok ? await meta.json() : null;
    if (!data?.preview) return new NextResponse("Sin vista previa", { status: 404 });

    const audio = await fetchWithTimeout(data.preview, 12000);
    if (!audio.ok) return new NextResponse("Deezer no respondió", { status: 502 });
    const buffer = await audio.arrayBuffer();

    audioCache.delete(trackId);
    audioCache.set(trackId, { buffer, at: Date.now() });
    if (audioCache.size > CACHE_MAX) audioCache.delete(audioCache.keys().next().value!);
    return audioResponse(buffer);
  } catch (err) {
    console.warn(`[stream] track ${trackId}:`, err instanceof Error ? err.message : err);
    return new NextResponse("Error de audio", { status: 502 });
  }
}
