export type Language = "es" | "en" | "all";
export type Genre = "pop" | "rock" | "urban" | "hiphop" | "classics";
export type Era = "pre-2000" | "2000s" | "2010s" | "2020s";
export type Difficulty = "easy" | "medium" | "hard" | "expert";

export const ALL_GENRES: { id: Genre; label: string }[] = [
  { id: "pop", label: "Pop" },
  { id: "rock", label: "Rock" },
  { id: "urban", label: "Urbano / Reggaetón" },
  { id: "hiphop", label: "Hip-Hop" },
  { id: "classics", label: "Clásicos" },
];

export const ALL_ERAS: { id: Era; label: string }[] = [
  { id: "2020s", label: "2020s" },
  { id: "2010s", label: "2010s" },
  { id: "2000s", label: "2000s" },
  { id: "pre-2000", label: "Clásicos < 2000" },
];

export const ALL_DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Fácil" },
  { id: "medium", label: "Medio" },
  { id: "hard", label: "Difícil" },
  { id: "expert", label: "Experto" },
];

export interface Track {
  id: number;
  title: string;
  rawTitle?: string;
  artist: string;
  album: string;
  cover: string;
  coverXl: string;
  preview: string;
  rank: number;
  language: "es" | "en";
  genre: "pop" | "rock" | "urban" | "hiphop" | "classics";
  era: "pre-2000" | "2000s" | "2010s" | "2020s";
  difficulty: "easy" | "medium" | "hard" | "expert";
}

export type StageStatus = "locked" | "active" | "skipped" | "failed" | "solved";

export interface StageConfig {
  index: number;
  duration: number; // in seconds: 0.1, 0.5, 2.0, 8.0, 15.0
  enabled: boolean;
}

export interface RoundResponse {
  trackId: number;
  previewUrl: string;
  duration: number;
  language: "es" | "en";
  genre: string;
  era: string;
  difficulty: string;
}

export interface VerifyResponse {
  correct: boolean;
  track?: {
    id: number;
    title: string;
    artist: string;
    album: string;
    cover: string;
    coverXl: string;
    preview: string;
    deezerUrl: string;
    releaseDate?: string;
  };
}

export interface SearchResultItem {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  rank: number;
}
