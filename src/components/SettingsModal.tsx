"use client";

import React, { useState, useEffect } from "react";
import {
  Language,
  Genre,
  Era,
  Difficulty,
  StageConfig,
  ALL_GENRES,
  ALL_ERAS,
  ALL_DIFFICULTIES,
} from "@/lib/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  selectedGenres: Genre[];
  onGenresChange: (genres: Genre[]) => void;
  selectedEras: Era[];
  onErasChange: (eras: Era[]) => void;
  selectedDifficulties: Difficulty[];
  onDifficultiesChange: (diffs: Difficulty[]) => void;
  stages: StageConfig[];
  onToggleStage: (index: number) => void;
  onResetHistory: () => void;
  historyCount: number;
  onApplyFilters: (newFilters: {
    language: Language;
    genres: Genre[];
    eras: Era[];
    difficulties: Difficulty[];
  }) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  language,
  selectedGenres,
  selectedEras,
  selectedDifficulties,
  stages,
  onToggleStage,
  onResetHistory,
  historyCount,
  onApplyFilters,
}: SettingsModalProps) {
  // Local state for interactive editing before applying
  const [localLang, setLocalLang] = useState<Language>(language);
  const [localGenres, setLocalGenres] = useState<Genre[]>(selectedGenres);
  const [localEras, setLocalEras] = useState<Era[]>(selectedEras);
  const [localDiffs, setLocalDiffs] = useState<Difficulty[]>(selectedDifficulties);

  // Sync whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalLang(language);
      setLocalGenres(selectedGenres);
      setLocalEras(selectedEras);
      setLocalDiffs(selectedDifficulties);
    }
  }, [isOpen, language, selectedGenres, selectedEras, selectedDifficulties]);

  if (!isOpen) return null;

  // Multi-select toggle helpers
  const toggleGenre = (genreId: Genre) => {
    setLocalGenres((prev) => {
      if (prev.includes(genreId)) {
        // If unchecking the only remaining, reset to all
        if (prev.length <= 1) {
          return ALL_GENRES.map((g) => g.id);
        }
        return prev.filter((g) => g !== genreId);
      } else {
        return [...prev, genreId];
      }
    });
  };

  const toggleAllGenres = () => {
    if (localGenres.length === ALL_GENRES.length) {
      // If all selected, isolate the first one for easy building
      setLocalGenres([ALL_GENRES[0].id]);
    } else {
      setLocalGenres(ALL_GENRES.map((g) => g.id));
    }
  };

  const toggleEra = (eraId: Era) => {
    setLocalEras((prev) => {
      if (prev.includes(eraId)) {
        if (prev.length <= 1) {
          return ALL_ERAS.map((e) => e.id);
        }
        return prev.filter((e) => e !== eraId);
      } else {
        return [...prev, eraId];
      }
    });
  };

  const toggleAllEras = () => {
    if (localEras.length === ALL_ERAS.length) {
      setLocalEras([ALL_ERAS[0].id]);
    } else {
      setLocalEras(ALL_ERAS.map((e) => e.id));
    }
  };

  const toggleDifficulty = (diffId: Difficulty) => {
    setLocalDiffs((prev) => {
      if (prev.includes(diffId)) {
        if (prev.length <= 1) {
          return ALL_DIFFICULTIES.map((d) => d.id);
        }
        return prev.filter((d) => d !== diffId);
      } else {
        return [...prev, diffId];
      }
    });
  };

  const toggleAllDifficulties = () => {
    if (localDiffs.length === ALL_DIFFICULTIES.length) {
      setLocalDiffs([ALL_DIFFICULTIES[0].id]);
    } else {
      setLocalDiffs(ALL_DIFFICULTIES.map((d) => d.id));
    }
  };

  const handleSaveAndClose = () => {
    onApplyFilters({
      language: localLang,
      genres: localGenres,
      eras: localEras,
      difficulties: localDiffs,
    });
    onClose();
  };

  const isAllGenres = localGenres.length === ALL_GENRES.length;
  const isAllEras = localEras.length === ALL_ERAS.length;
  const isAllDiffs = localDiffs.length === ALL_DIFFICULTIES.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-line/60 bg-surface p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/40 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink">Ajustes y Filtros</h2>
            <p className="mt-0.5 text-xs text-ink-3">
              Personaliza tu catálogo seleccionando una o varias opciones
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {/* Idioma */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-3">
              Idioma de la música
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  { id: "es", label: "🇪🇸 Español" },
                  { id: "en", label: "🇬🇧 Inglés" },
                  { id: "all", label: "🌐 Ambos" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLocalLang(item.id)}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                    localLang === item.id
                      ? "border-indigo bg-indigo-deep text-ink shadow-md"
                      : "border-line bg-surface-2 text-ink-2 hover:border-line/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dificultad (Multi-select) */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-3">
                  Nivel de dificultad
                </label>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-2">
                  {isAllDiffs ? "Todas" : `${localDiffs.length} de ${ALL_DIFFICULTIES.length}`}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAllDifficulties}
                className="text-xs font-bold text-indigo hover:text-indigo-light transition-colors"
              >
                {isAllDiffs ? "Desmarcar" : "Seleccionar todas"}
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ALL_DIFFICULTIES.map((item) => {
                const isSelected = localDiffs.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleDifficulty(item.id)}
                    className={`flex items-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-indigo bg-indigo-deep text-ink shadow-sm ring-1 ring-indigo/40"
                        : "border-line bg-surface-2 text-ink-3 hover:text-ink-2 hover:border-line/80"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-indigo bg-indigo text-white"
                          : "border-line bg-surface text-transparent"
                      }`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2.5 6L5 8.5L9.5 3.5" />
                      </svg>
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Género musical (Multi-select) */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-3">
                  Géneros musicales
                </label>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-2">
                  {isAllGenres ? "Todos" : `${localGenres.length} de ${ALL_GENRES.length}`}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAllGenres}
                className="text-xs font-bold text-indigo hover:text-indigo-light transition-colors"
              >
                {isAllGenres ? "Desmarcar" : "Seleccionar todos"}
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_GENRES.map((item) => {
                const isSelected = localGenres.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleGenre(item.id)}
                    className={`flex items-center gap-2 rounded-xl border py-2 px-3 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-indigo bg-indigo-deep text-ink shadow-sm ring-1 ring-indigo/40"
                        : "border-line bg-surface-2 text-ink-3 hover:text-ink-2 hover:border-line/80"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-indigo bg-indigo text-white"
                          : "border-line bg-surface text-transparent"
                      }`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2.5 6L5 8.5L9.5 3.5" />
                      </svg>
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Época / Década (Multi-select) */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-3">
                  Épocas / Décadas
                </label>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-2">
                  {isAllEras ? "Todas" : `${localEras.length} de ${ALL_ERAS.length}`}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAllEras}
                className="text-xs font-bold text-indigo hover:text-indigo-light transition-colors"
              >
                {isAllEras ? "Desmarcar" : "Seleccionar todas"}
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ALL_ERAS.map((item) => {
                const isSelected = localEras.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleEra(item.id)}
                    className={`flex items-center gap-2 rounded-xl border py-2 px-3 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-indigo bg-indigo-deep text-ink shadow-sm ring-1 ring-indigo/40"
                        : "border-line bg-surface-2 text-ink-3 hover:text-ink-2 hover:border-line/80"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-indigo bg-indigo text-white"
                          : "border-line bg-surface text-transparent"
                      }`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2.5 6L5 8.5L9.5 3.5" />
                      </svg>
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personalización de Etapas */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-3">
              Etapas de audio activas
            </label>
            <p className="mt-0.5 text-xs text-ink-3">
              Activa o desactiva etapas para personalizar la dificultad.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {stages.map((st, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onToggleStage(i)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-mono font-bold transition-all ${
                    st.enabled
                      ? "border-indigo bg-indigo-deep/50 text-ink"
                      : "border-line bg-surface-2/40 text-ink-3 opacity-40 line-through"
                  }`}
                >
                  {st.duration}s
                </button>
              ))}
            </div>
          </div>

          {/* Memoria Local */}
          <div className="rounded-2xl border border-line/40 bg-surface-2/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink">Historial de partidas</p>
                <p className="text-[11px] text-ink-3">
                  {historyCount} canciones jugadas en este navegador
                </p>
              </div>
              <button
                type="button"
                onClick={onResetHistory}
                className="btn btn-ghost py-1.5 px-3 text-xs font-semibold text-rose hover:bg-rose/10"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost flex-1 py-3.5 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="btn btn-primary flex-1 py-3.5 text-sm font-bold shadow-md"
          >
            Guardar y aplicar filtros
          </button>
        </div>
      </div>
    </div>
  );
}
