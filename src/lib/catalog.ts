import tracksData from "@/data/tracks.json";
import { Track, Language, Genre, Era, Difficulty } from "./types";

const tracks: Track[] = tracksData as Track[];

export interface FilterParams {
  language?: Language;
  genres?: Genre[];
  genre?: string;
  eras?: Era[];
  era?: string;
  difficulties?: Difficulty[];
  difficulty?: string;
  excludeIds?: number[];
  excludeArtist?: string;
}

export function getEligibleTracks(params: FilterParams): Track[] {
  const { language = "all", excludeIds = [] } = params;
  const excludeSet = new Set(excludeIds);

  let pool = tracks.filter((t) => !excludeSet.has(t.id));

  // If pool was exhausted because of exclusions, reset exclusions for this category
  if (pool.length === 0) {
    pool = [...tracks];
  }

  // Filter Language
  if (language !== "all") {
    pool = pool.filter((t) => t.language === language);
  }

  // Filter Genres (multi-select support)
  const genres =
    params.genres && params.genres.length > 0
      ? params.genres
      : params.genre && params.genre !== "all"
      ? [params.genre as Genre]
      : [];

  if (genres.length > 0 && genres.length < 5) {
    const genreSet = new Set(genres);
    const filtered = pool.filter((t) => genreSet.has(t.genre));
    if (filtered.length > 0) pool = filtered;
  }

  // Filter Eras (multi-select support)
  const eras =
    params.eras && params.eras.length > 0
      ? params.eras
      : params.era && params.era !== "all"
      ? [params.era as Era]
      : [];

  if (eras.length > 0 && eras.length < 4) {
    const eraSet = new Set(eras);
    const filtered = pool.filter((t) => eraSet.has(t.era));
    if (filtered.length > 0) pool = filtered;
  }

  // Filter Difficulties (multi-select support)
  const difficulties =
    params.difficulties && params.difficulties.length > 0
      ? params.difficulties
      : params.difficulty && params.difficulty !== "all"
      ? [params.difficulty as Difficulty]
      : [];

  if (difficulties.length > 0 && difficulties.length < 4) {
    const diffSet = new Set(difficulties);
    const filtered = pool.filter((t) => diffSet.has(t.difficulty));
    if (filtered.length > 0) pool = filtered;
  }

  // Fallback if overly filtered
  if (pool.length === 0) {
    if (language !== "all") {
      pool = tracks.filter((t) => t.language === language);
    } else {
      pool = tracks;
    }
  }

  return pool;
}

let lastSelectedArtist = "";

export function getRandomTrack(params: FilterParams): Track {
  const pool = getEligibleTracks(params);
  if (pool.length === 0) return tracks[0];

  // Group eligible tracks by artist to achieve true diversity
  const artistMap = new Map<string, Track[]>();
  for (const track of pool) {
    const list = artistMap.get(track.artist) || [];
    list.push(track);
    artistMap.set(track.artist, list);
  }

  const artists = Array.from(artistMap.keys());
  const avoidArtist = params.excludeArtist || lastSelectedArtist;

  // Filter out the last played artist if there are other candidates
  let candidateArtists = artists.filter((a) => a !== avoidArtist);
  if (candidateArtists.length === 0) {
    candidateArtists = artists;
  }

  // Pick a random artist uniformly
  const randomArtistIndex = Math.floor(Math.random() * candidateArtists.length);
  const chosenArtist = candidateArtists[randomArtistIndex];
  lastSelectedArtist = chosenArtist;

  // Pick a random track from the selected artist
  const artistTracks = artistMap.get(chosenArtist)!;
  const randomTrackIndex = Math.floor(Math.random() * artistTracks.length);
  return artistTracks[randomTrackIndex];
}

export function getTrackById(id: number): Track | undefined {
  return tracks.find((t) => t.id === id);
}

export function searchLocalTracks(query: string, limit = 5): Track[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();

  return tracks
    .filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}
