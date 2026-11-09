import "server-only";
import { titleKey } from "./catalog";
import { deezerGet, DeezerTrack } from "./deezer";
import { SearchResultItem } from "./types";

/**
 * Song search over all of Deezer for playlist mode, ported from Syncora Player's search
 * (lib/features/search/search_ranking.dart). Deezer's own order buries the real song under covers
 * and karaoke versions, so results are re-ranked by text relevance plus popularity, and when the
 * query names a well-known artist their songs get a boost (and their top songs are fetched if the
 * search missed them).
 */

interface DeezerArtist {
  id: number;
  name: string;
  nb_fan?: number;
}

/** Lowercase, no accents or apostrophes, digits split from letters ("3A.M." -> "3 a m"). */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`´]/g, "")
    .replace(/(?<=[0-9])(?=[a-z])|(?<=[a-z])(?=[0-9])/g, " ")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const tokens = (normalized: string) => (normalized ? normalized.split(" ") : []);

/** A query token covers a result token when it is its prefix: "arian" still finds "ariana". */
const covers = (q: string, t: string) => t.startsWith(q);

/** 0..100: how much of the query is in title+artist (recall) and how much of the title is the query (precision). */
function textScore(query: string, title: string, artist: string): number {
  const q = new Set(tokens(normalize(query)));
  if (!q.size) return 0;
  const titleTokens = tokens(normalize(title));
  const union = [...titleTokens, ...tokens(normalize(artist))];
  const recall = [...q].filter((x) => union.some((t) => covers(x, t))).length / q.size;
  const precision = titleTokens.length
    ? titleTokens.filter((t) => [...q].some((x) => covers(x, t))).length / titleTokens.length
    : 0;
  return 100 * (0.6 * recall + 0.4 * precision);
}

/** Deezer's rank runs 0..~1M. */
const popScore = (rank?: number) => (rank && rank > 0 ? Math.min(100, rank / 10000) : 0);

/** 0..40 on a log scale, so a superstar only wins ties, not every query. */
const fanBonus = (fans?: number) => (fans && fans > 0 ? Math.min(40, (Math.log10(fans + 1) / 7.19) * 40) : 0);

/** Artist names don't lose points for extra words: "bruno" should find Bruno Mars over a "Bruno". */
function artistTextScore(query: string, name: string): number {
  const q = new Set(tokens(normalize(query)));
  if (!q.size) return 0;
  const nameTokens = tokens(normalize(name));
  const recall = [...q].filter((x) => nameTokens.some((t) => covers(x, t))).length / q.size;
  return 100 * recall + (normalize(name) === normalize(query) ? 10 : 0);
}

/** The artist the query is clearly about, if any, and only if one of their songs came back. */
function dominantArtist(artists: DeezerArtist[], query: string, pool: DeezerTrack[]): DeezerArtist | null {
  const ranked = artists
    .map((a) => ({ a, text: artistTextScore(query, a.name) }))
    .filter((x) => x.text >= 20)
    .sort((x, y) => y.text + fanBonus(y.a.nb_fan) - (x.text + fanBonus(x.a.nb_fan)));
  const top = ranked[0];
  if (!top || top.text + fanBonus(top.a.nb_fan) < 60) return null;
  return pool.some((t) => t.artist.id === top.a.id) ? top.a : null;
}

/** A single usually has an album titled like the song ("Espresso - Single"). */
function looksLikeSingle(t: DeezerTrack): boolean {
  const album = normalize(t.album.title).replace(/\s+(single|ep)$/, "");
  return !!album && album === normalize(t.title);
}

/** When the single and the album cut are the same recording, show the album one (swap only). */
function preferAlbumOverSingle(ranked: DeezerTrack[]): DeezerTrack[] {
  const out = [...ranked];
  for (let i = 0; i < out.length; i++) {
    const single = out[i];
    if (!looksLikeSingle(single)) continue;
    for (let j = i + 1; j < out.length; j++) {
      const c = out[j];
      if (looksLikeSingle(c)) continue;
      const same =
        c.artist.id === single.artist.id &&
        normalize(c.title) === normalize(single.title) &&
        Math.abs((c.duration ?? 0) - (single.duration ?? 0)) <= 3;
      if (!same) continue;
      if ((single.rank ?? 0) > 0 && (c.rank ?? 0) < (single.rank ?? 0) * 0.6) break;
      out[i] = c;
      out[j] = single;
      break;
    }
  }
  return out;
}

function rankTracks(tracks: DeezerTrack[], query: string, dominant: DeezerArtist | null): DeezerTrack[] {
  const scored = tracks.map((t) => ({
    t,
    score:
      textScore(query, t.title, t.artist.name) +
      popScore(t.rank) +
      (dominant && t.artist.id === dominant.id ? fanBonus(dominant.nb_fan) : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return preferAlbumOverSingle(scored.map((s) => s.t));
}

const RESULTS = 25;
const cache = new Map<string, { at: number; results: SearchResultItem[] }>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 400;

export async function searchDeezer(rawQuery: string): Promise<SearchResultItem[] | null> {
  const query = rawQuery.trim().slice(0, 100);
  if (query.length < 2) return [];
  const key = normalize(query);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.results;

  const q = encodeURIComponent(query);
  const [trackData, artistData] = await Promise.all([
    deezerGet<{ data: DeezerTrack[] }>(`/search?q=${q}&limit=100`),
    deezerGet<{ data: DeezerArtist[] }>(`/search/artist?q=${q}&limit=25`),
  ]);
  if (!trackData) return null;

  const usable = (t: DeezerTrack) => t?.artist && t.album && (t.duration ?? 0) > 60 && t.readable !== false;
  let pool = (trackData.data ?? []).filter(usable);
  const dominant = dominantArtist(artistData?.data ?? [], query, pool);
  let ranked = rankTracks(pool, query, dominant);

  // The artist's songs got buried under covers: bring in their top songs (one extra request).
  if (dominant && !ranked.slice(0, 5).some((t) => t.artist.id === dominant.id)) {
    const top = await deezerGet<{ data: DeezerTrack[] }>(`/artist/${dominant.id}/top?limit=10`);
    const ids = new Set(pool.map((t) => t.id));
    const extra = (top?.data ?? []).filter((t) => usable(t) && !ids.has(t.id));
    if (extra.length) {
      pool = [...pool, ...extra];
      ranked = rankTracks(pool, query, dominant);
    }
  }

  // One entry per song and artist: guesses are checked by title, so versions only add noise.
  const seen = new Set<string>();
  const results: SearchResultItem[] = [];
  for (const t of ranked) {
    const k = `${normalize(t.artist.name)}|${titleKey(t.title)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    results.push({ id: t.id, title: t.title, artist: t.artist.name, cover: t.album.cover_medium ?? t.album.cover ?? "" });
    if (results.length >= RESULTS) break;
  }

  cache.set(key, { at: Date.now(), results });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return results;
}
