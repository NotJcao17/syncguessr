import { NextRequest, NextResponse } from "next/server";
import { getTrack, titleKey } from "@/lib/catalog";
import { openTrackToken } from "@/lib/token";
import { RevealedTrack, Track, VerifyResponse } from "@/lib/types";

const reveal = (t: Track): RevealedTrack => ({
  id: t.id,
  title: t.title,
  artist: t.artist,
  album: t.album,
  cover: t.cover,
  coverXl: t.coverXl || t.cover,
  year: t.year,
});

/** Checks a guess. The answer is only revealed when the guess is right or the player gives up. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const trackId = openTrackToken(body?.token);
  const track = trackId !== null ? getTrack(trackId) : undefined;
  if (!track) return NextResponse.json({ error: "Ronda inválida" }, { status: 400 });

  if (body.reveal === true) {
    const res: VerifyResponse = { correct: false, track: reveal(track) };
    return NextResponse.json(res);
  }

  const guess = getTrack(Number(body.guessId));
  if (!guess) return NextResponse.json({ error: "Canción desconocida" }, { status: 400 });

  // The right title counts even by another artist: covers share a title, and recognizing the song
  // from a clip is the point. Distinct songs that merely share a title are rare enough to accept.
  const sameSong = guess.id === track.id || titleKey(guess.title) === titleKey(track.title);
  const res: VerifyResponse = sameSong
    ? { correct: true, track: reveal(track) }
    : { correct: false, artistMatch: guess.artist === track.artist };
  return NextResponse.json(res);
}
