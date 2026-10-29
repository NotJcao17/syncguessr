"use client";

import { useEffect, useState } from "react";
import { ArtistResult } from "@/lib/types";
import { Icon } from "./Icon";

const MAX_ARTISTS = 20;

/** Search the catalog's artists and build a selection of one or more. */
export function ArtistPicker({ value, onChange }: { value: ArtistResult[]; onChange: (a: ArtistResult[]) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistResult[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (res.ok) setResults((await res.json()).results ?? []);
      } catch {
        // aborted
      }
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const selected = new Set(value.map((a) => a.name));
  const toggle = (a: ArtistResult) => {
    if (selected.has(a.name)) onChange(value.filter((x) => x.name !== a.name));
    else if (value.length < MAX_ARTISTS) onChange([...value, a]);
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-5 flex flex-wrap gap-2" aria-label="Artistas elegidos">
          {value.map((a) => (
            <li key={a.name}>
              <button
                type="button"
                onClick={() => toggle(a)}
                className="chip pl-1.5"
                aria-pressed="true"
                aria-label={`Quitar a ${a.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.cover} alt="" className="size-7 rounded-full object-cover" />
                {a.name}
                <Icon name="close" className="size-4 opacity-70" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3">
          <Icon name="search" className="size-5" />
        </span>
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          className="field"
          placeholder="Busca un artista o banda…"
          aria-label="Buscar artista"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p className="mt-4 text-sm font-semibold text-ink-3">{query.trim() ? "Resultados" : "Más escuchados del catálogo"}</p>
      {results.length === 0 ? (
        <p className="mt-3 text-ink-3">{query.trim() ? "No tenemos a ese artista en el catálogo." : "Cargando…"}</p>
      ) : (
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {results.map((a) => {
            const on = selected.has(a.name);
            return (
              <li key={a.name}>
                <button
                  type="button"
                  onClick={() => toggle(a)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors ${
                    on ? "bg-indigo-deep/40" : "hover:bg-ink/5"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.cover} alt="" loading="lazy" className="size-11 shrink-0 rounded-full object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.name}</span>
                    <span className="block text-sm text-ink-3">{a.songs} canciones</span>
                  </span>
                  <Icon name={on ? "check" : "add"} className={`size-6 ${on ? "text-indigo-soft" : "text-ink-3"}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
