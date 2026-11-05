// Step 2b: all-time listeners per song from Last.fm, so "best known" doesn't mean "streamed this week".
// Deezer rank only measures current streaming, which puts a new album above an artist's classics.
// Needs a Last.fm API key: LASTFM_API_KEY=... node scripts/catalog/2b-lastfm.mjs  (cached, resumable).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { songKey } from "./normalize.mjs";

const CACHE = "scripts/catalog/.cache";
const KEY = process.env.LASTFM_API_KEY;
if (!KEY) {
  console.error("Set LASTFM_API_KEY (https://www.last.fm/api/account/create)");
  process.exit(1);
}
const load = (name, fallback) => (existsSync(`${CACHE}/${name}`) ? JSON.parse(readFileSync(`${CACHE}/${name}`, "utf8")) : fallback);
const save = (name, data) => writeFileSync(`${CACHE}/${name}`, JSON.stringify(data));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function topTracks(artist) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&autocorrect=1&limit=500&format=json&api_key=${KEY}&artist=${encodeURIComponent(artist)}`;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "syncguessr-catalog/1.0" } });
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (i + 1));
        continue;
      }
      const json = await res.json();
      if (json.error === 29) {
        await sleep(5000);
        continue;
      }
      // 6: Last.fm doesn't know the artist. Anything else (bad key) must not be cached as "no songs".
      if (json.error) return json.error === 6 ? {} : null;
      // Several Last.fm entries can be the same song (versions): keep the most listened one.
      const out = {};
      for (const t of json.toptracks?.track ?? []) {
        const key = songKey(t.name);
        const listeners = Number(t.listeners) || 0;
        if (key && listeners > (out[key] ?? 0)) out[key] = listeners;
      }
      return out;
    } catch {
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

const tracks = load("enriched.json", null) ?? load("deduped.json", []);
const artists = [...new Set(tracks.map((t) => t.artist))];
const lastfm = load("lastfm.json", {});
const pending = artists.filter((a) => !(a in lastfm));
console.log(`last.fm artists pending: ${pending.length} of ${artists.length}`);

// Last.fm asks for at most ~5 requests per second.
let done = 0;
for (let i = 0; i < pending.length; i += 4) {
  await Promise.all(
    pending.slice(i, i + 4).map(async (artist) => {
      const res = await topTracks(artist);
      if (res) lastfm[artist] = res;
    })
  );
  done += 4;
  if (done % 100 === 0) {
    save("lastfm.json", lastfm);
    console.log(`  last.fm ${done}/${pending.length}`);
  }
  await sleep(1000);
}
save("lastfm.json", lastfm);

const matched = tracks.filter((t) => lastfm[t.artist]?.[t.songKey] > 0).length;
console.log(`songs with Last.fm listeners: ${matched} of ${tracks.length}`);
