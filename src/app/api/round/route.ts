import { NextRequest, NextResponse } from "next/server";
import { getRandomTrack } from "@/lib/catalog";
import { Language, Genre, Era, Difficulty, RoundResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = (searchParams.get("language") || "all") as Language;

    // Multi-select or single fallback
    const genresParam = searchParams.get("genres") || searchParams.get("genre") || "";
    const genres =
      genresParam && genresParam !== "all"
        ? (genresParam.split(",").map((s) => s.trim()).filter(Boolean) as Genre[])
        : [];

    const erasParam = searchParams.get("eras") || searchParams.get("era") || "";
    const eras =
      erasParam && erasParam !== "all"
        ? (erasParam.split(",").map((s) => s.trim()).filter(Boolean) as Era[])
        : [];

    const diffsParam = searchParams.get("difficulties") || searchParams.get("difficulty") || "";
    const difficulties =
      diffsParam && diffsParam !== "all"
        ? (diffsParam.split(",").map((s) => s.trim()).filter(Boolean) as Difficulty[])
        : [];

    const excludeArtist = searchParams.get("excludeArtist") || "";
    const excludeParam = searchParams.get("exclude") || "";
    const excludeIds = excludeParam
      ? excludeParam
          .split(",")
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id))
      : [];

    const track = getRandomTrack({
      language,
      genres,
      eras,
      difficulties,
      excludeIds,
      excludeArtist,
    });

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
