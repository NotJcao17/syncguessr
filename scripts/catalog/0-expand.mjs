// Step 0: grow the catalog from each artist's most played songs on Deezer.
// Covers every artist in artists.mjs plus those already in the original catalog. Resumable and cached.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { ARTISTS, ALIASES, BLOCKED, BILINGUAL, titleLanguage } from "./artists.mjs";
import { artistKey, isBadVersion, isLiveAlbum } from "./normalize.mjs";

const CACHE = "scripts/catalog/.cache";
mkdirSync(CACHE, { recursive: true });
const load = (name, fallback) => (existsSync(`${CACHE}/${name}`) ? JSON.parse(readFileSync(`${CACHE}/${name}`, "utf8")) : fallback);
const save = (name, data) => writeFileSync(`${CACHE}/${name}`, JSON.stringify(data));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (i + 1));
        continue;
      }
      const json = await res.json();
      if (json?.error?.code === 4) {
        await sleep(5000);
        continue;
      }
      return json;
    } catch {
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

// Songs per artist: the most played, never fewer than MIN_PER_ARTIST, never more than MAX_PER_ARTIST.
const MIN_PER_ARTIST = 12;
const MAX_PER_ARTIST = 45;
const MIN_RANK = 250000;

const original = load("tracks.original.json", null) ?? JSON.parse(readFileSync("src/data/tracks.json", "utf8"));
const roster = new Map();
for (const t of original) {
  const name = ALIASES[t.artist] ?? t.artist;
  if (BLOCKED.has(t.artist) || roster.has(name)) continue;
  roster.set(name, { language: t.language, genre: t.genre === "hiphop" ? "urban" : t.genre });
}
for (const [name, info] of ARTISTS) roster.set(name, info);
console.log(`artists to expand: ${roster.size}`);

// --- artist ids ---------------------------------------------------------------
const ids = load("artist-ids.json", {});
let n = 0;
for (const name of roster.keys()) {
  if (name in ids) continue;
  const res = await getJson(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=10`);
  const matches = (res?.data ?? []).filter((a) => artistKey(a.name) === artistKey(name));
  matches.sort((a, b) => b.nb_fan - a.nb_fan);
  ids[name] = res ? (matches[0] ? { id: matches[0].id, fans: matches[0].nb_fan } : null) : undefined;
  if (!matches[0] && res) console.log(`  ! no Deezer artist: ${name}`);
  if (++n % 50 === 0) {
    save("artist-ids.json", ids);
    console.log(`  ids ${n}`);
  }
  await sleep(120);
}
save("artist-ids.json", ids);

// --- top tracks ---------------------------------------------------------------
const tops = load("artist-tops.json", {});
n = 0;
for (const info of Object.values(ids)) {
  if (!info || info.id in tops) continue;
  const res = await getJson(`https://api.deezer.com/artist/${info.id}/top?limit=100`);
  if (res?.data) {
    tops[info.id] = res.data.map((d) => ({
      id: d.id,
      title: d.title,
      rank: d.rank,
      readable: d.readable,
      preview: Boolean(d.preview),
      artistId: d.artist?.id,
      album: d.album?.title ?? "",
      albumId: d.album?.id,
      cover: d.album?.cover_medium,
      coverXl: d.album?.cover_xl,
    }));
  }
  if (++n % 50 === 0) {
    save("artist-tops.json", tops);
    console.log(`  tops ${n}`);
  }
  await sleep(120);
}
save("artist-tops.json", tops);

// --- selection ------------------------------------------------------------------
const out = [];
for (const [name, meta] of roster) {
  const info = ids[name];
  if (!info) continue;
  const songs = (tops[info.id] ?? [])
    .filter((d) => d.readable && d.preview && d.artistId === info.id && !isBadVersion(d.title) && !isLiveAlbum(d.album))
    .sort((a, b) => b.rank - a.rank);
  const keep = songs.filter((d, i) => i < MIN_PER_ARTIST || d.rank >= MIN_RANK).slice(0, MAX_PER_ARTIST);
  for (const d of keep) {
    const language = BILINGUAL.has(name) ? titleLanguage(d.title) ?? meta.language : meta.language;
    out.push({
      id: d.id,
      title: d.title,
      artist: name,
      album: d.album,
      albumId: d.albumId,
      cover: d.cover,
      coverXl: d.coverXl,
      rank: d.rank,
      language,
      genre: meta.genre,
      fromTop: true,
    });
  }
}
save("expanded.json", out);
console.log(`expanded tracks: ${out.length}`);
