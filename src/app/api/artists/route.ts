import { NextRequest, NextResponse } from "next/server";
import { searchArtists } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  return NextResponse.json({ results: searchArtists(request.nextUrl.searchParams.get("q") ?? "") });
}
