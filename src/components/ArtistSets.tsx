"use client";

import { useState } from "react";
import { ArtistSet, loadArtistSets, saveArtistSets } from "@/lib/storage";
import { ArtistResult } from "@/lib/types";
import { Icon } from "./Icon";

const MAX_SETS = 30;

const sameArtists = (a: ArtistResult[], b: ArtistResult[]) => {
  const names = new Set(a.map((x) => x.name));
  return a.length === b.length && b.every((x) => names.has(x.name));
};

/** Saved artist selections (only in this browser): one tap swaps the whole selection. */
export function ArtistSets({ selection, onLoad }: { selection: ArtistResult[]; onLoad: (a: ArtistResult[]) => void }) {
  const [sets, setSets] = useState<ArtistSet[]>(loadArtistSets);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const update = (next: ArtistSet[]) => {
    setSets(next);
    saveArtistSets(next);
  };

  const active = sets.find((s) => sameArtists(s.artists, selection));
  const canSave = selection.length > 0 && !active;
  const cleaned = name.trim().slice(0, 30);
  const replacing = sets.some((s) => s.name === cleaned);

  const save = () => {
    if (!cleaned) return;
    // Same name replaces, so a selection can be edited and saved over itself.
    update([...sets.filter((s) => s.name !== cleaned), { name: cleaned, artists: selection }].slice(-MAX_SETS));
    setNaming(false);
    setName("");
  };

  if (sets.length === 0 && !canSave) return null;

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.95rem] font-bold wide">Mis selecciones</h2>
        {active ? (
          <button
            type="button"
            className="text-sm font-semibold text-ink-3 hover:text-miss"
            onClick={() => update(sets.filter((s) => s !== active))}
          >
            Borrar “{active.name}”
          </button>
        ) : (
          canSave &&
          !naming && (
            <button type="button" className="text-sm font-semibold text-indigo-soft hover:text-ink" onClick={() => setNaming(true)}>
              Guardar esta
            </button>
          )
        )}
      </div>

      {sets.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {sets.map((s) => (
            <li key={s.name}>
              <button type="button" className="chip" aria-pressed={s === active} onClick={() => onLoad(s.artists)}>
                {s.name}
                <span className="count">{s.artists.length}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {naming && canSave && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <input
            type="text"
            className="field min-w-0 flex-1 pl-4"
            maxLength={30}
            autoFocus
            autoComplete="off"
            aria-label="Nombre de la selección"
            placeholder="Nombre, ej. Rock en inglés"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-light" disabled={!cleaned}>
            <Icon name="check" className="size-5" />
            {replacing ? "Reemplazar" : "Guardar"}
          </button>
        </form>
      )}
    </section>
  );
}
