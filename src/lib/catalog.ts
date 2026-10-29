import "server-only";
import tracksData from "@/data/tracks.json";
import { seededRandom } from "./rng";
import { sanitizeFilters } from "./filters";
import {
  ALL_DIFFICULTIES,
  ALL_ERAS,
  ALL_GENRES,
  ArtistResult,
  CatalogFacets,
  Filters,
  Language,
  LanguageFilter,
  SearchResultItem,
  Source,
  Track,
} from "./types";

const tracks = tracksData as unknown as Track[];
const byId = new Map(tracks.map((t) => [t.id, t]));

export function fold(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Precomputed search keys: folding 13k titles on every keystroke is wasteful.
const searchIndex = tracks.map((t) => ({ track: t, title: fold(t.title), artist: fold(t.artist) }));

const artistIndex = (() => {
  const map = new Map<string, { name: string; key: string; songs: number; cover: string; topRank: number }>();
  for (const t of tracks) {
    const entry = map.get(t.artist);
    if (!entry) map.set(t.artist, { name: t.artist, key: fold(t.artist), songs: 1, cover: t.cover, topRank: t.rank });
    else {
      entry.songs++;
      if (t.rank > entry.topRank) {
        entry.topRank = t.rank;
        entry.cover = t.cover;
      }
    }
  }
  return [...map.values()];
})();

export function getTrack(id: number): Track | undefined {
  return byId.get(id);
}

/** Song identity from its title alone: no subtitles, no feat., no punctuation. */
export function titleKey(title: string): string {
  return fold(title)
    .replace(/[\(\[][^\)\]]*[\)\]]/g, " ")
    .replace(/\s[-–]\s.*$/, " ")
    .replace(/\b(feat|ft|with|con)\.?\s.*$/, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9ñ ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesFilters(t: Track, f: Filters): boolean {
  return (
    (f.language === "all" || t.language === f.language) &&
    f.genres.includes(t.genre) &&
    f.eras.includes(t.era) &&
    f.difficulties.includes(t.difficulty)
  );
}

/** Every song a source can produce. Never widens a filter silently: an empty pool stays empty. */
export function eligibleTracks(source: Source): Track[] {
  if (source.kind === "artists") {
    const wanted = new Set(source.artists);
    return tracks.filter((t) => wanted.has(t.artist));
  }
  const f = sanitizeFilters(source.filters);
  return tracks.filter((t) => matchesFilters(t, f));
}

/**
 * Any song of the pool with the same chance, skipping the artists heard in the last few rounds.
 * (Picking an artist first gave a one-hit artist the same weight as Bad Bunny, which filled
 * games with deep cuts.)
 */
function pickDiverse(pool: Track[], rand: () => number, avoidArtists: Set<string>): Track {
  const allowed = pool.filter((t) => !avoidArtists.has(t.artist));
  const from = allowed.length ? allowed : pool;
  return from[Math.floor(rand() * from.length)];
}

export function pickRound(
  source: Source,
  exclude: number[],
  avoidArtists: string[]
): { track: Track; recycled: boolean } | null {
  const pool = eligibleTracks(source);
  if (pool.length === 0) return null;
  const excluded = new Set(exclude);
  const fresh = pool.filter((t) => !excluded.has(t.id));
  const recycled = fresh.length === 0;
  const track = pickDiverse(recycled ? pool : fresh, Math.random, new Set(avoidArtists));
  return { track, recycled };
}

/**
 * Deterministic game: the same seed, source and exclusions always give the same songs in the same
 * order. Recently heard songs are skipped while the pool still has enough without them.
 */
export function pickGame(source: Source, count: number, seed: string, exclude: number[] = []): Track[] {
  const all = eligibleTracks(source).sort((a, b) => a.id - b.id);
  const excluded = new Set(exclude);
  const fresh = all.filter((t) => !excluded.has(t.id));
  const pool = fresh.length >= count ? fresh : all;
  const rand = seededRandom(seed);
  const chosen: Track[] = [];
  const recentArtists: string[] = [];
  let remaining = pool;
  while (chosen.length < count && remaining.length > 0) {
    const track = pickDiverse(remaining, rand, new Set(recentArtists));
    chosen.push(track);
    remaining = remaining.filter((t) => t.id !== track.id);
    recentArtists.push(track.artist);
    // With a single artist (artist mode) avoiding repeats is impossible; otherwise keep the last few apart.
    if (recentArtists.length > 3) recentArtists.shift();
  }
  return chosen;
}

export function searchTracks(
  query: string,
  opts: { language?: LanguageFilter; artists?: string[] } = {},
  limit = 40
): SearchResultItem[] {
  const q = fold(query);
  if (q.length < 2) return [];
  const words = q.split(/\s+/).filter(Boolean);
  const artistSet = opts.artists?.length ? new Set(opts.artists) : null;

  const scored: { t: Track; score: number }[] = [];
  for (const { track, title, artist } of searchIndex) {
    if (opts.language && opts.language !== "all" && track.language !== opts.language) continue;
    if (artistSet && !artistSet.has(track.artist)) continue;
    const both = `${title} ${artist}`;
    if (!words.every((w) => both.includes(w))) continue;

    // Ranking depends only on the query text, never on the song being played.
    const titleScore = title === q ? 6 : title.startsWith(q) ? 4 : title.includes(q) ? 2 : 0;
    const artistScore = artist === q ? 5 : artist.startsWith(q) ? 3 : artist.includes(q) ? 1 : 0;
    scored.push({ t: track, score: Math.max(titleScore, artistScore) });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    // Inside one artist list songs A-Z so the biggest hit isn't handed out first.
    if (a.t.artist === b.t.artist) return a.t.title.localeCompare(b.t.title, "es", { sensitivity: "base" });
    return b.t.rank - a.t.rank;
  });

  // One entry per song and artist, even if two releases slipped into the catalog.
  const seen = new Set<string>();
  const unique = scored.filter(({ t }) => {
    const key = `${titleKey(t.title)}::${t.artist}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, limit).map(({ t }) => ({ id: t.id, title: t.title, artist: t.artist, cover: t.cover }));
}

export function searchArtists(query: string, limit = 12): ArtistResult[] {
  const q = fold(query);
  if (q.length < 1) {
    return [...artistIndex].sort((a, b) => b.topRank - a.topRank).slice(0, limit).map(toArtistResult);
  }
  return artistIndex
    .filter((a) => a.key.includes(q))
    .sort((a, b) => Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)) || b.topRank - a.topRank)
    .slice(0, limit)
    .map(toArtistResult);
}

const toArtistResult = (a: (typeof artistIndex)[number]): ArtistResult => ({ name: a.name, songs: a.songs, cover: a.cover });

let facetsCache: CatalogFacets | null = null;

export function catalogFacets(): CatalogFacets {
  if (facetsCache) return facetsCache;
  const languages: Language[] = ["es", "en"];
  const genres = ALL_GENRES.map((g) => g.id);
  const eras = ALL_ERAS.map((e) => e.id);
  const difficulties = ALL_DIFFICULTIES.map((d) => d.id);
  const counts = languages.map(() => genres.map(() => eras.map(() => difficulties.map(() => 0))));
  for (const t of tracks) {
    const li = languages.indexOf(t.language);
    const gi = genres.indexOf(t.genre);
    const ei = eras.indexOf(t.era);
    const di = difficulties.indexOf(t.difficulty);
    if (li >= 0 && gi >= 0 && ei >= 0 && di >= 0) counts[li][gi][ei][di]++;
  }
  facetsCache = { languages, genres, eras, difficulties, counts };
  return facetsCache;
}

export const catalogSize = tracks.length;
