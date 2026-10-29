"use client";

import { useMemo, useState } from "react";
import { FilterPanel, SongCount } from "@/components/FilterPanel";
import { GameScreen } from "@/components/GameScreen";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { useCatalog } from "@/hooks/useCatalog";
import { countSongs, summarizeFilters } from "@/lib/filters";
import { STAGES } from "@/lib/scoring";
import {
  clearHistory,
  loadEnabledStages,
  loadFilters,
  loadHistory,
  saveEnabledStages,
  saveFilters,
} from "@/lib/storage";
import { Filters } from "@/lib/types";

export function LibreGame() {
  const catalog = useCatalog();
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [enabled, setEnabled] = useState<boolean[]>(loadEnabledStages);
  const [draft, setDraft] = useState<Filters | null>(null);
  const [draftStages, setDraftStages] = useState(enabled);
  const [historyCount, setHistoryCount] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  const stages = useMemo(() => STAGES.filter((_, i) => enabled[i]), [enabled]);

  const openFilters = () => {
    setDraft(filters);
    setDraftStages(enabled);
    setHistoryCount(loadHistory().length);
  };

  const apply = () => {
    if (!draft) return;
    saveFilters(draft);
    saveEnabledStages(draftStages);
    setFilters(draft);
    setEnabled(draftStages);
    setDraft(null);
    setSessionKey((k) => k + 1);
  };

  const draftCount = draft && catalog ? countSongs(catalog.facets, draft) : null;

  return (
    <>
      <GameScreen
        key={sessionKey}
        config={{ mode: "libre", source: { kind: "filters", filters }, count: null }}
        stages={stages}
        title="Modo libre"
        subtitle={summarizeFilters(filters)}
        searchLanguage={filters.language}
        toolbar={
          <button type="button" className="icon-btn" aria-label="Filtros" onClick={openFilters}>
            <Icon name="filters" className="size-6" />
          </button>
        }
      />

      <Sheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        title="Filtros"
        footer={
          draft && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SongCount facets={catalog?.facets ?? null} filters={draft} />
              <button type="button" className="btn btn-primary" disabled={draftCount === 0} onClick={apply}>
                Aplicar
              </button>
            </div>
          )
        }
      >
        {draft && (
          <>
            <FilterPanel value={draft} onChange={setDraft} facets={catalog?.facets ?? null} />

            <fieldset className="mt-6">
              <legend className="text-[0.95rem] font-bold wide">Pistas</legend>
              <p className="mt-1 text-sm text-ink-3">Quita fragmentos para hacerlo más difícil. Solo afecta al modo libre.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {STAGES.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    aria-pressed={draftStages[i]}
                    onClick={() => {
                      const next = draftStages.map((v, j) => (j === i ? !v : v));
                      if (next.some(Boolean)) setDraftStages(next);
                    }}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-night-deep/50 p-4">
              <div>
                <p className="font-semibold">Canciones ya escuchadas</p>
                <p className="text-sm text-ink-3">{historyCount} no se repetirán hasta agotar la selección.</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={historyCount === 0}
                onClick={() => {
                  clearHistory();
                  setHistoryCount(0);
                }}
              >
                <Icon name="trash" className="size-4" />
                Olvidar
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
