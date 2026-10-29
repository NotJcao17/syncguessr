import { NextRequest, NextResponse } from "next/server";
import { pickGame } from "@/lib/catalog";
import { parseSource } from "@/lib/source";
import { sealTrackId } from "@/lib/token";
import { RoundTicket } from "@/lib/types";

/** Fixed-length games: a seed always maps to the same songs, which is what makes challenges shareable. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const source = parseSource(body?.source);
  const count = Number(body?.count);
  const seed = typeof body?.seed === "string" ? body.seed.slice(0, 64) : "";
  if (!source || !seed || !Number.isInteger(count) || count < 1 || count > 50) {
    return NextResponse.json({ error: "Partida inválida" }, { status: 400 });
  }

  const tracks = pickGame(source, count, seed);
  if (tracks.length < count) {
    return NextResponse.json(
      { error: `Solo hay ${tracks.length} canciones con esa selección`, available: tracks.length },
      { status: 409 }
    );
  }
  const rounds: RoundTicket[] = tracks.map((t) => ({ token: sealTrackId(t.id) }));
  return NextResponse.json({ rounds });
}
