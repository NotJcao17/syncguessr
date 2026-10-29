import { NextRequest, NextResponse } from "next/server";
import { getTrack, titleKey } from "@/lib/catalog";
import { openTrackToken } from "@/lib/token";

// Deezer preview URLs are signed and expire, so each one is resolved fresh and the audio proxied.
const audioCache = new Map<number, { buffer: ArrayBuffer; at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 120;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url: string, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Deezer API call that waits out its rate limit ("Quota limit exceeded" comes back as a 200). */
async function deezerApi(path: string) {
  for (let i = 0; i < 3; i++) {
    const res = await fetchWithTimeout(`https://api.deezer.com${path}`, 8000).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (data?.error?.code === 4 || !res || res.status >= 500) {
      await sleep(700 * (i + 1));
      continue;
    }
    return data;
  }
  return null;
}

/**
 * The track's own preview, or another release of the same song by the same artist when that one
 * has none (some releases are blocked in the server's region or were taken down).
 */
async function previewUrl(trackId: number): Promise<string | null> {
  const data = await deezerApi(`/track/${trackId}`);
  if (data?.preview) return data.preview;
  const track = getTrack(trackId);
  if (!track) return null;
  const found = await deezerApi(`/search?q=${encodeURIComponent(`${track.artist} ${track.title}`)}&limit=15`);
  const alt = (found?.data ?? []).find(
    (d: { preview?: string; title: string; artist?: { name: string } }) =>
      d.preview && titleKey(d.title) === titleKey(track.title) && d.artist?.name.toLowerCase() === track.artist.toLowerCase()
  );
  return alt?.preview ?? null;
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
    const url = await previewUrl(trackId);
    if (!url) {
      console.warn(`[stream] track ${trackId}: no preview available`);
      return new NextResponse("Sin vista previa", { status: 404 });
    }

    let audio = await fetchWithTimeout(url, 12000);
    if (!audio.ok) audio = await fetchWithTimeout(url, 12000);
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
