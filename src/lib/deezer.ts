import "server-only";
import { RevealedTrack } from "./types";

/**
 * Deezer API calls from the server for playlist mode (songs outside the curated catalog).
 * Deezer limits requests per IP and answers "quota exceeded" as a 200 with error code 4.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function deezerGet<T = unknown>(path: string): Promise<T | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`https://api.deezer.com${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (data?.error?.code === 4 || res.status >= 500) {
        await sleep(700 * (i + 1));
        continue;
      }
      if (!data || data.error) return null;
      return data as T;
    } catch {
      await sleep(400);
    }
  }
  return null;
}

/** The fields of a Deezer track the game uses (search results and /track/{id} share them). */
export interface DeezerTrack {
  id: number;
  title: string;
  title_version?: string;
  readable?: boolean;
  duration?: number;
  rank?: number;
  preview?: string;
  release_date?: string;
  artist: { id: number; name: string };
  album: { id?: number; title: string; cover_medium?: string; cover_xl?: string; cover?: string };
}

/** Small LRU-ish cache: a playlist round reveals the same handful of tracks over and over. */
const trackCache = new Map<number, DeezerTrack>();
const TRACK_CACHE_MAX = 500;

export async function getDeezerTrack(id: number): Promise<DeezerTrack | null> {
  const hit = trackCache.get(id);
  if (hit) return hit;
  const track = await deezerGet<DeezerTrack>(`/track/${id}`);
  if (!track?.id || !track.artist || !track.album) return null;
  trackCache.set(id, track);
  if (trackCache.size > TRACK_CACHE_MAX) trackCache.delete(trackCache.keys().next().value!);
  return track;
}

export function revealDeezerTrack(t: DeezerTrack): RevealedTrack {
  const cover = t.album.cover_medium ?? t.album.cover ?? "";
  return {
    id: t.id,
    title: t.title,
    artist: t.artist.name,
    album: t.album.title,
    cover,
    coverXl: t.album.cover_xl ?? cover,
    year: Number(t.release_date?.slice(0, 4)) || 0,
  };
}
