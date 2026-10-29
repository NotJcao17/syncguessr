"use client";

import type { Attempt } from "@/hooks/useRound";
import type { PlaybackState } from "@/lib/audioEngine";

const BARS = 64;

/**
 * The five clips on one time axis. The scale is logarithmic so 0.1s and 15s both get room;
 * the waveform is the song's real one, drawn only as far as the player has unlocked.
 */
export function StageRuler({
  stages,
  unlocked,
  attempts,
  playback,
  peaks,
  revealed,
  onSelect,
}: {
  stages: number[];
  unlocked: number;
  attempts: Attempt[];
  playback: PlaybackState;
  peaks: number[];
  revealed: boolean;
  onSelect: (stage: number) => void;
}) {
  const maxT = stages[stages.length - 1];
  const L = Math.log10(maxT * 10 + 1);
  const xOf = (t: number) => Math.log10(t * 10 + 1) / L;
  const tOf = (x: number) => (Math.pow(10, x * L) - 1) / 10;

  const limit = revealed ? maxT : stages[unlocked];
  const played = playback.playing ? playback.progress * playback.duration : -1;

  const statusOf = (i: number) => attempts.find((a) => a.stage === i)?.kind ?? null;

  return (
    <div className="select-none">
      <div className="relative h-20" aria-hidden="true">
        <div className="absolute inset-0 flex items-center gap-[3px]">
          {Array.from({ length: BARS }, (_, i) => {
            const t = tOf((i + 0.5) / BARS);
            const open = t <= limit;
            const peak = peaks.length ? peaks[Math.min(peaks.length - 1, Math.floor((t / maxT) * peaks.length))] : 0.3;
            const height = open ? `${Math.max(10, peak * 100)}%` : "4px";
            const lit = played >= 0 && t <= played;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-[height,background-color] duration-300 ${
                  lit ? "bg-indigo-soft" : open ? "bg-ink-3/70" : "bg-line/70"
                }`}
                style={{ height }}
              />
            );
          })}
        </div>
        {stages.map((s, i) => (
          <span
            key={s}
            className={`absolute top-0 bottom-0 w-px ${i <= unlocked || revealed ? "bg-ink/25" : "bg-line/60"}`}
            style={{ left: `${xOf(s) * 100}%` }}
          />
        ))}
      </div>

      <div className="relative mt-2 h-9">
        {stages.map((s, i) => {
          const status = statusOf(i);
          const reachable = i <= unlocked || revealed;
          const current = i === unlocked && !revealed;
          const color =
            status === "correct"
              ? "text-ok"
              : status === "wrong"
                ? "text-miss"
                : status === "skip"
                  ? "text-skip"
                  : current
                    ? "text-ink"
                    : reachable
                      ? "text-ink-2"
                      : "text-ink-3/60";
          const label = status === "wrong" ? "fallo" : status === "skip" ? "saltada" : status === "correct" ? "acierto" : "";
          return (
            <button
              key={s}
              type="button"
              disabled={!reachable}
              onClick={() => onSelect(i)}
              aria-label={`Escuchar ${s} segundos${label ? `, ${label}` : ""}`}
              className={`absolute top-0 -translate-x-full rounded-md px-1.5 py-1 text-right font-bold tabular-nums wide transition-colors disabled:cursor-not-allowed ${color} ${
                reachable ? "hover:bg-ink/5" : ""
              }`}
              style={{ left: `${xOf(s) * 100}%` }}
            >
              <span className="block text-sm leading-none">{s}s</span>
              <span
                className={`mx-auto mt-1 block h-[3px] rounded-full ${
                  status === "correct"
                    ? "w-full bg-ok"
                    : status === "wrong"
                      ? "w-full bg-miss"
                      : status === "skip"
                        ? "w-full bg-skip"
                        : current
                          ? "w-full bg-indigo"
                          : "w-0"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
