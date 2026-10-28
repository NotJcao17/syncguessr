import { NextRequest, NextResponse } from "next/server";
import { getRandomTrack } from "@/lib/catalog";
import { Language, Genre, Era, Difficulty, RoundResponse } from "@/lib/types";


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = (searchParams.get("language") || "all") as Language;
    const genre = (searchParams.get("genre") || "all") as Genre;
    const era = (searchParams.get("era") || "all") as Era;
    const difficulty = (searchParams.get("difficulty") || "all") as Difficulty;

    const excludeArtist = searchParams.get("excludeArtist") || "";
    const excludeParam = searchParams.get("exclude") || "";
    const excludeIds = excludeParam
      ? excludeParam
          .split(",")
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id))
      : [];

    const track = getRandomTrack({ language, genre, era, difficulty, excludeIds, excludeArtist });

    if (!track) {
      return NextResponse.json({ error: "No track found for criteria" }, { status: 404 });
    }

    // Always use internal streaming proxy to guarantee fresh, unexpired audio and avoid CORS
    const previewUrl = `/api/stream?id=${track.id}`;

    const responseData: RoundResponse = {
      trackId: track.id,
      previewUrl,
      duration: 30,
      language: track.language,
      genre: track.genre,
      era: track.era,
      difficulty: track.difficulty,
    };

    return NextResponse.json(responseData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error selecting round";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
