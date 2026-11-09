import { NextRequest, NextResponse } from "next/server";
import { searchDeezer } from "@/lib/deezerSearch";

/** Song search over all of Deezer, for playlist mode (other modes search the curated catalog). */
export async function GET(request: NextRequest) {
  const results = await searchDeezer(request.nextUrl.searchParams.get("q") ?? "");
  if (results === null) return NextResponse.json({ error: "Deezer no respondió" }, { status: 502 });
  return NextResponse.json({ results });
}
