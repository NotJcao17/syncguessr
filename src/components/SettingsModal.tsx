"use client";

import React from "react";
import { Language, Genre, Era, Difficulty, StageConfig } from "@/lib/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  genre: Genre;
  onGenreChange: (genre: Genre) => void;
  era: Era;
  onEraChange: (era: Era) => void;
  difficulty: Difficulty;
  onDifficultyChange: (diff: Difficulty) => void;
  stages: StageConfig[];
  onToggleStage: (index: number) => void;
  onResetHistory: () => void;
  historyCount: number;
}

export function SettingsModal({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  genre,
  onGenreChange,
  era,
  onEraChange,
  difficulty,
  onDifficultyChange,
  stages,
  onToggleStage,
  onResetHistory,
  historyCount,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-line/60 bg-surface p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/40 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-ink">Ajustes y Filtros</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:text-ink"
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
                  onClick={() => onLanguageChange(item.id)}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                    language === item.id
                      ? "border-indigo bg-indigo-deep text-ink shadow-md"
                      : "border-line bg-surface-2 text-ink-2 hover:border-line/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dificultad */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-3">
              Nivel de dificultad
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { id: "all", label: "Cualquiera" },
                  { id: "easy", label: "Fácil" },
                  { id: "medium", label: "Medio" },
                  { id: "hard", label: "Difícil" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onDifficultyChange(item.id)}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                    difficulty === item.id
                      ? "border-indigo bg-indigo-deep text-ink shadow-md"
                      : "border-line bg-surface-2 text-ink-2 hover:border-line/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Género */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-3">
              Género musical
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(
                [
                  { id: "all", label: "Todos" },
                  { id: "pop", label: "Pop" },
                  { id: "rock", label: "Rock" },
                  { id: "urban", label: "Urbano / Reggaetón" },
                  { id: "hiphop", label: "Hip-Hop" },
                  { id: "classics", label: "Clásicos" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onGenreChange(item.id)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                    genre === item.id
                      ? "border-indigo bg-indigo-deep text-ink shadow-md"
                      : "border-line bg-surface-2 text-ink-2 hover:border-line/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Época / Década */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-3">
              Época / Década
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { id: "all", label: "Cualquiera" },
                  { id: "2020s", label: "2020s" },
                  { id: "2010s", label: "2010s" },
                  { id: "2000s", label: "2000s" },
                  { id: "pre-2000", label: "Clásicos < 2000" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onEraChange(item.id)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                    era === item.id
                      ? "border-indigo bg-indigo-deep text-ink shadow-md"
                      : "border-line bg-surface-2 text-ink-2 hover:border-line/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
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
        <div className="mt-8">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary w-full py-3.5 text-sm font-bold shadow-md"
          >
            Guardar y volver al juego
          </button>
        </div>
      </div>
    </div>
  );
}
