"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { GameScreen } from "@/components/GameScreen";
import { Icon } from "@/components/Icon";
import { DAILY_FILTERS } from "@/lib/filters";
import { dayLabel as dailyLabel, todayKey } from "@/lib/rng";
import { GAME_LENGTH, STAGES, formatPoints } from "@/lib/scoring";
import { resultGrid, shareOrCopy, shareText } from "@/lib/share";
import { DailyResult, loadDaily, loadStats, saveDaily } from "@/lib/storage";

const DAILY_COUNT = GAME_LENGTH;


function untilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const mins = Math.ceil((midnight.getTime() - now.getTime()) / 60000);
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h} h ${mins % 60} min` : `${mins} min`;
}

export function DiarioGame() {
  const [day] = useState(todayKey);
  const [done] = useState<DailyResult | null>(() => loadDaily()[day] ?? null);
  const [streak, setStreak] = useState(() => loadStats().dailyStreak);
  const [copied, setCopied] = useState(false);

  const onFinished = useCallback(
    (outcomes: { won: boolean; stage: number }[], score: number) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      saveDaily(day, { score, stages: outcomes.map((o) => (o.won ? o.stage : null)) }, todayKey(yesterday));
      setStreak(loadStats().dailyStreak);
    },
    [day]
  );

  if (!done) {
    return (
      <GameScreen
        config={{ mode: "diario", source: { kind: "filters", filters: DAILY_FILTERS }, count: DAILY_COUNT, seed: `diario-${day}` }}
        stages={[...STAGES]}
        title="Reto diario"
        subtitle={dailyLabel(day)}
        searchLanguage="all"
        summaryHeading={`Reto diario · ${dailyLabel(day)}`}
        onFinished={onFinished}
      />
    );
  }

  const share = async () => {
    const r = await shareOrCopy(
      shareText({ heading: `Reto diario · ${dailyLabel(day)}`, score: done.score, stages: done.stages, url: `${location.origin}/diario` })
    );
    if (r === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-16">
      <header className="flex h-16 items-center gap-2">
        <Link href="/" className="icon-btn -ml-2" aria-label="Volver al inicio">
          <Icon name="back" className="size-6" />
        </Link>
        <p className="font-bold wide">Reto diario</p>
      </header>
      <p className="eyebrow mt-6">{dailyLabel(day)} · ya jugado</p>
      <p className="display mt-3 text-[clamp(4.5rem,22vw,8.5rem)]">{formatPoints(done.score)}</p>
      <p className="mt-2 text-lg font-bold wide text-ink-2">
        puntos · {done.stages.filter((s) => s !== null).length} de {done.stages.length}
      </p>

      <pre className="mt-8 rounded-3xl bg-surface p-5 font-sans text-lg leading-relaxed tracking-wider text-ink-2">
        {resultGrid(done.stages)}
      </pre>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-surface p-5">
          <p className="display text-5xl">{streak}</p>
          <p className="mt-2 text-sm text-ink-3">día{streak === 1 ? "" : "s"} seguidos</p>
        </div>
        <div className="rounded-3xl bg-surface p-5">
          <p className="display text-3xl leading-none">{untilMidnight()}</p>
          <p className="mt-2 text-sm text-ink-3">para el siguiente reto</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={share} className="btn btn-primary">
          <Icon name="share" className="size-5" />
          {copied ? "Copiado" : "Compartir resultado"}
        </button>
        <Link href="/partida" className="btn btn-ghost">
          Jugar una partida
        </Link>
      </div>
    </main>
  );
}
