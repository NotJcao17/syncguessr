"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FilterPanel, MIN_SONGS, SongCount } from "@/components/FilterPanel";
import { GameScreen } from "@/components/GameScreen";
import { Icon } from "@/components/Icon";
import { CountPicker, SetupLayout } from "@/components/SetupLayout";
import { useCatalog } from "@/hooks/useCatalog";
import { countSongs, decodeFilters, encodeFilters, summarizeFilters } from "@/lib/filters";
import { randomSeed } from "@/lib/rng";
import { STAGES, formatPoints } from "@/lib/scoring";
import { loadFilters, loadRecord, saveFilters } from "@/lib/storage";
import { Filters } from "@/lib/types";

const COUNTS = [5, 10, 15];

/** High scores are kept per length and difficulty mix, so an easy game can't overwrite a hard one. */
export const partidaRecordKey = (count: number, f: Filters) =>
  `partida:${count}:${[...f.difficulties].sort().join("-")}`;

interface Game {
  filters: Filters;
  count: number;
  seed: string;
  rival: number | null;
}

export function PartidaGame() {
  const params = useSearchParams();
  const router = useRouter();
  const catalog = useCatalog();
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [count, setCount] = useState(5);
  const [game, setGame] = useState<Game | null>(null);

  // A challenge link carries the seed, the filters and optionally the score to beat.
  const challenge = (() => {
    const seed = params.get("reto");
    const f = decodeFilters(params.get("f"));
    const n = Number(params.get("n"));
    if (!seed || !f || !COUNTS.concat([20]).includes(n)) return null;
    const p = Number(params.get("p"));
    return { seed, filters: f, count: n, rival: Number.isFinite(p) && p > 0 ? p : null };
  })();

  const record = useMemo(() => loadRecord(partidaRecordKey(count, filters)), [count, filters]);

  if (game) {
    const challengeUrl =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/partida?reto=${game.seed}&n=${game.count}&f=${encodeFilters(game.filters)}`;
    return (
      <GameScreen
        key={game.seed}
        config={{ mode: "partida", source: { kind: "filters", filters: game.filters }, count: game.count, seed: game.seed }}
        stages={[...STAGES]}
        title={`Partida de ${game.count}`}
        subtitle={summarizeFilters(game.filters)}
        searchLanguage={game.filters.language}
        recordKey={partidaRecordKey(game.count, game.filters)}
        summaryHeading={game.rival ? "Reto aceptado" : `Partida de ${game.count} canciones`}
        challengeUrl={challengeUrl}
        rival={game.rival}
        againLabel="Jugar otra"
        onAgain={() => {
          if (challenge) router.replace("/partida");
          setGame({ ...game, seed: randomSeed(), rival: null });
        }}
      />
    );
  }

  if (challenge) {
    return (
      <SetupLayout
        title="Reto"
        headline={
          challenge.rival ? (
            <>
              Supera <span className="text-indigo-soft">{formatPoints(challenge.rival)}</span> puntos
            </>
          ) : (
            "Te retaron"
          )
        }
        intro={
          <p>
            Las mismas {challenge.count} canciones que jugó quien te mandó el enlace: {summarizeFilters(challenge.filters)}.
          </p>
        }
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => router.replace("/partida")}>
              Otra partida
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={() => setGame({ ...challenge })}
            >
              Aceptar reto
              <Icon name="next" className="size-5" />
            </button>
          </div>
        }
      >
        <p className="text-sm text-ink-3">Los puntos dependen de en qué pista la adivines. Pulsa el signo de ayuda durante la partida para ver la tabla.</p>
      </SetupLayout>
    );
  }

  const available = catalog ? countSongs(catalog.facets, filters) : null;
  const canStart = available === null || available >= Math.max(count, MIN_SONGS);

  return (
    <SetupLayout
      title="Partida"
      headline={
        <>
          {count} canciones,
          <br />
          <span className="text-indigo-soft">contra el reloj</span>
        </>
      }
      intro={
        <p>
          Mil puntos si la sacas con 0.1 segundos, doscientos si necesitas los quince. Los aciertos seguidos multiplican.
        </p>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SongCount facets={catalog?.facets ?? null} filters={filters} min={Math.max(count, MIN_SONGS)} />
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-3">
              <Icon name="crown" className="size-4 text-ember-soft" />
              {record ? `Tu récord aquí: ${formatPoints(record.score)}` : "Aún sin récord con esta dificultad"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => {
              saveFilters(filters);
              setGame({ filters, count, seed: randomSeed(), rival: null });
            }}
          >
            Empezar
            <Icon name="next" className="size-5" />
          </button>
        </div>
      }
    >
      <CountPicker value={count} options={COUNTS} onChange={(n) => setCount(n ?? 5)} />
      <div className="mt-6">
        <FilterPanel value={filters} onChange={setFilters} facets={catalog?.facets ?? null} />
      </div>
    </SetupLayout>
  );
}
