"use client";

import Link from "next/link";
import { useState } from "react";
import type { ScoredOutcome } from "@/hooks/useGameSession";
import { STAGES, formatPoints } from "@/lib/scoring";
import { shareOrCopy, shareText } from "@/lib/share";
import type { HighScore } from "@/lib/storage";
import { Icon } from "./Icon";

export function GameSummary({
  heading,
  outcomes,
  score,
  record,
  isRecord,
  challengeUrl,
  rival,
  onAgain,
  againLabel,
}: {
  heading: string;
  outcomes: ScoredOutcome[];
  score: number;
  /** Best score before this game. */
  record: HighScore | null;
  isRecord: boolean;
  /** Link that replays exactly these songs. */
  challengeUrl?: string;
  /** Score the player was challenged to beat. */
  rival?: number | null;
  onAgain?: () => void;
  againLabel?: string;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const stages = outcomes.map((o) => (o.won ? o.stage : null));
  const solved = stages.filter((s) => s !== null).length;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const share = async () => {
    const r = await shareOrCopy(shareText({ heading, score, stages, url: challengeUrl }));
    if (r === "copied") flash("Resultado copiado");
    else if (r === "failed") flash("No se pudo copiar");
  };

  const challenge = async () => {
    if (!challengeUrl) return;
    const url = `${challengeUrl}&p=${score}`;
    const r = await shareOrCopy(`Te reto en syncguessr: ${formatPoints(score)} pts con estas ${outcomes.length} canciones.\n${url}`);
    if (r === "copied") flash("Enlace del reto copiado");
    else if (r === "failed") flash("No se pudo copiar");
  };

  return (
    <section className="animate-rise">
      <p className="eyebrow">{heading}</p>
      <p className="display mt-3 text-[clamp(4.5rem,22vw,8.5rem)]">{formatPoints(score)}</p>
      <p className="mt-2 text-lg font-bold wide text-ink-2">
        puntos · {solved} de {outcomes.length} canciones
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {isRecord ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-ember px-3.5 py-1.5 text-sm font-bold">
            <Icon name="crown" className="size-4" />
            Nuevo récord{record ? `, antes ${formatPoints(record.score)}` : ""}
          </span>
        ) : record ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-ink/6 px-3.5 py-1.5 text-sm font-semibold text-ink-2">
            <Icon name="crown" className="size-4 text-ember-soft" />
            Récord {formatPoints(record.score)}
          </span>
        ) : null}
        {rival != null && (
          <span
            className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-bold ${
              score > rival ? "bg-ok/15 text-ok" : score === rival ? "bg-ink/6 text-ink-2" : "bg-miss/15 text-miss"
            }`}
          >
            {score > rival ? "Superaste el reto" : score === rival ? "Empate con el reto" : "No superaste el reto"} de{" "}
            {formatPoints(rival)}
          </span>
        )}
      </div>

      <ol className="mt-8 divide-y divide-line/50">
        {outcomes.map((o, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            {o.track ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.track.cover} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="size-12 shrink-0 rounded-xl bg-surface" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{o.track?.title ?? "Canción"}</p>
              <p className="truncate text-sm text-ink-3">{o.track?.artist}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold wide ${o.won ? "text-ok" : "text-miss"}`}>
                {o.won ? `${STAGES[o.stage]}s` : o.artistStage !== null ? "artista" : "fallada"}
              </p>
              <p className="text-sm tabular-nums text-ink-3">+{formatPoints(o.points)}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {onAgain && (
          <button type="button" onClick={onAgain} className="btn btn-light sm:col-span-2">
            <Icon name="restart" className="size-5" />
            {againLabel ?? "Jugar otra"}
          </button>
        )}
        {challengeUrl && (
          <button type="button" onClick={challenge} className="btn btn-primary">
            <Icon name="users" className="size-5" />
            Retar a alguien
          </button>
        )}
        <button type="button" onClick={share} className="btn btn-ghost">
          <Icon name="share" className="size-5" />
          Compartir resultado
        </button>
        <Link href="/" className="btn btn-ghost sm:col-span-2">
          <Icon name="home" className="size-5" />
          Inicio
        </Link>
      </div>

      <div
        role="status"
        className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center transition-opacity ${toast ? "opacity-100" : "opacity-0"}`}
      >
        <span className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-night">{toast}</span>
      </div>
    </section>
  );
}
