import { NextRequest, NextResponse } from "next/server";
import { pickGame } from "@/lib/catalog";
import { parseSource } from "@/lib/source";
import { sealTrackId } from "@/lib/token";
import { RoundTicket } from "@/lib/types";

/** Songs held back to replace any whose audio can't be loaded. */
const SPARES = 4;

/**
 * Fixed-length games: a seed always maps to the same songs, which is what makes daily games and
 * challenges shareable. Ordinary games also send the player's history so songs don't repeat.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const source = parseSource(body?.source);
  const count = Number(body?.count);
  const seed = typeof body?.seed === "string" ? body.seed.slice(0, 64) : "";
  if (!source || !seed || !Number.isInteger(count) || count < 1 || count > 50) {
    return NextResponse.json({ error: "Partida inválida" }, { status: 400 });
  }
  const exclude: number[] = Array.isArray(body.exclude) ? body.exclude.filter(Number.isInteger).slice(-5000) : [];

  const tracks = pickGame(source, count + SPARES, seed, exclude);
  if (tracks.length < count) {
    return NextResponse.json(
      { error: `Solo hay ${tracks.length} canciones con esa selección`, available: tracks.length },
      { status: 409 }
    );
  }
  const seal = (ids: typeof tracks): RoundTicket[] => ids.map((t) => ({ token: sealTrackId(t.id) }));
  return NextResponse.json({ rounds: seal(tracks.slice(0, count)), spares: seal(tracks.slice(count)) });
}
