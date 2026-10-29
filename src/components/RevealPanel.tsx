"use client";

import { formatPoints } from "@/lib/scoring";
import { RevealedTrack } from "@/lib/types";
import { Icon } from "./Icon";

export function RevealPanel({
  won,
  stageSeconds,
  track,
  revealFailed,
  points,
  multiplier,
  showPoints,
  guessedArtist,
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
  onRetryReveal: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <section className="animate-rise" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <p className={`text-lg font-extrabold wide ${won ? "text-ok" : "text-miss"}`}>
          {won ? `La sacaste en ${stageSeconds}s` : "Esta vez no"}
        </p>
        {showPoints && (
          <p className="text-right tabular-nums">
            <span className="text-lg font-extrabold wide">+{formatPoints(points)}</span>
            {multiplier > 1 && <span className="ml-2 text-sm font-semibold text-ember-soft">racha ×{multiplier.toFixed(1)}</span>}
          </p>
        )}
      </div>

      {won && track && guessedArtist && guessedArtist !== track.artist && (
        <p className="mt-1 text-sm text-ink-3">
          Elegiste la versión de {guessedArtist}; cuenta porque es la misma canción.
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 rounded-3xl bg-surface p-3 pr-4 ring-1 ring-ink/5">
        {track ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverXl} alt="" className="size-24 shrink-0 rounded-2xl object-cover sm:size-28" />
        ) : (
          <div className="grid size-24 shrink-0 place-items-center rounded-2xl bg-surface-2 text-ink-3 sm:size-28">
            <Icon name="note" className="size-8" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {track ? (
            <>
              <h2 className="line-clamp-2 text-xl sm:text-2xl">{track.title}</h2>
              <p className="mt-1 truncate font-semibold text-indigo-soft">{track.artist}</p>
              <p className="mt-0.5 truncate text-sm text-ink-3">
                {track.year} · {track.album}
              </p>
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
      </div>

      <div className="mt-4 flex gap-3">
        {track && (
          <a href={track.deezerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            Deezer
            <Icon name="link" className="size-4" />
          </a>
        )}
        <button type="button" onClick={onNext} className="btn btn-light flex-1" autoFocus>
          {nextLabel}
          <Icon name="next" className="size-5" />
        </button>
      </div>
    </section>
  );
}
