import { NextRequest, NextResponse } from "next/server";
import { pickRound } from "@/lib/catalog";
import { parseSource } from "@/lib/source";
import { openTrackToken, sealTrackId } from "@/lib/token";
import { RoundTicket } from "@/lib/types";

/** Endless modes: one random song for the source, avoiding the player's recent history. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const source = parseSource(body?.source);
  if (!source) return NextResponse.json({ error: "Fuente inválida" }, { status: 400 });

  const exclude: number[] = Array.isArray(body.exclude) ? body.exclude.filter(Number.isInteger).slice(-5000) : [];
  // Rounds whose audio failed to load come back as tokens so they aren't picked again.
  if (Array.isArray(body.failed)) {
    for (const token of body.failed.slice(0, 20)) {
      const id = openTrackToken(token);
      if (id !== null) exclude.push(id);
    }
  }
  const avoidArtists: string[] = Array.isArray(body.avoidArtists)
    ? body.avoidArtists.filter((a: unknown) => typeof a === "string").slice(-5)
    : [];

  const picked = pickRound(source, exclude, avoidArtists);
  if (!picked) {
    return NextResponse.json({ error: "No hay canciones con esos filtros" }, { status: 404 });
  }
  const ticket: RoundTicket = { token: sealTrackId(picked.track.id), recycled: picked.recycled };
  return NextResponse.json(ticket);
}
