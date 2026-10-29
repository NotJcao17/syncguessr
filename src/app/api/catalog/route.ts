import { NextResponse } from "next/server";
import { catalogFacets, catalogSize } from "@/lib/catalog";

/** Facet counts so every filter control can show how many songs it leaves. */
export async function GET() {
  return NextResponse.json(
    { total: catalogSize, facets: catalogFacets() },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
