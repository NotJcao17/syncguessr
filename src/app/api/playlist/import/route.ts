import { NextRequest, NextResponse } from "next/server";
import { importPlaylist, PlaylistError, SealedPlaylist } from "@/lib/playlists";
import { sealData } from "@/lib/token";
import { PlaylistInfo } from "@/lib/types";

/** Fewer songs than this and a game would repeat them right away. */
const MIN_SONGS = 5;

/** Reads a public playlist and returns it sealed, with only its name, cover and size in the clear. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim().slice(0, 500) : "";
  if (!url) return NextResponse.json({ error: "Pega el enlace de una playlist" }, { status: 400 });

  try {
    const playlist = await importPlaylist(url);
    if (playlist.entries.length < MIN_SONGS) {
      return NextResponse.json(
        { error: `Esa playlist tiene ${playlist.entries.length} canciones; se necesitan al menos ${MIN_SONGS}.` },
        { status: 422 }
      );
    }
    const sealed: SealedPlaylist = { id: `${playlist.source}:${playlist.id}`, entries: playlist.entries };
    const info: PlaylistInfo = {
      data: sealData(sealed),
      source: playlist.source,
      id: playlist.id,
      name: playlist.name,
      cover: playlist.cover,
      count: playlist.entries.length,
      url,
    };
    return NextResponse.json(info);
  } catch (err) {
    if (err instanceof PlaylistError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.warn("[playlist] import failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "No se pudo cargar la playlist. Inténtalo de nuevo." }, { status: 502 });
  }
}
