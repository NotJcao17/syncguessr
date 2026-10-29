// Step 1: merge the original catalog with the expansion and collapse every song to one recording.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { ARTISTS, ALIASES, BLOCKED, BILINGUAL, SPANISH_VERSIONS_ONLY, isForeignTitle, titleLanguage } from "./artists.mjs";
import { displayTitle, songKey, artistKey, isBadVersion, isRemix, isLiveAlbum } from "./normalize.mjs";

// The pre-cleanup catalog is kept in the cache; without it the current catalog is re-processed.
const CACHE = "scripts/catalog/.cache";
const ORIGINAL = `${CACHE}/tracks.original.json`;
const src = process.argv[2] ?? (existsSync(ORIGINAL) ? ORIGINAL : "src/data/tracks.json");
const expanded = existsSync(`${CACHE}/expanded.json`) ? JSON.parse(readFileSync(`${CACHE}/expanded.json`, "utf8")) : [];
const tracks = [...JSON.parse(readFileSync(src, "utf8")), ...expanded];
mkdirSync(CACHE, { recursive: true });

// One display name per artist: aliases first, then names that differ only in case or punctuation
// ("KAROL G" / "Karol G") take the spelling from artists.mjs, or else the most common one.
const listedByKey = new Map([...ARTISTS.keys()].map((name) => [artistKey(name), name]));
const spellings = new Map();
for (const t of tracks) {
  const name = ALIASES[t.artist] ?? t.artist;
  const key = artistKey(name);
  if (!spellings.has(key)) spellings.set(key, new Map());
  spellings.get(key).set(name, (spellings.get(key).get(name) ?? 0) + 1);
}
const canonical = (artist) => {
  const name = ALIASES[artist] ?? artist;
  const key = artistKey(name);
  return listedByKey.get(key) ?? [...spellings.get(key).entries()].sort((a, b) => b[1] - a[1])[0][0];
};

// "Color Esperanza 2020" is the same song as "Color Esperanza".
const baseKey = (title) => songKey(title).replace(/\s(19|20)\d\d$/, "");

const groups = new Map();
let dropped = 0;
for (const t of tracks) {
  const original = t.rawTitle || t.title;
  if (BLOCKED.has(t.artist) || isBadVersion(original) || isLiveAlbum(t.album)) {
    dropped++;
    continue;
  }
  const artist = canonical(t.artist);
  if (isForeignTitle(original) || (SPANISH_VERSIONS_ONLY.has(artist) && titleLanguage(original) !== "es")) {
    dropped++;
    continue;
  }
  const listed = ARTISTS.get(artist);
  const guessed = titleLanguage(original);
  const language = BILINGUAL.has(artist) && (guessed === "es" || guessed === "en")
    ? guessed
    : listed?.language ?? t.language;
  const genre = listed?.genre ?? (t.genre === "hiphop" ? "urban" : t.genre);
  const key = `${baseKey(original)}::${artistKey(artist)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ ...t, artist, language, genre, rawTitle: original });
}

// Prefer the plain recording: no remix/alt arrangement, no leftover subtitle besides feat., no year suffix.
const hasExtraTag = (t) => /[\(\[](?!\s*(feat|ft|with|con)\b)/i.test(displayTitle(t.rawTitle));
const hasYear = (t) => /\s(19|20)\d\d\s*$/.test(displayTitle(t.rawTitle));
const score = (t) => (isRemix(t.rawTitle) ? 0 : 4) + (hasExtraTag(t) ? 0 : 2) + (hasYear(t) ? 0 : 1);
const out = [];
for (const [key, list] of groups) {
  list.sort((a, b) => score(b) - score(a) || b.rank - a.rank);
  const best = list[0];
  // A song is as popular as its most played version, not just the one we kept.
  const rank = Math.max(...list.map((t) => t.rank));
  const iconic = list.some((t) => t.iconic);
  out.push({ ...best, rank, iconic, title: displayTitle(best.rawTitle), songKey: key.split("::")[0] });
}

writeFileSync(`${CACHE}/deduped.json`, JSON.stringify(out));
console.log(
  `in ${tracks.length} (expansion ${expanded.length}) | dropped ${dropped} | merged ${tracks.length - dropped - out.length} | out ${out.length}`
);
