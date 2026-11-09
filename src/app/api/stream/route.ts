import { NextRequest, NextResponse } from "next/server";
import { getTrack, titleKey } from "@/lib/catalog";
import { openTrackToken } from "@/lib/token";

// Deezer preview URLs are signed and expire, so each one is resolved fresh (see GET below).
const audioCache = new Map<number, { buffer: ArrayBuffer; at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 120;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Where the time of one request went; sent back as Server-Timing so /diagnostico can compare regions. */
interface Timing {
  api: number;
  audio: number;
  /** Deezer answered "quota exceeded" (it limits requests per IP, and Vercel IPs are shared). */
  quota: number;
  fallback: boolean;
}

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
async function deezerApi(path: string, timing: Timing) {
  const started = performance.now();
  try {
    for (let i = 0; i < 3; i++) {
      const res = await fetchWithTimeout(`https://api.deezer.com${path}`, 8000).catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (data?.error?.code === 4) timing.quota++;
      if (data?.error?.code === 4 || !res || res.status >= 500) {
        await sleep(700 * (i + 1));
        continue;
      }
      return data;
    }
    return null;
  } finally {
    timing.api += performance.now() - started;
  }
}

interface DeezerTrack {
  preview?: string;
  title: string;
  title_version?: string;
  duration?: number;
  rank?: number;
  artist?: { name: string };
}

/** Only these subtitles keep a release the same recording ("feat.", remasters, edits). */
const HARMLESS_VERSION =
  /^\s*[\(\[]?\s*(feat\.?|ft\.?|with|con|remaster(ed)?|\d{4} remaster(ed)?|radio edit|single version|album version)\b/i;

/**
 * The track's own preview, or the same recording from another release by the same artist when
 * that one has none (some releases are blocked in the server's region). Remixes, live takes and
 * slowed versions share the title but not the sound, so the fallback demands a plain title and,
 * when known, the same length within a few seconds.
 */
async function previewUrl(trackId: number, timing: Timing): Promise<string | null> {
  const data: DeezerTrack | null = await deezerApi(`/track/${trackId}`, timing);
  if (data?.preview) return data.preview;
  // Playlist songs aren't in the catalog: their own Deezer data names them for the fallback search.
  const track = getTrack(trackId) ?? (data?.artist ? { artist: data.artist.name, title: data.title } : null);
  if (!track) return null;
  timing.fallback = true;
  const found = await deezerApi(`/search?q=${encodeURIComponent(`${track.artist} ${track.title}`)}&limit=25`, timing);
  const candidates = ((found?.data ?? []) as DeezerTrack[]).filter(
    (d) =>
      d.preview &&
      d.artist?.name.toLowerCase() === track.artist.toLowerCase() &&
      titleKey(d.title) === titleKey(track.title) &&
      (!d.title_version || HARMLESS_VERSION.test(d.title_version)) &&
      (!data?.duration || !d.duration || Math.abs(d.duration - data.duration) <= 4)
  );
  candidates.sort((x, y) => (y.rank ?? 0) - (x.rank ?? 0));
  return candidates[0]?.preview ?? null;
}

const region = process.env.VERCEL_REGION ?? "local";

function timingHeaders(timing: Timing | null): Record<string, string> {
  const t = timing ?? { api: 0, audio: 0, quota: 0, fallback: false };
  return {
    "Server-Timing": [
      `api;dur=${t.api.toFixed(0)}`,
      `audio;dur=${t.audio.toFixed(0)}`,
      `quota;desc="${t.quota}"`,
      `fallback;desc="${t.fallback ? 1 : 0}"`,
      `cache;desc="${timing ? "miss" : "hit"}"`,
    ].join(", "),
    "X-Region": region,
  };
}

const audioResponse = (buffer: ArrayBuffer, timing: Timing | null) =>
  new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=3600",
      ...timingHeaders(timing),
    },
  });

const failure = (message: string, status: number, timing: Timing) =>
  new NextResponse(message, { status, headers: timingHeaders(timing) });

/** Resolved preview URLs, until shortly before their signature expires. */
const urlCache = new Map<number, { url: string; expires: number }>();
const URL_CACHE_MAX = 500;

/** Deezer signs preview URLs with `exp=<unix seconds>`; without one, assume ten minutes. */
const expiryOf = (url: string) => {
  const exp = Number(url.match(/exp=(\d+)/)?.[1]);
  return Number.isFinite(exp) && exp > 0 ? exp * 1000 : Date.now() + 10 * 60 * 1000;
};

/**
 * By default the browser is redirected to Deezer's CDN, which serves the file from near the player
 * (and allows any origin). Proxying meant the 480 KB went Deezer → Paris → the player's edge → the
 * player, which is several times slower far from Paris. The token still hides the track id: the
 * CDN URL is a signed hash, and the full preview was already reachable through this route anyway.
 * `proxy=1` keeps the old path: the audio engine falls back to it if the redirect fails, and
 * /diagnostico uses it to time the server.
 */
export async function GET(request: NextRequest) {
  const trackId = openTrackToken(request.nextUrl.searchParams.get("t"));
  if (trackId === null) return new NextResponse("Ronda inválida", { status: 400 });
  if (request.nextUrl.searchParams.get("proxy") !== "1") return redirectToCdn(trackId);
  return proxy(trackId);
}

async function redirectToCdn(trackId: number) {
  const hit = urlCache.get(trackId);
  if (hit && hit.expires - 60_000 > Date.now()) return redirect(hit.url, null);

  const timing: Timing = { api: 0, audio: 0, quota: 0, fallback: false };
  try {
    const url = await previewUrl(trackId, timing);
    if (!url) {
      console.warn(`[stream] track ${trackId}: no preview available (quota hits: ${timing.quota})`);
      return failure("Sin vista previa", 404, timing);
    }
    urlCache.delete(trackId);
    urlCache.set(trackId, { url, expires: expiryOf(url) });
    if (urlCache.size > URL_CACHE_MAX) urlCache.delete(urlCache.keys().next().value!);
    return redirect(url, timing);
  } catch (err) {
    console.warn(`[stream] track ${trackId}:`, err instanceof Error ? err.message : err);
    return failure("Error de audio", 502, timing);
  }
}

function redirect(url: string, timing: Timing | null) {
  const res = NextResponse.redirect(url, 302);
  // Every round has its own token; caching the redirect would only outlive the signature.
  res.headers.set("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(timingHeaders(timing))) res.headers.set(k, v);
  return res;
}

async function proxy(trackId: number) {
  const cached = audioCache.get(trackId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return audioResponse(cached.buffer, null);

  const timing: Timing = { api: 0, audio: 0, quota: 0, fallback: false };
  try {
    const url = await previewUrl(trackId, timing);
    if (!url) {
      console.warn(`[stream] track ${trackId}: no preview available (quota hits: ${timing.quota})`);
      return failure("Sin vista previa", 404, timing);
    }

    const started = performance.now();
    let audio = await fetchWithTimeout(url, 12000);
    if (!audio.ok) audio = await fetchWithTimeout(url, 12000);
    if (!audio.ok) return failure("Deezer no respondió", 502, timing);
    const buffer = await audio.arrayBuffer();
    timing.audio = performance.now() - started;

    audioCache.delete(trackId);
    audioCache.set(trackId, { buffer, at: Date.now() });
    if (audioCache.size > CACHE_MAX) audioCache.delete(audioCache.keys().next().value!);
    return audioResponse(buffer, timing);
  } catch (err) {
    console.warn(`[stream] track ${trackId}:`, err instanceof Error ? err.message : err);
    return failure("Error de audio", 502, timing);
  }
}
