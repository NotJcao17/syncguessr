"use client";

import { useEffect, useRef } from "react";
import { formatPoints } from "@/lib/scoring";
import { RevealedTrack } from "@/lib/types";
import type { PlaybackState } from "@/lib/audioEngine";
import { Icon } from "./Icon";
import { PlayButton } from "./PlayControls";

/** Full-screen result of a round: the answer, the points and the way to the next song. */
export function RevealPanel({
  won,
  stageSeconds,
  track,
  revealFailed,
  points,
  multiplier,
  showPoints,
  guessedArtist,
  playback,
  onPlay,
  onRetryReveal,
  onNext,
  nextLabel,
}: {
  won: boolean;
  stageSeconds: number;
  track: RevealedTrack | null;
  revealFailed: boolean;
  points: number;
  multiplier: number;
  showPoints: boolean;
  /** Artist of the winning guess, when it was another version of the song. */
  guessedArtist?: string;
  playback: PlaybackState;
  onPlay: () => void;
  onRetryReveal: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => nextRef.current?.focus(), []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={won ? "Canción adivinada" : "Canción no adivinada"}
      className="fixed inset-0 z-40 flex animate-fade flex-col overflow-y-auto bg-night/96 backdrop-blur-md"
    >
      <div className="m-auto flex w-full max-w-md flex-col items-center px-[var(--gutter)] py-8 text-center">
        {won ? (
          <p className="display text-[clamp(3rem,12vw,4.5rem)] text-ok">{stageSeconds}s</p>
        ) : (
          <p className="display text-[clamp(2.2rem,8vw,3rem)] whitespace-nowrap text-miss">Esta vez no</p>
        )}
        <p className="mt-3 text-lg font-bold wide text-ink-2">{won ? "La adivinaste" : "Era esta canción"}</p>

        <div className="relative mt-6 w-full max-w-[min(17rem,34dvh)]">
          {track ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.coverXl} alt="" className="aspect-square w-full animate-rise rounded-3xl object-cover shadow-2xl" />
          ) : (
            <div className="grid aspect-square w-full place-items-center rounded-3xl bg-surface text-ink-3">
              <Icon name="note" className="size-12" />
            </div>
          )}
          {track && (
            <div className="absolute -right-3 -bottom-3">
              <PlayButton playback={playback} loading={false} onPlay={onPlay} size="md" />
            </div>
          )}
        </div>

        <div className="mt-6 min-h-24 w-full">
          {track ? (
            <>
              <h2 className="text-2xl sm:text-3xl">{track.title}</h2>
              <p className="mt-1 text-lg font-semibold text-indigo-soft">{track.artist}</p>
              <p className="mt-0.5 text-sm text-ink-3">
                {track.year} · {track.album}
              </p>
              {won && guessedArtist && guessedArtist !== track.artist && (
                <p className="mt-2 text-sm text-ink-3">Elegiste la versión de {guessedArtist}; cuenta igual.</p>
              )}
            </>
          ) : revealFailed ? (
            <>
              <p className="font-semibold">No pudimos traer la respuesta.</p>
              <button type="button" onClick={onRetryReveal} className="mt-2 text-sm font-bold text-indigo-soft hover:text-ink">
                Intentar de nuevo
              </button>
            </>
          ) : (
            <p className="text-ink-3">Revelando…</p>
          )}
        </div>

        {showPoints && (
          <p className="mt-2 tabular-nums">
            <span className="text-2xl font-extrabold wide">+{formatPoints(points)}</span>
            <span className="ml-1.5 text-ink-3">pts</span>
            {multiplier > 1 && <span className="ml-2 text-sm font-semibold text-ember-soft">racha ×{multiplier.toFixed(1)}</span>}
          </p>
        )}

        <button ref={nextRef} type="button" onClick={onNext} className="btn btn-light mt-7 w-full">
          {nextLabel}
          <Icon name="next" className="size-5" />
        </button>
        <p className="mt-3 hidden text-sm text-ink-3 sm:block">
          <span className="kbd">N</span> o <span className="kbd">Enter</span>
        </p>
      </div>
    </div>
  );
}
