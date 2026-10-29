"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { STAGES, formatPoints } from "@/lib/scoring";
import { HighScore, loadRecords, loadStats, resetStats, Stats } from "@/lib/storage";
import { ALL_DIFFICULTIES } from "@/lib/types";

const DIFF_LABEL = Object.fromEntries(ALL_DIFFICULTIES.map((d) => [d.id, d.label.toLowerCase()]));

function describeRecord(key: string) {
  const [mode, count, rest] = key.split(":");
  if (mode === "partida") {
    const diffs = (rest ?? "").split("-").map((d) => DIFF_LABEL[d] ?? d);
    return { title: `Partida de ${count}`, detail: diffs.join(", ") };
  }
  const names = (rest ?? "").split("|");
  return {
    title: `Artista · ${count} canciones`,
    detail: names.length > 2 ? `${names.slice(0, 2).join(", ")} y ${names.length - 2} más` : names.join(" y "),
  };
}

export function StatsView() {
  const [stats, setStats] = useState<Stats>(loadStats);
  const [records] = useState<[string, HighScore][]>(() =>
    Object.entries(loadRecords()).sort((a, b) => b[1].score - a[1].score)
  );

  const losses = stats.rounds - stats.wins;
  const maxBar = Math.max(1, ...stats.byStage, losses);
  const winRate = stats.rounds ? Math.round((stats.wins / stats.rounds) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-xl px-[var(--gutter)] pb-16">
      <header className="flex h-16 items-center gap-2">
        <Link href="/" className="icon-btn -ml-2" aria-label="Volver al inicio">
          <Icon name="back" className="size-6" />
        </Link>
        <p className="font-bold wide">Estadísticas</p>
      </header>

      {stats.rounds === 0 ? (
        <div className="mt-10">
          <h1 className="display text-6xl">Nada aún</h1>
          <p className="mt-4 text-ink-2">Juega unas cuantas canciones y aquí verás en qué pista sueles adivinarlas.</p>
          <Link href="/libre" className="btn btn-primary mt-8">
            Empezar a jugar
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [stats.rounds, "canciones"],
              [`${winRate}%`, "adivinadas"],
              [stats.bestFreeStreak, "mejor racha"],
              [stats.bestDailyStreak, "días seguidos"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-3xl bg-surface p-4">
                <p className="display text-4xl">{v}</p>
                <p className="mt-2 text-sm text-ink-3">{l}</p>
              </div>
            ))}
          </section>

          <section className="mt-10">
            <h2 className="text-xl">En qué pista aciertas</h2>
            <ul className="mt-4 space-y-2.5">
              {STAGES.map((s, i) => (
                <li key={s} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-3">
                  <span className="text-right font-bold tabular-nums wide">{s}s</span>
                  <span className="h-7 overflow-hidden rounded-lg bg-surface">
                    <span
                      className="block h-full rounded-lg bg-indigo"
                      style={{ width: `${(stats.byStage[i] / maxBar) * 100}%` }}
                    />
                  </span>
                  <span className="tabular-nums text-ink-2">{stats.byStage[i]}</span>
                </li>
              ))}
              <li className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-3">
                <span className="text-right font-bold wide text-ink-3">nunca</span>
                <span className="h-7 overflow-hidden rounded-lg bg-surface">
                  <span className="block h-full rounded-lg bg-line" style={{ width: `${(losses / maxBar) * 100}%` }} />
                </span>
                <span className="tabular-nums text-ink-2">{losses}</span>
              </li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-xl">Récords</h2>
            {records.length === 0 ? (
              <p className="mt-3 text-ink-3">Termina una partida o un modo artista para guardar tu primer récord.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line/50">
                {records.map(([key, r]) => {
                  const d = describeRecord(key);
                  return (
                    <li key={key} className="flex items-center justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="block font-semibold">{d.title}</span>
                        <span className="block truncate text-sm text-ink-3">{d.detail}</span>
                      </span>
                      <span className="text-lg font-extrabold tabular-nums wide">{formatPoints(r.score)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <button
            type="button"
            className="mt-10 text-sm font-semibold text-ink-3 hover:text-miss"
            onClick={() => {
              if (confirm("¿Borrar todas las estadísticas? Los récords se conservan.")) {
                resetStats();
                setStats(loadStats());
              }
            }}
          >
            Reiniciar estadísticas
          </button>
        </>
      )}
    </main>
  );
}
