export type Language = "es" | "en";
export type LanguageFilter = Language | "all";
export type Genre = "pop" | "rock" | "urban" | "classics";
export type Era = "pre-80" | "80s" | "90s" | "2000s" | "2010s" | "2020s";
export type Difficulty = "easy" | "medium" | "hard" | "expert";

export const ALL_GENRES: { id: Genre; label: string }[] = [
  { id: "pop", label: "Pop" },
  { id: "rock", label: "Rock" },
  { id: "urban", label: "Urbano y hip-hop" },
  { id: "classics", label: "Clásicos y baladas" },
];

export const ALL_ERAS: { id: Era; label: string }[] = [
  { id: "pre-80", label: "Antes de los 80" },
  { id: "80s", label: "80s" },
  { id: "90s", label: "90s" },
  { id: "2000s", label: "2000s" },
  { id: "2010s", label: "2010s" },
  { id: "2020s", label: "2020s" },
];

export const ALL_DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Fácil" },
  { id: "medium", label: "Media" },
  { id: "hard", label: "Difícil" },
  { id: "expert", label: "Experto" },
];

export const LANGUAGES: { id: LanguageFilter; label: string }[] = [
  { id: "es", label: "Español" },
  { id: "en", label: "Inglés" },
  { id: "all", label: "Ambos" },
];

/** A catalog entry as stored in src/data/tracks.json. */
export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  coverXl: string;
  rank: number;
  year: number;
  language: Language;
  genre: Genre;
  era: Era;
  difficulty: Difficulty;
}

export interface Filters {
  language: LanguageFilter;
  genres: Genre[];
  eras: Era[];
  difficulties: Difficulty[];
}

/** Where the songs of a round or game come from. */
export type Source = { kind: "filters"; filters: Filters } | { kind: "artists"; artists: string[] };

/** What the client knows about a round before solving it: an opaque token, never the track id. */
export interface RoundTicket {
  token: string;
  /** True when every song matching the filters had been played and the history was recycled. */
  recycled?: boolean;
}

export interface RevealedTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  coverXl: string;
  year: number;
  deezerUrl: string;
}

export interface VerifyResponse {
  correct: boolean;
  /** The guess was wrong but by the right artist. */
  artistMatch?: boolean;
  track?: RevealedTrack;
}

export interface SearchResultItem {
  id: number;
  title: string;
  artist: string;
  cover: string;
}

export interface ArtistResult {
  name: string;
  songs: number;
  cover: string;
}

/** Song counts per facet combination, so the client can count any filter selection offline. */
export interface CatalogFacets {
  languages: Language[];
  genres: Genre[];
  eras: Era[];
  difficulties: Difficulty[];
  /** counts[lang][genre][era][difficulty] */
  counts: number[][][][];
}
