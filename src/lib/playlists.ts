import "server-only";
import { fold, titleKey } from "./catalog";
import { deezerGet, DeezerTrack } from "./deezer";
import { PlaylistSource } from "./types";

/**
 * Playlist mode: reads a public playlist from Spotify, Syncora Player or Deezer and plays its songs
 * with Deezer audio. Nothing is stored: the song list travels sealed (see token.ts) between the
 * browser and the server.
 *
 * Spotify has no usable API for this (Development Mode apps are capped at 5 users and its policy
 * bars games), so the list comes from the public embed page, the same one any website can show.
 * That page can change without notice; when it does, only Spotify links stop working.
 */

/** One song of a playlist. `d` is the Deezer id when the source already knows it. */
export interface PlaylistEntry {
  t: string;
  a: string;
  d?: number;
  /** Length in seconds, to tell versions apart when matching on Deezer. */
  s?: number;
}

export interface ImportedPlaylist {
  source: PlaylistSource;
  id: string;
  name: string;
  cover: string;
  entries: PlaylistEntry[];
}

/** What the browser carries between rounds, sealed. */
export interface SealedPlaylist {
  id: string;
  entries: PlaylistEntry[];
}

/** Songs kept from one playlist; bigger ones are sampled so the sealed list stays small. */
export const MAX_ENTRIES = 400;

export class PlaylistError extends Error {}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// Syncora Player's public Supabase project. The anon key ships inside the app and only reads what
// row-level security allows, which for a visitor is the playlists their owners chose to share.
const SYNCORA_SUPABASE = {
  url: "https://njkfudsyfzdkdvwizdag.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qa2Z1ZHN5Znpka2R2d2l6ZGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NDkzNDMsImV4cCI6MjEwMTAyNTM0M30.Vzgmlu0y12EPZ2LtqxsWoJUhwQDbbysB-zxcew5xEaI",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Which service a pasted link belongs to, and the playlist id in it. */
export async function parsePlaylistLink(raw: string): Promise<{ source: PlaylistSource; id: string } | null> {
  const text = raw.trim();
  const uri = text.match(/^spotify:playlist:([A-Za-z0-9]{10,40})$/);
  if (uri) return { source: "spotify", id: uri[1] };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  const after = (word: string) => {
    const i = parts.indexOf(word);
    return i >= 0 ? parts[i + 1] ?? null : null;
  };

  if (host === "open.spotify.com") {
    const id = after("playlist");
    return id && /^[A-Za-z0-9]{10,40}$/.test(id) ? { source: "spotify", id } : null;
  }
  if (host === "syncoraplayer.app") {
    const id = after("playlist") ?? url.searchParams.get("id");
    return id && UUID_RE.test(id) ? { source: "syncora", id: id.toLowerCase() } : null;
  }
  if (host === "deezer.com") {
    const id = after("playlist");
    return id && /^\d{1,20}$/.test(id) ? { source: "deezer", id } : null;
  }
  // Short share links (link.deezer.com, deezer.page.link, spotify.link) redirect to the real one.
  if (["link.deezer.com", "deezer.page.link", "spotify.link"].includes(host)) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(6000) });
      const final = res.url;
      void res.body?.cancel();
      if (final && final !== url.toString()) return parsePlaylistLinkNoRedirect(final);
    } catch {
      return null;
    }
  }
  return null;
}

async function parsePlaylistLinkNoRedirect(link: string) {
  const host = (() => {
    try {
      return new URL(link).hostname;
    } catch {
      return "";
    }
  })();
  // One hop only: a redirect to another short link is not followed again.
  if (["link.deezer.com", "deezer.page.link", "spotify.link"].includes(host)) return null;
  return parsePlaylistLink(link);
}

// --- Sources -----------------------------------------------------------------------------------

async function fromSpotify(id: string): Promise<ImportedPlaylist> {
  let html: string;
  try {
    const res = await fetch(`https://open.spotify.com/embed/playlist/${id}`, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "es-MX,es;q=0.9,en;q=0.8" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) throw new PlaylistError("Esa playlist no existe o no es pública.");
    if (!res.ok) throw new PlaylistError("Spotify no respondió. Inténtalo en un momento.");
    html = await res.text();
  } catch (err) {
    if (err instanceof PlaylistError) throw err;
    throw new PlaylistError("Spotify no respondió. Inténtalo en un momento.");
  }

  const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  type Entity = {
    name?: string;
    title?: string;
    trackList?: { title?: string; subtitle?: string; duration?: number }[];
    coverArt?: { sources?: { url: string; width?: number }[] } | null;
    visualIdentity?: { image?: { url: string; maxWidth?: number }[] };
  };
  let entity: Entity | undefined;
  try {
    entity = json ? JSON.parse(json)?.props?.pageProps?.state?.data?.entity : undefined;
  } catch {
    entity = undefined;
  }
  if (!entity?.trackList) {
    throw new PlaylistError("No pudimos leer esa playlist de Spotify. Revisa que sea pública.");
  }

  const images = entity.visualIdentity?.image ?? [];
  const cover =
    images.find((i) => (i.maxWidth ?? 0) >= 300)?.url ?? images[0]?.url ?? entity.coverArt?.sources?.[0]?.url ?? "";
  const entries = entity.trackList
    .filter((t) => t.title && t.subtitle)
    .map((t) => ({ t: t.title!, a: t.subtitle!, s: t.duration ? Math.round(t.duration / 1000) : undefined }));
  return { source: "spotify", id, name: entity.name ?? entity.title ?? "Playlist de Spotify", cover, entries };
}

