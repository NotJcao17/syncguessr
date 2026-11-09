import { NextRequest, NextResponse } from "next/server";
import { fold, getTrack, titleKey } from "@/lib/catalog";
import { getDeezerTrack, revealDeezerTrack } from "@/lib/deezer";
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

/**
 * The answer of a round: from the catalog, or straight from Deezer for playlist songs that aren't
 * in it (the token was sealed by the server, so its id is always one we chose).
 */
async function answerFor(trackId: number): Promise<RevealedTrack | null> {
  const track = getTrack(trackId);
  if (track) return reveal(track);
  const deezer = await getDeezerTrack(trackId);
  return deezer ? revealDeezerTrack(deezer) : null;
}

/** Checks a guess. The answer is only revealed when the guess is right or the player gives up. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const trackId = openTrackToken(body?.token);
  if (trackId === null) return NextResponse.json({ error: "Ronda inválida" }, { status: 400 });
  const answer = await answerFor(trackId);
  if (!answer) return NextResponse.json({ error: "Ronda inválida" }, { status: trackId ? 502 : 400 });

  if (body.reveal === true) {
    const res: VerifyResponse = { correct: false, track: answer };
    return NextResponse.json(res);
  }

  // Catalog songs are looked up by id. Playlist mode searches all of Deezer, so its guesses carry
  // their own title and artist (sending a made-up title is just another guess).
  const guessId = Number(body.guessId);
  const catalogGuess = getTrack(guessId);
  const guess = catalogGuess
    ? { id: catalogGuess.id, title: catalogGuess.title, artist: catalogGuess.artist }
    : typeof body.guessTitle === "string" && typeof body.guessArtist === "string"
      ? { id: guessId, title: body.guessTitle.slice(0, 300), artist: body.guessArtist.slice(0, 300) }
      : null;
  if (!guess) return NextResponse.json({ error: "Canción desconocida" }, { status: 400 });

  // The right title counts even by another artist: covers share a title, and recognizing the song
  // from a clip is the point. Distinct songs that merely share a title are rare enough to accept.
  const sameSong = guess.id === answer.id || titleKey(guess.title) === titleKey(answer.title);
  const res: VerifyResponse = sameSong
    ? { correct: true, track: answer }
    : { correct: false, artistMatch: guess.artist === answer.artist || fold(guess.artist) === fold(answer.artist) };
  return NextResponse.json(res);
}
