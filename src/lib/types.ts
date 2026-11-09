/** "ja" songs (Ado) exist only for artist mode; filters cover Spanish and English. */
export type Language = "es" | "en" | "ja";
export type LanguageFilter = "es" | "en" | "all";
export type Genre = "pop" | "rock" | "urban" | "classics";
export type Era = "pre-80" | "80s" | "90s" | "2000s" | "2010s" | "2020s";
export type Difficulty = "easy" | "medium" | "hard" | "expert";

export const ALL_GENRES: Genre[] = ["pop", "rock", "urban", "classics"];

/**
 * The same genre means different music in each language (urban is reggaetón in Spanish, hip-hop in
 * English), so filters pick them per language: "es:urban".
 */
export type GenreKey = `${"es" | "en"}:${Genre}`;

export const GENRES_BY_LANGUAGE: { language: "es" | "en"; label: string; genres: { id: GenreKey; label: string }[] }[] = [
  {
    language: "es",
    label: "En español",
    genres: [
      { id: "es:pop", label: "Pop" },
      { id: "es:rock", label: "Rock" },
      { id: "es:urban", label: "Urbano" },
      { id: "es:classics", label: "Regional y baladas" },
    ],
  },
  {
    language: "en",
    label: "En inglés",
    genres: [
      { id: "en:pop", label: "Pop" },
      { id: "en:rock", label: "Rock" },
      { id: "en:urban", label: "Hip-hop y R&B" },
      { id: "en:classics", label: "Soul y clásicos" },
    ],
  },
];

export const ALL_GENRE_KEYS: GenreKey[] = GENRES_BY_LANGUAGE.flatMap((g) => g.genres.map((x) => x.id));

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
  /** Position among the artist's own songs, 0 being the best known. */
  top: number;
}

/** "Only hits" in artist mode: each artist's best-known songs, at most half of what we have of them. */
export const HITS_PER_ARTIST = 10;
export const hitsFor = (songs: number) => Math.min(HITS_PER_ARTIST, Math.ceil(songs / 2));
/**
 * Artists in one artist-mode selection. Only there to keep URLs sane: the search request and the
 * challenge link carry every name (100 names are ~2.5 KB).
 */
export const MAX_ARTISTS = 100;
/** Below this an "only hits" selection repeats songs after a couple of games. */
export const MIN_HIT_SONGS = 15;

export interface Filters {
  language: LanguageFilter;
  genres: GenreKey[];
  eras: Era[];
  difficulties: Difficulty[];
}

/** Where the songs of a round or game come from. */
export type Source =
  | { kind: "filters"; filters: Filters }
  | { kind: "artists"; artists: string[]; /** Only each artist's best-known songs. */ hits?: boolean };

/** What the client knows about a round before solving it: an opaque token, never the track id. */
export interface RoundTicket {
  token: string;
  /** True when every song matching the filters had been played and the history was recycled. */
  recycled?: boolean;
  /** Playlist mode: which song of the playlist this is (an index into the sealed list). */
  slot?: number;
}

export type PlaylistSource = "spotify" | "syncora" | "deezer";

/** A playlist ready to play. `data` is the sealed song list; the browser can't read it. */
export interface PlaylistInfo {
  data: string;
  source: PlaylistSource;
  id: string;
  name: string;
  cover: string;
  count: number;
  /** The link as pasted, to load it again from the recent list. */
  url: string;
}

export interface RevealedTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  coverXl: string;
  year: number;
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
