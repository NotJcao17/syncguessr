import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/catalog";
import { LanguageFilter } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lang = params.get("language");
  const language: LanguageFilter = lang === "es" || lang === "en" ? lang : "all";
  const artists = params.getAll("artist").slice(0, 20);
  return NextResponse.json({ results: searchTracks(params.get("q") ?? "", { language, artists }) });
}
