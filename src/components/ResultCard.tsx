"use client";

import React, { useState } from "react";
import { audioEngine } from "@/lib/audioEngine";

interface ResultCardProps {
  won: boolean;
  stageReached: number;
  stageDuration: number;
  track: {
    id: number;
    title: string;
    artist: string;
    album: string;
    cover: string;
    coverXl: string;
    preview: string;
    deezerUrl: string;
  };
  onNextRound: () => void;
}

export function ResultCard({
  won,
  stageReached,
  stageDuration,
  track,
  onNextRound,
}: ResultCardProps) {
  const [isPlayingFull, setIsPlayingFull] = useState(false);

  const toggleFullPlay = () => {
    if (isPlayingFull) {
      audioEngine.stop();
      setIsPlayingFull(false);
    } else {
      audioEngine.setCallbacks(
        (playing) => setIsPlayingFull(playing),
        () => {}
      );
      audioEngine.playFull();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line/60 bg-surface/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        {/* Subtle status glow behind card */}
        <div
          className="pointer-events-none absolute -inset-10 -z-10 opacity-25 blur-3xl"
          style={{
            background: won
              ? "radial-gradient(circle, oklch(0.696 0.17 162.48) 0%, transparent 70%)"
              : "radial-gradient(circle, oklch(0.645 0.246 16.44) 0%, transparent 70%)",
          }}
        />

        {/* Win/Loss Status Header */}
        <div className="text-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${
              won
                ? "bg-emerald/20 text-emerald"
                : "bg-rose/20 text-rose"
            }`}
          >
            {won ? "¡Acertaste! 🎯" : "Canción no descubierta"}
          </span>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            {won
              ? `¡Adivinado en ${stageDuration}s!`
              : "La canción correcta era:"}
          </h2>
          {won && (
            <p className="mt-1 text-xs text-ink-3">
              Completado en la Pista {stageReached + 1}
            </p>
          )}
        </div>

        {/* Song Info Card */}
        <div className="mt-6 flex flex-col items-center sm:flex-row sm:items-start gap-5 rounded-2xl bg-surface-2/60 p-4 border border-line/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={track.coverXl || track.cover}
            alt={track.title}
            className="h-28 w-28 shrink-0 rounded-xl object-cover shadow-lg"
          />

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-ink leading-tight line-clamp-2">
              {track.title}
            </h3>
            <p className="mt-1 text-sm font-semibold text-indigo">
              {track.artist}
            </p>
            {track.album && (
              <p className="mt-0.5 text-xs text-ink-3 truncate max-w-full">
                Álbum: {track.album}
              </p>
            )}

            {/* Deezer link */}
            <a
              href={track.deezerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-ink-3 transition-colors hover:text-ink hover:underline"
            >
              Abrir en Deezer
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Audio Sample Playback (30s) */}
        <div className="mt-6 flex items-center justify-between rounded-xl bg-surface-2/40 px-4 py-3 border border-line/30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleFullPlay}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo text-ink shadow-md transition-transform active:scale-95 hover:bg-indigo-soft hover:text-night"
              aria-label={isPlayingFull ? "Pausar muestra" : "Escuchar muestra completa"}
            >
              {isPlayingFull ? (
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg className="ml-0.5 h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z" />
                </svg>
              )}
            </button>
            <div>
              <p className="text-xs font-bold text-ink">Muestra de 30 segundos</p>
              <p className="text-[11px] text-ink-3">
                {isPlayingFull ? "Reproduciendo..." : "Pausa"}
              </p>
            </div>
          </div>
        </div>

        {/* Next Round Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              audioEngine.stop();
              onNextRound();
            }}
            className="btn btn-primary w-full py-4 text-base font-bold shadow-xl active:scale-[0.98]"
          >
            Siguiente canción ➔
          </button>
        </div>
      </div>
    </div>
  );
}
