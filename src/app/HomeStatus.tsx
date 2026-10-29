"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, IconName } from "@/components/Icon";
import { dayLabel, todayKey } from "@/lib/rng";
import { formatPoints } from "@/lib/scoring";
import { DailyResult, loadDaily, loadRecords, loadStats, Stats } from "@/lib/storage";

interface Snapshot {
  day: string;
  daily: DailyResult | null;
  stats: Stats;
  bestPartida: number | null;
  bestArtista: number | null;
}

const best = (prefix: string) => {
  const scores = Object.entries(loadRecords())
    .filter(([k]) => k.startsWith(prefix))
    .map(([, r]) => r.score);
  return scores.length ? Math.max(...scores) : null;
};

function useSnapshot() {
  const [snap] = useState<Snapshot>(() => {
    const day = todayKey();
    return {
      day,
      daily: loadDaily()[day] ?? null,
      stats: loadStats(),
      bestPartida: best("partida:"),
      bestArtista: best("artista:"),
    };
  });
  return snap;
}

function ModeCard({
  href,
  icon,
  title,
  text,
  meta,
  featured,
}: {
  href: string;
  icon: IconName;
  title: string;
  text: string;
  meta?: string | null;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[8.5rem] flex-col rounded-[24px] p-5 transition-[transform,background-color] duration-300 ease-[var(--ease-out-quint)] active:scale-[0.985] ${
        featured ? "bg-indigo-deep hover:bg-indigo" : "bg-surface hover:bg-surface-2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <Icon name={icon} className={`size-7 ${featured ? "text-ink" : "text-indigo-soft"}`} />
        {meta && (
          <span className={`text-sm font-semibold ${featured ? "text-ink/85" : "text-ember-soft"}`}>{meta}</span>
        )}
      </div>
      <p className="mt-auto pt-6 text-xl font-extrabold wide tracking-[-0.02em]">{title}</p>
      <p className={`mt-0.5 text-[0.95rem] leading-snug ${featured ? "text-ink/80" : "text-ink-3"}`}>{text}</p>
    </Link>
  );
}

/** The four ways to play, each with its own progress at a glance. */
export function ModeGrid() {
  const snap = useSnapshot();
  const { daily, stats } = snap;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ModeCard
        href="/diario"
        icon="calendar"
        title="Reto diario"
        text={daily ? "Vuelve mañana por otro." : "5 canciones, las mismas para todos hoy."}
        meta={daily ? `Hecho · ${formatPoints(daily.score)}` : stats.dailyStreak > 0 ? `Racha ${stats.dailyStreak}` : dayLabel(snap.day)}
        featured
      />
      <ModeCard
        href="/partida"
        icon="stopwatch"
        title="Partida"
        text="5 canciones con tus filtros. Más rápido, más puntos."
        meta={snap.bestPartida ? `Récord ${formatPoints(snap.bestPartida)}` : null}
      />
      <ModeCard
        href="/artista"
        icon="mic"
        title="Modo artista"
        text="5 canciones de los artistas que elijas."
        meta={snap.bestArtista ? `Récord ${formatPoints(snap.bestArtista)}` : null}
      />
      <ModeCard
        href="/libre"
        icon="shuffle"
        title="Libre"
        text="Sin fin y sin puntos, para practicar."
        meta={stats.bestFreeStreak > 0 ? `Mejor racha ${stats.bestFreeStreak}` : null}
      />
    </div>
  );
}

export function ModeGridFallback() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
      <div className="h-[8.5rem] rounded-[24px] bg-indigo-deep" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[8.5rem] rounded-[24px] bg-surface" />
      ))}
    </div>
  );
}
