import { sanitizeFilters } from "./filters";
import { MAX_ARTISTS, Source } from "./types";

/** Validates a Source coming from a request body or URL. */
export function parseSource(raw: unknown): Source | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind === "artists") {
    if (!Array.isArray(obj.artists)) return null;
    const artists = obj.artists.filter((a): a is string => typeof a === "string" && a.length < 120).slice(0, MAX_ARTISTS);
    return artists.length ? { kind: "artists", artists, hits: obj.hits === true } : null;
  }
  if (obj.kind === "filters") return { kind: "filters", filters: sanitizeFilters(obj.filters) };
  return null;
}
