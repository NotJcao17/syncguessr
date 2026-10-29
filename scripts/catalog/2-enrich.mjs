// Step 2: add missing iconic songs, refresh Deezer metadata and look up the original release year on MusicBrainz.
// Network-bound and resumable: every answer is cached under scripts/catalog/.cache/.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ICONIC } from "./iconic.mjs";
import { displayTitle, songKey, artistKey, isBadVersion, isRemix } from "./normalize.mjs";

const CACHE = "scripts/catalog/.cache";
const UA = "syncguessr-catalog/1.0 ( sixsementeam@gmail.com )";
const load = (name, fallback) => (existsSync(`${CACHE}/${name}`) ? JSON.parse(readFileSync(`${CACHE}/${name}`, "utf8")) : fallback);
const save = (name, data) => writeFileSync(`${CACHE}/${name}`, JSON.stringify(data));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, headers = {}, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
      if (res.status === 503 || res.status === 429) {
        await sleep(2000 * (i + 1));
        continue;
      }
      if (!res.ok) return null;
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

/**
 * Runs `job` for every item, starting at most one every `gapMs` and keeping up to `inFlight` running.
 * MusicBrainz allows one request per second but answers slowly, so waiting for each reply wastes the budget.
 */
async function throttled(items, job, { gapMs = 1100, inFlight = 4, onProgress } = {}) {
  let next = 0;
  let done = 0;
  const running = new Set();
  while (next < items.length || running.size) {
    if (next < items.length && running.size < inFlight) {
      const p = job(items[next++]).finally(() => {
        running.delete(p);
        onProgress?.(++done);
      });
      running.add(p);
      await sleep(gapMs);
    } else {
      await Promise.race(running);
    }
  }
}

const tracks = JSON.parse(readFileSync(`${CACHE}/deduped.json`, "utf8"));
const keyOf = (t) => `${t.songKey}::${artistKey(t.artist)}`;
const present = new Map(tracks.map((t) => [keyOf(t), t]));

// --- 2a. Iconic songs ------------------------------------------------------
const added = [];
for (const [title, artist, language, genre] of ICONIC) {
  const key = `${songKey(title)}::${artistKey(artist)}`;
  if (present.has(key)) {
    present.get(key).iconic = true;
    continue;
  }
  // The advanced artist:"…" track:"…" syntax currently returns nothing; plain text works.
  const q = encodeURIComponent(`${title} ${artist}`);
  const res = await getJson(`https://api.deezer.com/search?q=${q}&limit=25`);
  await sleep(150);
  const candidates = (res?.data ?? []).filter(
    (d) =>
      d.readable &&
      d.preview &&
      songKey(d.title) === songKey(title) &&
      artistKey(d.artist.name) === artistKey(artist) &&
      !isBadVersion(d.title)
  );
  candidates.sort((a, b) => Number(isRemix(a.title)) - Number(isRemix(b.title)) || b.rank - a.rank);
  const d = candidates[0];
  if (!d) {
    console.log(`  ! iconic not found on Deezer: ${title} / ${artist}`);
    continue;
  }
  const canonicalArtist = tracks.find((t) => artistKey(t.artist) === artistKey(artist))?.artist ?? d.artist.name;
  const track = {
    id: d.id,
    title: displayTitle(d.title),
    rawTitle: d.title,
    artist: canonicalArtist,
    album: d.album.title,
    cover: d.album.cover_medium,
    coverXl: d.album.cover_xl,
    preview: d.preview,
    rank: d.rank,
    language,
    genre,
    era: "2010s",
    difficulty: "easy",
    songKey: songKey(d.title),
    iconic: true,
  };
  tracks.push(track);
  present.set(key, track);
  added.push(`${track.title} / ${track.artist}`);
}
console.log(`iconic added: ${added.length}`);

// --- 2b. Deezer metadata (rank, availability, release date) ----------------
const deezer = load("deezer.json", {});
// Songs from the expansion already carry rank and availability from the artist's top list.
const pendingDz = tracks.filter((t) => !t.fromTop && !(t.id in deezer));
console.log(`deezer lookups pending: ${pendingDz.length}`);
for (let i = 0; i < pendingDz.length; i += 8) {
  const batch = pendingDz.slice(i, i + 8);
  await Promise.all(
    batch.map(async (t) => {
      const d = await getJson(`https://api.deezer.com/track/${t.id}`);
      deezer[t.id] = d && !d.error
        ? { readable: d.readable, preview: Boolean(d.preview), rank: d.rank, release: d.release_date, duration: d.duration }
        : { missing: true };
    })
  );
  if (i % 400 === 0) {
    save("deezer.json", deezer);
    console.log(`  deezer ${i}/${pendingDz.length}`);
  }
  await sleep(900);
}
save("deezer.json", deezer);

// --- 2c. MusicBrainz first release year -------------------------------------
const mb = load("musicbrainz.json", {});
const byArtist = new Map();
for (const t of tracks) {
  const key = keyOf(t);
  if (key in mb) continue;
  if (!byArtist.has(t.artist)) byArtist.set(t.artist, []);
  byArtist.get(t.artist).push(t);
}
const queue = [];
for (const [artist, list] of byArtist) for (let i = 0; i < list.length; i += 6) queue.push([artist, list.slice(i, i + 6)]);
console.log(`musicbrainz queries pending: ${queue.length}`);

