// Step 1: collapse every song to a single canonical recording and drop versions that don't sound like it.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { displayTitle, songKey, artistKey, isBadVersion, isRemix, isLiveAlbum } from "./normalize.mjs";

// The pre-cleanup catalog is kept in the cache; without it the current catalog is re-processed.
const ORIGINAL = "scripts/catalog/.cache/tracks.original.json";
const src = process.argv[2] ?? (existsSync(ORIGINAL) ? ORIGINAL : "src/data/tracks.json");
const tracks = JSON.parse(readFileSync(src, "utf8"));
mkdirSync("scripts/catalog/.cache", { recursive: true });

const groups = new Map();
let dropped = 0;
for (const t of tracks) {
  const original = t.rawTitle || t.title;
  if (isBadVersion(original) || isLiveAlbum(t.album)) {
    dropped++;
    continue;
  }
  const key = `${songKey(original)}::${artistKey(t.artist)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ ...t, rawTitle: original });
}

// Prefer the plain recording: no remix/alt arrangement, and no leftover subtitle besides feat.
const hasExtraTag = (t) => /[\(\[](?!\s*(feat|ft|with|con)\b)/i.test(displayTitle(t.rawTitle));
const score = (t) => (isRemix(t.rawTitle) ? 0 : 2) + (hasExtraTag(t) ? 0 : 1);
const out = [];
for (const [key, list] of groups) {
  list.sort((a, b) => score(b) - score(a) || b.rank - a.rank);
  const best = list[0];
  out.push({ ...best, title: displayTitle(best.rawTitle), songKey: key.split("::")[0] });
}

writeFileSync("scripts/catalog/.cache/deduped.json", JSON.stringify(out));
console.log(`in ${tracks.length} | bad versions dropped ${dropped} | duplicates merged ${tracks.length - dropped - out.length} | out ${out.length}`);
