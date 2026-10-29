"use client";

import { countSongs } from "@/lib/filters";
import { ALL_DIFFICULTIES, ALL_ERAS, ALL_GENRES, CatalogFacets, Filters, LANGUAGES } from "@/lib/types";

/** Below this a selection repeats songs too soon to be fun. */
export const MIN_SONGS = 20;

type ListKey = "genres" | "eras" | "difficulties";

const nf = new Intl.NumberFormat("es-MX");

/**
 * Language, difficulty, genre and decade pickers. Each chip shows how many songs that option
 * brings with the rest of the selection, so empty combinations are visible before playing.
 */
export function FilterPanel({
  value,
  onChange,
  facets,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  facets: CatalogFacets | null;
}) {
  const count = (f: Filters) => (facets ? countSongs(facets, f) : null);

  const toggle = <K extends ListKey>(key: K, id: Filters[K][number]) => {
    const list = value[key] as string[];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    if (next.length === 0) return; // at least one option per group
    onChange({ ...value, [key]: next });
  };

  /** Songs this option contributes given the rest of the selection. */
  const withOption = <K extends ListKey>(key: K, id: Filters[K][number]) => count({ ...value, [key]: [id] });

  const group = <K extends ListKey>(key: K, label: string, options: { id: Filters[K][number]; label: string }[]) => {
    const all = (value[key] as string[]).length === options.length;
    return (
      <fieldset className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <legend className="text-[0.95rem] font-bold wide">{label}</legend>
          <button
            type="button"
            className="text-sm font-semibold text-indigo-soft hover:text-ink"
            onClick={() => onChange({ ...value, [key]: all ? [options[0].id] : options.map((o) => o.id) })}
          >
            {all ? "Solo una" : "Todas"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => {
            const on = (value[key] as string[]).includes(o.id);
            const n = withOption(key, o.id);
            return (
              <button
                key={o.id}
                type="button"
                className="chip"
                aria-pressed={on}
                onClick={() => toggle(key, o.id)}
                disabled={!on && n === 0}
              >
                {o.label}
                {n !== null && <span className="count">{nf.format(n)}</span>}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  };

  return (
    <div>
      <fieldset>
        <legend className="text-[0.95rem] font-bold wide">Idioma</legend>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
          {LANGUAGES.map((l) => {
            const n = count({ ...value, language: l.id });
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                className="chip"
                aria-checked={value.language === l.id}
                onClick={() => onChange({ ...value, language: l.id })}
              >
                {l.label}
                {n !== null && <span className="count">{nf.format(n)}</span>}
              </button>
            );
          })}
        </div>
      </fieldset>
      {group("difficulties", "Dificultad", ALL_DIFFICULTIES)}
      {group("genres", "Género", ALL_GENRES)}
      {group("eras", "Época", ALL_ERAS)}
    </div>
  );
}

/** "1,284 canciones" line with a warning when the selection is too small. */
export function SongCount({ facets, filters, min = MIN_SONGS }: { facets: CatalogFacets | null; filters: Filters; min?: number }) {
  if (!facets) return <p className="text-sm text-ink-3">Contando canciones…</p>;
  const n = countSongs(facets, filters);
  return (
    <p className={`text-sm font-semibold ${n < min ? "text-miss" : "text-ink-2"}`} aria-live="polite">
      {n === 0
        ? "Ninguna canción cumple todos estos filtros"
        : n < min
          ? `Solo ${nf.format(n)} canciones: amplía un poco la selección`
          : `${nf.format(n)} canciones disponibles`}
    </p>
  );
}