const phrase = (s) => `"${s.replace(/[\\"]/g, " ").trim()}"`;
const bare = (title) => displayTitle(title).replace(/[\(\[][^\)\]]*[\)\]]/g, "").replace(/\s[-–]\s.*$/, "").trim() || title;

const progress = (label, total, every) => (n) => {
  if (n % every === 0) {
    save("musicbrainz.json", mb);
    console.log(`  ${label} ${n}/${total}`);
  }
};
await throttled(queue, async ([artist, list]) => {
  const query = `artist:${phrase(artist)} AND (${list.map((t) => `recording:${phrase(bare(t.title))}`).join(" OR ")})`;
  const res = await getJson(`https://musicbrainz.org/ws/2/recording?fmt=json&limit=100&query=${encodeURIComponent(query)}`);
  const aKey = artistKey(artist);
  for (const t of list) {
    let year = null;
    for (const rec of res?.recordings ?? []) {
      if (songKey(rec.title) !== t.songKey) continue;
      const credits = (rec["artist-credit"] ?? []).map((c) => artistKey(c.name ?? c.artist?.name ?? ""));
      if (!credits.some((c) => c === aKey || c.includes(aKey) || (c.length > 3 && aKey.includes(c)))) continue;
      const y = parseInt((rec["first-release-date"] ?? "").slice(0, 4), 10);
      if (y > 1900 && (year === null || y < year)) year = y;
    }
    mb[keyOf(t)] = res ? year : undefined;
  }
}, { onProgress: progress("musicbrainz", queue.length, 50) });
save("musicbrainz.json", mb);

// --- 2d. Second pass, one song per query, for well-known songs the batches missed ---
// Heavily recorded songs (Thriller, Beat It) fill the 100 batch results with other recordings.
const retryKey = (t) => `retry:${keyOf(t)}`;
const misses = tracks.filter((t) => mb[keyOf(t)] === null && t.rank >= 600000 && !(retryKey(t) in mb));
console.log(`musicbrainz single retries pending: ${misses.length}`);
await throttled(misses, async (t) => {
  const query = `artist:${phrase(t.artist)} AND recording:${phrase(bare(t.title))} AND status:official`;
  const res = await getJson(`https://musicbrainz.org/ws/2/recording?fmt=json&limit=100&query=${encodeURIComponent(query)}`);
  const aKey = artistKey(t.artist);
  let year = null;
  for (const rec of res?.recordings ?? []) {
    if (songKey(rec.title) !== t.songKey) continue;
    const credits = (rec["artist-credit"] ?? []).map((c) => artistKey(c.name ?? c.artist?.name ?? ""));
    if (!credits.some((c) => c === aKey || c.includes(aKey) || (c.length > 3 && aKey.includes(c)))) continue;
    const y = parseInt((rec["first-release-date"] ?? "").slice(0, 4), 10);
    if (y > 1900 && (year === null || y < year)) year = y;
  }
  if (res) {
    mb[keyOf(t)] = year;
    mb[retryKey(t)] = true;
  }
}, { onProgress: progress("musicbrainz retry", misses.length, 50) });
save("musicbrainz.json", mb);

// --- 2e. Hits get their own query too: in a shared batch the original recording can fall outside
// the top 100 and a later reissue sets the year (Hotel California came out as 1994).
const hits = tracks.filter(
  (t) => (t.rank >= 850000 || t.iconic) && !(retryKey(t) in mb) && !(`exact:${keyOf(t)}` in mb)
);
console.log(`musicbrainz hit refinements pending: ${hits.length}`);
await throttled(hits, async (t) => {
  const query = `artist:${phrase(t.artist)} AND recording:${phrase(bare(t.title))}`;
  const res = await getJson(`https://musicbrainz.org/ws/2/recording?fmt=json&limit=100&query=${encodeURIComponent(query)}`);
  const aKey = artistKey(t.artist);
  let year = null;
  for (const rec of res?.recordings ?? []) {
    if (songKey(rec.title) !== t.songKey) continue;
    const credits = (rec["artist-credit"] ?? []).map((c) => artistKey(c.name ?? c.artist?.name ?? ""));
    if (!credits.some((c) => c === aKey || c.includes(aKey) || (c.length > 3 && aKey.includes(c)))) continue;
    const y = parseInt((rec["first-release-date"] ?? "").slice(0, 4), 10);
    if (y > 1900 && (year === null || y < year)) year = y;
  }
  if (res) {
    const prev = mb[keyOf(t)];
    mb[keyOf(t)] = year === null ? prev ?? null : prev ? Math.min(prev, year) : year;
    mb[`exact:${keyOf(t)}`] = true;
  }
}, { onProgress: progress("musicbrainz hits", hits.length, 100) });
save("musicbrainz.json", mb);

// --- 2f. Album release dates for expansion songs MusicBrainz could not date ----------
const albums = load("albums.json", {});
const undated = [...new Set(tracks.filter((t) => t.fromTop && t.albumId && !mb[keyOf(t)]).map((t) => t.albumId))].filter(
  (id) => !(id in albums)
);
console.log(`album lookups pending: ${undated.length}`);
for (let i = 0; i < undated.length; i += 8) {
  await Promise.all(
    undated.slice(i, i + 8).map(async (id) => {
      const a = await getJson(`https://api.deezer.com/album/${id}`);
      albums[id] = a && !a.error ? { release: a.release_date, type: a.record_type } : null;
    })
  );
  if (i % 400 === 0) save("albums.json", albums);
  await sleep(900);
}
save("albums.json", albums);
save("enriched.json", tracks);
console.log("done");
