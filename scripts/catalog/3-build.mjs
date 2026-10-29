// Step 3: turn the enriched cache into src/data/tracks.json.
// Works offline from whatever steps 1-2 cached; missing data falls back gracefully.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ARTISTS } from "./artists.mjs";
import { artistKey } from "./normalize.mjs";

const CACHE = "scripts/catalog/.cache";
const load = (f, fb) => (existsSync(`${CACHE}/${f}`) ? JSON.parse(readFileSync(`${CACHE}/${f}`, "utf8")) : fb);

let tracks = load("enriched.json", null) ?? load("deduped.json", []);
const deezer = load("deezer.json", {});
const mb = load("musicbrainz.json", {});
const albums = load("albums.json", {});
const log = [];

// --- availability ----------------------------------------------------------
const before = tracks.length;
tracks = tracks.filter((t) => {
  const d = deezer[t.id];
  return t.fromTop || !d || (!d.missing && d.readable !== false && d.preview !== false);
});
log.push(`unavailable on Deezer: ${before - tracks.length}`);

// --- year --------------------------------------------------------------------
const COMPILATION = /greatest|hits|best of|lo mejor|grandes [eé]xitos|collection|colecci[oó]n|essential|anthology|antolog[ií]a|gold|remaster|deluxe|anniversary|aniversario|live|en vivo|\bmtv\b|edition|edici[oó]n|the very best|platinum|singles|ultimate|definitive|20th|25th|30th|40th|50th/i;
const validYear = (y) => Number.isInteger(y) && y >= 1940 && y <= 2026;
const dzYear = (t) => {
  const album = albums[t.albumId];
  if (album?.type === "compile") return NaN;
  return parseInt((deezer[t.id]?.release ?? album?.release ?? "").slice(0, 4), 10);
};

let fromMb = 0;
let fromDz = 0;
let fromArtist = 0;
for (const t of tracks) {
  const m = mb[`${t.songKey}::${artistKey(t.artist)}`];
  const d = dzYear(t);
  if (validYear(m)) {
    t.year = validYear(d) ? Math.min(m, d) : m;
    fromMb++;
  } else if (validYear(d) && !COMPILATION.test(t.album)) {
    t.year = d;
    fromDz++;
  }
}
// Known bad dates in MusicBrainz (a demo or bootleg credited earlier than the release).
const YEAR_FIX = { "billie jean::michaeljackson": 1982 };
for (const t of tracks) {
  const fix = YEAR_FIX[`${t.songKey}::${artistKey(t.artist)}`];
  if (fix) t.year = fix;
}

// Remaining songs take the median year of the artist's dated songs.
const byArtist = new Map();
for (const t of tracks) {
  if (!byArtist.has(t.artist)) byArtist.set(t.artist, []);
  byArtist.get(t.artist).push(t);
}
for (const list of byArtist.values()) {
  const years = list.map((t) => t.year).filter(Boolean).sort((a, b) => a - b);
  const median = years[Math.floor(years.length / 2)];
  for (const t of list) {
    if (t.year) continue;
    t.year = median ?? (validYear(dzYear(t)) ? dzYear(t) : 2015);
    fromArtist++;
  }
}
log.push(`year from MusicBrainz ${fromMb}, Deezer ${fromDz}, artist median/fallback ${fromArtist}`);

const eraOf = (y) => (y < 1980 ? "pre-80" : y < 1990 ? "80s" : y < 2000 ? "90s" : y < 2010 ? "2000s" : y < 2020 ? "2010s" : "2020s");
for (const t of tracks) t.era = eraOf(t.year);

// --- genre: urban and hip-hop are one family; one genre per artist ------------
// Artists listed in artists.mjs were classified there; the rest take their majority genre.
for (const t of tracks) if (t.genre === "hiphop") t.genre = "urban";
for (const [artist, list] of byArtist) {
  if (ARTISTS.has(artist)) continue;
  const votes = {};
  for (const t of list) if (!t.iconic) votes[t.genre] = (votes[t.genre] ?? 0) + 1;
  const main = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (main) for (const t of list) if (!t.iconic) t.genre = main;
}

// --- rank refresh ------------------------------------------------------------
for (const t of tracks) {
  const d = deezer[t.id];
  if (d && typeof d.rank === "number") t.rank = d.rank;
}

// --- recognizability score ---------------------------------------------------
// Deezer rank measures streaming today, which underrates older classics, so age adds a bonus;
// an artist's biggest songs are far more recognizable than the rest of the discography.
for (const list of byArtist.values()) {
  list.sort((a, b) => b.rank - a.rank);
  const peak = list[0].rank;
  list.forEach((t, i) => {
    const age = Math.max(0, Math.min(1, (2016 - t.year) / 40));
    t.score = 0.55 * (t.rank / 1e6) + 0.2 * (peak / 1e6) + 0.15 / (1 + i * 0.6) + 0.1 * age;
  });
}

// Covers and same-title songs stay: guessing the right title counts as correct (see /api/verify),
// and a title-only heuristic removed far more distinct songs ("Angel", "Perfect") than real covers.

// --- difficulty by quantiles, per language and genre ----------------------------
// Ranking inside each genre keeps every filter combination playable: regional and soul songs
// stream far less than reggaetón, so a single global ranking would leave them almost no easy songs.
const SHARES = [
  ["easy", 0.16],
  ["medium", 0.3],
  ["hard", 0.3],
  ["expert", 1],
];
for (const group of new Set(tracks.map((t) => `${t.language}:${t.genre}`))) {
  const list = tracks.filter((t) => `${t.language}:${t.genre}` === group).sort((a, b) => b.score - a.score);
  let i = 0;
  let acc = 0;
  for (const [level, share] of SHARES) {
    acc = Math.min(1, acc + share);
    const end = Math.round(list.length * acc);
    for (; i < end; i++) list[i].difficulty = level;
  }
}
for (const t of tracks) if (t.iconic) t.difficulty = "easy";

// --- output ------------------------------------------------------------------
const out = tracks
  .sort((a, b) => a.id - b.id)
  .map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    cover: t.cover,
    coverXl: t.coverXl,
    rank: t.rank,
    year: t.year,
    language: t.language,
    genre: t.genre,
    era: t.era,
    difficulty: t.difficulty,
  }));

writeFileSync("src/data/tracks.json", JSON.stringify(out));

const count = (f) => out.reduce((m, t) => ((m[f(t)] = (m[f(t)] ?? 0) + 1), m), {});
log.push(`total ${out.length}`);
log.push(`language ${JSON.stringify(count((t) => t.language))}`);
log.push(`era ${JSON.stringify(count((t) => t.era))}`);
log.push(`genre ${JSON.stringify(count((t) => `${t.language}:${t.genre}`))}`);
log.push(`difficulty ${JSON.stringify(count((t) => t.difficulty))}`);
console.log(log.join("\n"));
