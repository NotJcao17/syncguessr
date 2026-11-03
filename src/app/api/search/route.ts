import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/catalog";
import { LanguageFilter, MAX_ARTISTS } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lang = params.get("language");
  const language: LanguageFilter = lang === "es" || lang === "en" ? lang : "all";
  const artists = params.getAll("artist").slice(0, MAX_ARTISTS);
  return NextResponse.json({ results: searchTracks(params.get("q") ?? "", { language, artists }) });
}
