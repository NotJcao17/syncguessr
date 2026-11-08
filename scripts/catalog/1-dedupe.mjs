// Step 1: merge the original catalog with the expansion and collapse every song to one recording.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { ARTISTS, ALIASES, BLOCKED, BILINGUAL, CURATED, LANGUAGE_ONLY, SONG_LANGUAGE, isForeignTitle, titleLanguage } from "./artists.mjs";
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

// Artists with a single allowed language: the title decides, or the album when the title says nothing.
// Spanish versions by Italian or Brazilian singers must read as Spanish (most of their catalog isn't);
// English acts keep titles neither one can place ("SUPERMODEL" on "RUSH!").
const outsideLanguage = (artist, title, album) => {
  const only = LANGUAGE_ONLY[artist];
  if (!only) return false;
  const guessed = titleLanguage(title) ?? titleLanguage(album ?? "");
  return only === "es" ? guessed !== "es" : Boolean(guessed) && guessed !== only;
};
const curatedKeys = Object.fromEntries(Object.entries(CURATED).map(([a, titles]) => [a, new Set(titles.map(baseKey))]));

const groups = new Map();
let dropped = 0;
for (const t of tracks) {
  const original = t.rawTitle || t.title;
  if (BLOCKED.has(t.artist) || isBadVersion(original) || isLiveAlbum(t.album)) {
    dropped++;
    continue;
  }
  const artist = canonical(t.artist);
  if (
    isForeignTitle(original) ||
    outsideLanguage(artist, original, t.album) ||
    (curatedKeys[artist] && !curatedKeys[artist].has(baseKey(original)))
  ) {
    dropped++;
    continue;
  }
  const listed = ARTISTS.get(artist);
  const guessed = titleLanguage(original);
  const language = SONG_LANGUAGE[`${artist}::${displayTitle(original)}`] ??
    (BILINGUAL.has(artist) && (guessed === "es" || guessed === "en") ? guessed : listed?.language ?? t.language);
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

// Remixes whose name doesn't use brackets ("Macarena Bayside Boys Remix", "Macarena River Re-Mix")
// escape the grouping above: drop any version-tagged title that starts with another song of the artist.
const VERSION_WORD = /\b(re-?mix|mix|mezcla|bpm|rework|bootleg|edit|versi[oó]n|version|remaster(ed)?)\b/i;
const keysByArtist = new Map();
for (const t of out) {
  if (!keysByArtist.has(t.artist)) keysByArtist.set(t.artist, new Set());
  keysByArtist.get(t.artist).add(t.songKey);
}
const variants = out.filter(
  (t) =>
    // Bracketed tags were already handled by the grouping; only the bare words count here.
    VERSION_WORD.test(t.rawTitle.replace(/[\(\[][^\)\]]*[\)\]]/g, " ")) &&
    [...keysByArtist.get(t.artist)].some((k) => k !== t.songKey && k.length >= 3 && t.songKey.startsWith(`${k} `))
);
const variantIds = new Set(variants.map((t) => t.id));
const final = out.filter((t) => !variantIds.has(t.id));

writeFileSync(`${CACHE}/deduped.json`, JSON.stringify(final));
writeFileSync(`${CACHE}/variants.log`, variants.map((t) => `${t.artist} | ${t.rawTitle}`).join("\n"));
console.log(
  `in ${tracks.length} (expansion ${expanded.length}) | dropped ${dropped} | merged ${tracks.length - dropped - out.length} | variants ${variants.length} | out ${final.length}`
);
