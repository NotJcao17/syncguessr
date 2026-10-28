import { NextRequest, NextResponse } from "next/server";
import { getTrackById } from "@/lib/catalog";
import { VerifyResponse } from "@/lib/types";


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId, guessId, surrender = false } = body;

    if (!trackId) {
      return NextResponse.json({ error: "Missing trackId" }, { status: 400 });
    }

    const track = getTrackById(Number(trackId));
    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const isCorrect = Number(guessId) === Number(track.id);

    // If correct or surrendered, return full details
    if (isCorrect || surrender) {
      const responseData: VerifyResponse = {
        correct: isCorrect,
        track: {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          cover: track.cover,
          coverXl: track.coverXl || track.cover,
          preview: track.preview,
          deezerUrl: `https://www.deezer.com/track/${track.id}`,
        },
      };
      return NextResponse.json(responseData);
    }

    return NextResponse.json({ correct: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error verifying guess";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
