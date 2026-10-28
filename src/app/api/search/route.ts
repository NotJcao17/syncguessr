import { NextRequest, NextResponse } from "next/server";
import tracksData from "@/data/tracks.json";
import { Track, SearchResultItem } from "@/lib/types";

const catalog = tracksData as Track[];

function stripAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const currentTrackId = searchParams.get("currentTrackId")
      ? Number(searchParams.get("currentTrackId"))
      : null;
    const language = searchParams.get("language") || "all";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const normQuery = stripAccents(query);
    const queryWords = normQuery.split(/\s+/).filter(Boolean);

    // Filter catalog matching query
    // If playing in specific language (es or en), filter to that language first
    let pool = catalog;
    if (language === "es" || language === "en") {
      pool = catalog.filter((t) => t.language === language);
    }

    const matchingTracks: Track[] = [];

    for (const track of pool) {
      const normTitle = stripAccents(track.title);
      const normArtist = stripAccents(track.artist);
      const combined = `${normTitle} ${normArtist}`;

      // Check if all query words appear in (title + artist)
      const allWordsMatch = queryWords.every((word) => combined.includes(word));
      if (allWordsMatch) {
        matchingTracks.push(track);
      }
    }

    // Check if query is targeting an artist or title
    const isArtistSearch = matchingTracks.some(
      (t) => stripAccents(t.artist).includes(normQuery) || normQuery.includes(stripAccents(t.artist))
    );

    const isTitleMatch = matchingTracks.some(
      (t) => stripAccents(t.title).includes(normQuery) || normQuery.includes(stripAccents(t.title))
    );

    // Sorting strategy:
    // 1. If artist search: sort songs by that artist ALPHABETICALLY (A-Z) instead of popularity
    //    so the player isn't handed the top hit on a silver platter.
    // 2. If title search: exact title start gets priority, then rank.
    matchingTracks.sort((a, b) => {
      const aTitleNorm = stripAccents(a.title);
      const bTitleNorm = stripAccents(b.title);
      const aArtistNorm = stripAccents(a.artist);
      const bArtistNorm = stripAccents(b.artist);

      const aArtistMatches = aArtistNorm === normQuery ? 3 : aArtistNorm.startsWith(normQuery) ? 2 : aArtistNorm.includes(normQuery) ? 1 : 0;
      const bArtistMatches = bArtistNorm === normQuery ? 3 : bArtistNorm.startsWith(normQuery) ? 2 : bArtistNorm.includes(normQuery) ? 1 : 0;

      const aTitleMatches = aTitleNorm === normQuery ? 3 : aTitleNorm.startsWith(normQuery) ? 2 : aTitleNorm.includes(normQuery) ? 1 : 0;
      const bTitleMatches = bTitleNorm === normQuery ? 3 : bTitleNorm.startsWith(normQuery) ? 2 : bTitleNorm.includes(normQuery) ? 1 : 0;

      // 1. Artist search takes precedence when query matches artist name
      if (isArtistSearch && (!isTitleMatch || aArtistMatches > aTitleMatches || bArtistMatches > bTitleMatches)) {
        if (aArtistMatches !== bArtistMatches) {
          return bArtistMatches - aArtistMatches;
        }
        // If same artist (or equally matching artist), sort ALPHABETICALLY by title (A-Z)
        if (aArtistNorm === bArtistNorm) {
          return aTitleNorm.localeCompare(bTitleNorm, "es", { sensitivity: "base" });
        }
      }

      // 2. Title search: exact / prefix matches first
      if (aTitleMatches !== bTitleMatches) {
        return bTitleMatches - aTitleMatches;
      }

      // Default fallback: popularity rank
      return b.rank - a.rank;
    });

    // Ensure current secret track is available if it matches query words.
    // Only place as #1 if the user specifically typed the title; never give it away on artist search!
    if (currentTrackId) {
      const currentTrack = catalog.find((t) => t.id === currentTrackId);
      if (currentTrack) {
        const normCurrentTitle = stripAccents(currentTrack.title);
        const normCurrentArtist = stripAccents(currentTrack.artist);
        const normCurrentBoth = `${normCurrentTitle} ${normCurrentArtist}`;
        const matchesCurrent = queryWords.every((w) => normCurrentBoth.includes(w));

        if (matchesCurrent) {
          const alreadyInList = matchingTracks.some((t) => t.id === currentTrackId);
          if (!alreadyInList) {
            matchingTracks.push(currentTrack);
          }
          // Only force to #1 if user searched for the song title, NOT when typing artist name
          if (!isArtistSearch && queryWords.some((w) => normCurrentTitle.includes(w))) {
            const index = matchingTracks.findIndex((t) => t.id === currentTrackId);
            if (index > 0) {
              matchingTracks.splice(index, 1);
              matchingTracks.unshift(currentTrack);
            }
          }
        }
      }
    }

    // Deduplicate by clean (title, artist) so there is NEVER more than 1 version of a song
    const seen = new Set<string>();
    const results: SearchResultItem[] = [];

    // Up to 50 results so when searching an artist, their full alphabetical song list is accessible
    for (const t of matchingTracks) {
      const cleanKey = `${stripAccents(t.title)}::${stripAccents(t.artist)}`;
      if (seen.has(cleanKey)) continue;
      seen.add(cleanKey);

      results.push({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        cover: t.cover,
        rank: t.rank,
      });

      if (results.length >= 50) break;
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error searching catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
