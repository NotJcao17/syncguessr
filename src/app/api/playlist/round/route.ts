import { NextRequest, NextResponse } from "next/server";
import { findOnDeezer, SealedPlaylist } from "@/lib/playlists";
import { openData, sealTrackId } from "@/lib/token";
import { RoundTicket } from "@/lib/types";

/** Songs tried per request before giving up; each Spotify song costs one or two Deezer searches. */
const ATTEMPTS = 4;

/**
 * One random song of the playlist the player hasn't heard in this session. Songs with no match on
 * Deezer come back in `skipped` so the browser stops asking for them.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const playlist = openData<SealedPlaylist>(body?.playlist);
  if (!playlist?.entries?.length) return NextResponse.json({ error: "Playlist inválida" }, { status: 400 });

  const total = playlist.entries.length;
  const played = new Set<number>(
    Array.isArray(body.played) ? body.played.filter((n: unknown) => Number.isInteger(n) && (n as number) < total) : []
  );
  let candidates = playlist.entries.map((_, i) => i).filter((i) => !played.has(i));
  const recycled = candidates.length === 0;
  if (recycled) candidates = playlist.entries.map((_, i) => i);

  const skipped: number[] = [];
  for (let n = 0; n < ATTEMPTS && candidates.length; n++) {
    const pick = Math.floor(Math.random() * candidates.length);
    const slot = candidates[pick];
    candidates.splice(pick, 1);
    const entry = playlist.entries[slot];
    const id = entry.d ?? (await findOnDeezer(entry));
    if (id) {
      const ticket: RoundTicket & { skipped: number[] } = { token: sealTrackId(id), slot, recycled, skipped };
      return NextResponse.json(ticket);
    }
    skipped.push(slot);
  }
  return NextResponse.json(
    { error: "No encontramos canciones de esta playlist en Deezer. Inténtalo de nuevo.", skipped },
    { status: 404 }
  );
}