async function fromSyncora(id: string): Promise<ImportedPlaylist> {
  const rest = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${SYNCORA_SUPABASE.url}/rest/v1/${path}`, {
      headers: { apikey: SYNCORA_SUPABASE.anonKey, Authorization: `Bearer ${SYNCORA_SUPABASE.anonKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);
    if (!res?.ok) throw new PlaylistError("Syncora no respondió. Inténtalo en un momento.");
    return (await res.json()) as T;
  };
  const [playlist] = await rest<{ title: string; cover_url: string | null }[]>(
    `playlists?id=eq.${id}&is_public=eq.true&select=title,cover_url`
  );
  if (!playlist) throw new PlaylistError("Esa playlist no existe o ya no se comparte.");
  const rows = await rest<{ track_id: number; title: string; artist_name: string; cover_url: string | null; duration_ms: number | null }[]>(
    `playlist_tracks?playlist_id=eq.${id}&select=track_id,title,artist_name,cover_url,duration_ms&order=order_index.asc,added_at.asc&limit=2000`
  );
  const cover = playlist.cover_url?.startsWith("http") ? playlist.cover_url : rows.find((r) => r.cover_url)?.cover_url ?? "";
  const entries = rows
    .filter((r) => Number.isInteger(r.track_id) && r.track_id > 0)
    .map((r) => ({ t: r.title, a: r.artist_name, d: r.track_id, s: r.duration_ms ? Math.round(r.duration_ms / 1000) : undefined }));
  return { source: "syncora", id, name: playlist.title, cover, entries };
}

async function fromDeezer(id: string): Promise<ImportedPlaylist> {
  const meta = await deezerGet<{ title: string; picture_medium?: string; public?: boolean }>(`/playlist/${id}`);
  if (!meta) throw new PlaylistError("Esa playlist de Deezer no existe o no es pública.");
  const tracks = await deezerGet<{ data: DeezerTrack[] }>(`/playlist/${id}/tracks?limit=1000`);
  const entries = (tracks?.data ?? [])
    .filter((t) => t?.id && t.readable !== false)
    .map((t) => ({ t: t.title, a: t.artist.name, d: t.id, s: t.duration }));
  return { source: "deezer", id, name: meta.title, cover: meta.picture_medium ?? "", entries };
}

export async function importPlaylist(link: string): Promise<ImportedPlaylist> {
  const parsed = await parsePlaylistLink(link);
  if (!parsed) {
    throw new PlaylistError("Ese enlace no es de una playlist de Spotify, Syncora Player o Deezer.");
  }
  const playlist =
    parsed.source === "spotify"
      ? await fromSpotify(parsed.id)
      : parsed.source === "syncora"
        ? await fromSyncora(parsed.id)
        : await fromDeezer(parsed.id);

  // Same song twice in a playlist would just be a repeat.
  const seen = new Set<string>();
  let entries = playlist.entries.filter((e) => {
    const k = `${fold(e.a)}|${titleKey(e.t)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (entries.length > MAX_ENTRIES) {
    entries = entries
      .map((e) => ({ e, r: Math.random() }))
      .sort((x, y) => x.r - y.r)
      .slice(0, MAX_ENTRIES)
      .map((x) => x.e);
  }
  return { ...playlist, entries };
}

// --- Matching a song to Deezer --------------------------------------------------------------------

/** Versions that sound different from the studio recording. */
const OTHER_VERSION = /\b(live|en vivo|ao vivo|acoustic|acustic|ac[uú]stico|remix|karaoke|instrumental|sped up|slowed|8d)\b/i;

const artistsOf = (a: string) =>
  a
    .split(/,|&| y | x | feat\.? | ft\.? /i)
    .map((s) => fold(s).replace(/[^a-z0-9ñ ]/g, "").trim())
    .filter(Boolean);

/**
 * The Deezer id of a song known only by title and artist (Spotify entries). Picks the most played
 * Deezer track with the same title by one of the same artists and a preview to play. Deezer's
 * advanced search (artist:"x" track:"y") currently returns nothing, so this filters a plain search.
 */
export async function findOnDeezer(entry: PlaylistEntry): Promise<number | null> {
  const wanted = titleKey(entry.t);
  if (!wanted) return null;
  const artists = artistsOf(entry.a);
  const mainArtist = entry.a.split(",")[0].trim();
  const cleanTitle = entry.t.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, "").replace(/\s+-\s+.*$/, "").trim() || entry.t;
  const wantsOtherVersion = OTHER_VERSION.test(entry.t);

  for (const q of [`${mainArtist} ${cleanTitle}`, cleanTitle]) {
    const found = await deezerGet<{ data: DeezerTrack[] }>(`/search?q=${encodeURIComponent(q)}&limit=25`);
    const candidates = (found?.data ?? []).filter((d) => {
      if (!d?.preview || d.readable === false || !d.artist) return false;
      if (titleKey(d.title) !== wanted) return false;
      const name = fold(d.artist.name).replace(/[^a-z0-9ñ ]/g, "").trim();
      if (!artists.some((a) => a === name || a.includes(name) || name.includes(a))) return false;
      // Not the album title: singles often ship the original inside "Song (Slowed Down)", and the
      // length check below already tells the versions apart.
      const version = `${d.title} ${d.title_version ?? ""}`;
      return wantsOtherVersion || !OTHER_VERSION.test(version);
    });
    if (!candidates.length) continue;
    const near = entry.s ? candidates.filter((d) => !d.duration || Math.abs(d.duration - entry.s!) <= 6) : [];
    const pool = near.length ? near : candidates;
    pool.sort((x, y) => (y.rank ?? 0) - (x.rank ?? 0));
    return pool[0].id;
  }
  return null;
}
