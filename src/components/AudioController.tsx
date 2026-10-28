"use client";

import React, { useState } from "react";

interface AudioControllerProps {
  isPlaying: boolean;
  duration: number;
  progress: number;
  isLoading: boolean;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onReroll: () => void;
  canReroll: boolean;
}

export function AudioController({
  isPlaying,
  duration,
  progress,
  isLoading,
  volume,
  onVolumeChange,
  onPlay,
  onStop,
  onReroll,
  canReroll,
}: AudioControllerProps) {
  const [prevVolume, setPrevVolume] = useState(0.85);

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume || 0.85);
    }
  };

  return (
    <div className="relative flex w-full max-w-md flex-col items-center justify-center rounded-2xl border border-line/30 bg-surface/40 p-6 shadow-2xl backdrop-blur-md sm:p-8">
      {/* Background spotlight glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-20 blur-3xl transition-all duration-500"
        style={{
          background: isPlaying
            ? "radial-gradient(circle, oklch(0.585 0.204 277.1) 0%, transparent 70%)"
            : "radial-gradient(circle, oklch(0.267 0.027 260) 0%, transparent 60%)",
        }}
      />

      {/* Waveform Visualization Bars */}
      <div className="mb-6 flex h-8 items-center gap-1">
        {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 60, 80, 50, 90, 65].map(
          (height, idx) => (
            <span
              key={idx}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPlaying ? "bg-indigo" : "bg-line/60"
              }`}
              style={{
                height: isPlaying ? `${Math.max(15, (height * (progress + 0.3)) % 100)}%` : "20%",
                opacity: isPlaying ? 0.9 : 0.4,
              }}
            />
          )
        )}
      </div>

      {/* Main Play / Pause Button */}
      <div className="relative">
        <button
          type="button"
          disabled={isLoading}
          onClick={isPlaying ? onStop : onPlay}
          className={`group relative flex h-24 w-24 items-center justify-center rounded-full transition-all active:scale-95 sm:h-28 sm:w-28 ${
            isPlaying
              ? "bg-indigo text-ink shadow-[0_0_40px_rgba(99,102,241,0.6)]"
              : "bg-indigo-deep text-ink shadow-[0_10px_35px_-5px_rgba(99,102,241,0.5)] hover:bg-indigo"
          } ${isLoading ? "cursor-wait opacity-60" : ""}`}
          aria-label={isPlaying ? "Pausar" : `Escuchar ${duration}s`}
        >
          {isLoading ? (
            <svg
              className="h-8 w-8 animate-spin text-ink"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : isPlaying ? (
            <svg className="h-9 w-9 fill-current sm:h-10 sm:w-10" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1.5" />
              <rect x="14" y="5" width="4" height="14" rx="1.5" />
            </svg>
          ) : (
            <svg
              className="ml-1 h-10 w-10 fill-current transition-transform group-hover:scale-110 sm:h-12 sm:w-12"
              viewBox="0 0 24 24"
            >
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z" />
            </svg>
          )}
        </button>
      </div>

      {/* Duration Label */}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
        {isLoading
          ? "Cargando audio..."
          : isPlaying
          ? `Reproduciendo ${duration}s...`
          : `Escuchar pista de ${duration}s`}
      </p>

      {/* Segment Progress Bar */}
      <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full bg-indigo transition-all duration-75 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Volume Slider Control */}
      <div className="mt-6 flex w-full max-w-[240px] items-center gap-3 rounded-xl bg-surface/70 px-3 py-1.5 border border-line/40">
        <button
          type="button"
          onClick={toggleMute}
          className="text-ink-3 hover:text-ink transition-colors"
          title={volume === 0 ? "Activar sonido" : "Silenciar"}
          aria-label={volume === 0 ? "Activar sonido" : "Silenciar"}
        >
          {volume === 0 ? (
            <svg className="h-4 w-4 text-rose" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : volume < 0.5 ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface-2 accent-indigo transition-all"
          aria-label="Volumen"
        />

        <span className="w-8 text-right font-mono text-[11px] font-bold text-ink-3">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Reroll Button */}
      {canReroll && (
        <button
          type="button"
          onClick={onReroll}
          className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 transition-colors hover:text-ink-2"
          title="Cambiar de canción sin perder racha"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Cambiar canción (Reroll)
        </button>
      )}
    </div>
  );
}
