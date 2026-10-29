"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, IconName } from "@/components/Icon";
import { dayLabel as dailyLabel, todayKey } from "@/lib/rng";
import { formatPoints } from "@/lib/scoring";
import { DailyResult, loadDaily, loadRecords, loadStats, Stats } from "@/lib/storage";

interface Snapshot {
  day: string;
  daily: DailyResult | null;
  stats: Stats;
  bestPartida: number | null;
}

function useSnapshot() {
  const [snap] = useState<Snapshot | null>(() => {
    if (typeof window === "undefined") return null;
    const day = todayKey();
    const partidas = Object.entries(loadRecords()).filter(([k]) => k.startsWith("partida:"));
    return {
      day,
      daily: loadDaily()[day] ?? null,
      stats: loadStats(),
      bestPartida: partidas.length ? Math.max(...partidas.map(([, r]) => r.score)) : null,
    };
  });
  return snap;
}

export function DailyCard() {
  const snap = useSnapshot();
  const done = snap?.daily;
  return (
    <Link
      href="/diario"
      className="group relative block overflow-hidden rounded-[28px] bg-indigo-deep p-6 transition-transform duration-300 ease-[var(--ease-out-quint)] active:scale-[0.99] sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-soft wide">
            Reto diario{snap ? ` · ${dailyLabel(snap.day)}` : ""}
          </p>
          <p className="mt-2 text-[1.7rem] leading-tight font-extrabold wide tracking-[-0.03em] sm:text-3xl">
            {done ? `Hecho: ${formatPoints(done.score)} puntos` : "5 canciones, las mismas para todos"}
          </p>
          <p className="mt-2 text-ink/75">
            {done
              ? `Racha de ${snap!.stats.dailyStreak} día${snap!.stats.dailyStreak === 1 ? "" : "s"}. Vuelve mañana por otro.`
              : snap && snap.stats.dailyStreak > 0 && snap.stats.lastDaily
                ? `Llevas ${snap.stats.dailyStreak} día${snap.stats.dailyStreak === 1 ? "" : "s"} seguidos. No la rompas.`
                : "Compara tu resultado con tus amigos."}
          </p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-indigo-deep transition-transform duration-300 group-hover:translate-x-1">
          <Icon name={done ? "chart" : "next"} className="size-6" />
        </span>
      </div>
    </Link>
  );
}

function ModeRow({ href, icon, title, text, meta }: { href: string; icon: IconName; title: string; text: string; meta?: string | null }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 py-5 transition-colors">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface text-indigo-soft transition-colors group-hover:bg-surface-2">
          <Icon name={icon} className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-xl font-extrabold wide tracking-[-0.02em]">{title}</span>
            {meta && <span className="text-sm font-semibold text-ember-soft">{meta}</span>}
          </span>
          <span className="mt-0.5 block text-ink-3">{text}</span>
        </span>
        <Icon name="next" className="size-5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
      </Link>
    </li>
  );
}

export function ModeList() {
  const snap = useSnapshot();
  return (
    <ul className="divide-y divide-line/50">
      <ModeRow
        href="/partida"
        icon="stopwatch"
        title="Partida"
        text="5, 10 o 15 canciones con tus filtros. Más rápido, más puntos."
        meta={snap?.bestPartida ? `Récord ${formatPoints(snap.bestPartida)}` : null}
      />
      <ModeRow
        href="/artista"
        icon="mic"
        title="Modo artista"
        text="Solo canciones de los artistas que elijas."
      />
      <ModeRow
        href="/libre"
        icon="shuffle"
        title="Libre"
        text="Sin fin y sin puntos. Para practicar o descubrir."
        meta={snap && snap.stats.bestFreeStreak > 0 ? `Mejor racha ${snap.stats.bestFreeStreak}` : null}
      />
    </ul>
  );
}
