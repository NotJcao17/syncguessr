import {
  ALL_DIFFICULTIES,
  ALL_ERAS,
  ALL_GENRES,
  CatalogFacets,
  Difficulty,
  Era,
  Filters,
  Genre,
  LanguageFilter,
} from "./types";

export const DEFAULT_FILTERS: Filters = {
  language: "all",
  genres: ALL_GENRES.map((g) => g.id),
  eras: ALL_ERAS.map((e) => e.id),
  difficulties: ["easy", "medium"],
};

/** Daily challenge: well-known songs from every genre and decade, both languages. */
export const DAILY_FILTERS: Filters = {
  language: "all",
  genres: ALL_GENRES.map((g) => g.id),
  eras: ALL_ERAS.map((e) => e.id),
  difficulties: ["easy", "medium"],
};

const pick = <T extends string>(value: unknown, allowed: readonly T[]): T[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is T => allowed.includes(v as T));
};

/** Validates anything that claims to be Filters (localStorage, URLs, request bodies). */
export function sanitizeFilters(raw: unknown): Filters {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const language = (["es", "en", "all"] as const).includes(obj.language as LanguageFilter)
    ? (obj.language as LanguageFilter)
    : DEFAULT_FILTERS.language;
  const genres = pick<Genre>(obj.genres, ALL_GENRES.map((g) => g.id));
  const eras = pick<Era>(obj.eras, ALL_ERAS.map((e) => e.id));
  const difficulties = pick<Difficulty>(obj.difficulties, ALL_DIFFICULTIES.map((d) => d.id));
  return {
    language,
    genres: genres.length ? genres : DEFAULT_FILTERS.genres,
    eras: eras.length ? eras : DEFAULT_FILTERS.eras,
    difficulties: difficulties.length ? difficulties : DEFAULT_FILTERS.difficulties,
  };
}

/** Compact, URL-safe form used by challenge links: "es.pop_rock.pre-80_90s.easy". */
export function encodeFilters(f: Filters): string {
  return [f.language, f.genres.join("_"), f.eras.join("_"), f.difficulties.join("_")].join(".");
}

export function decodeFilters(s: string | null | undefined): Filters | null {
  if (!s) return null;
  const [language, genres, eras, difficulties] = s.split(".");
  if (!language) return null;
  return sanitizeFilters({
    language,
    genres: genres?.split("_"),
    eras: eras?.split("_"),
    difficulties: difficulties?.split("_"),
  });
}

/** Number of songs matching a selection, computed from the facet cube. */
export function countSongs(facets: CatalogFacets, f: Filters): number {
  let total = 0;
  facets.languages.forEach((lang, li) => {
    if (f.language !== "all" && f.language !== lang) return;
    facets.genres.forEach((g, gi) => {
      if (!f.genres.includes(g)) return;
      facets.eras.forEach((e, ei) => {
        if (!f.eras.includes(e)) return;
        facets.difficulties.forEach((d, di) => {
          if (f.difficulties.includes(d)) total += facets.counts[li][gi][ei][di];
        });
      });
    });
  });
  return total;
}

export function summarizeFilters(f: Filters): string {
  const parts: string[] = [];
  parts.push(f.language === "all" ? "Español e inglés" : f.language === "es" ? "Español" : "Inglés");
  const list = <T extends string>(sel: T[], all: { id: T; label: string }[], allLabel: string) =>
    sel.length === all.length ? allLabel : all.filter((x) => sel.includes(x.id)).map((x) => x.label).join(", ");
  parts.push(list(f.genres, ALL_GENRES, "todos los géneros"));
  parts.push(list(f.eras, ALL_ERAS, "todas las épocas"));
  parts.push(list(f.difficulties, ALL_DIFFICULTIES, "toda dificultad"));
  return parts.join(" · ");
}
