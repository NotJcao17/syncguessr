"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FilterPanel, MIN_SONGS, SongCount } from "@/components/FilterPanel";
import { GameScreen } from "@/components/GameScreen";
import { Icon } from "@/components/Icon";
import { SetupLayout } from "@/components/SetupLayout";
import { useCatalog } from "@/hooks/useCatalog";
import { countSongs, decodeFilters, encodeFilters, summarizeFilters } from "@/lib/filters";
import { randomSeed } from "@/lib/rng";
import { GAME_LENGTH, STAGES, formatPoints } from "@/lib/scoring";
import { loadFilters, loadRecord, saveFilters } from "@/lib/storage";
import { Filters } from "@/lib/types";

/** High scores are kept per difficulty mix, so an easy game can't overwrite a hard one. */
export const partidaRecordKey = (f: Filters) => `partida:${GAME_LENGTH}:${[...f.difficulties].sort().join("-")}`;

interface Game {
  filters: Filters;
  seed: string;
  rival: number | null;
  /** Challenges replay exactly the sender's songs, so they never skip recently heard ones. */
  challenge: boolean;
}

export function PartidaGame() {
  const params = useSearchParams();
  const router = useRouter();
  const catalog = useCatalog();
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [game, setGame] = useState<Game | null>(null);

  // A challenge link carries the seed, the filters and optionally the score to beat.
  const challenge = (() => {
    const seed = params.get("reto");
    const f = decodeFilters(params.get("f"));
    if (!seed || !f) return null;
    const p = Number(params.get("p"));
    return { seed, filters: f, rival: Number.isFinite(p) && p > 0 ? p : null };
  })();

  const record = useMemo(() => loadRecord(partidaRecordKey(filters)), [filters]);

  const leaveChallenge = () => {
    if (challenge) router.replace("/partida");
  };

  if (game) {
    const challengeUrl =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/partida?reto=${game.seed}&f=${encodeFilters(game.filters)}`;
    return (
      <GameScreen
        key={game.seed}
        config={{
          mode: "partida",
          source: { kind: "filters", filters: game.filters },
          count: GAME_LENGTH,
          seed: game.seed,
          avoidRepeats: !game.challenge,
        }}
        stages={[...STAGES]}
        title="Partida"
        subtitle={summarizeFilters(game.filters)}
        searchLanguage={game.filters.language}
        recordKey={partidaRecordKey(game.filters)}
        summaryHeading={game.rival ? "Reto aceptado" : "Partida"}
        challengeUrl={challengeUrl}
        rival={game.rival}
        onAgain={() => {
          leaveChallenge();
          setGame({ ...game, seed: randomSeed(), rival: null, challenge: false });
        }}
        onExit={() => {
          leaveChallenge();
          setFilters(game.filters);
          setGame(null);
        }}
        exitLabel="Cambiar filtros"
      />
    );
  }

  if (challenge) {
    return (
      <SetupLayout
        title={
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
            Las mismas {GAME_LENGTH} canciones que jugó quien te mandó el enlace: {summarizeFilters(challenge.filters)}.
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
              onClick={() => setGame({ ...challenge, challenge: true })}
            >
              Aceptar reto
              <Icon name="next" className="size-5" />
            </button>
          </div>
        }
      >
        <p className="text-sm text-ink-3">Los puntos dependen de en qué pista la adivines.</p>
      </SetupLayout>
    );
  }

  const available = catalog ? countSongs(catalog.facets, filters) : null;
  const canStart = available === null || available >= MIN_SONGS;

  return (
    <SetupLayout
      title="Partida"
      intro={<p>{GAME_LENGTH} canciones. Mil puntos si la sacas en 0.1 segundos; los aciertos seguidos multiplican.</p>}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <SongCount facets={catalog?.facets ?? null} filters={filters} />
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-3">
              <Icon name="crown" className="size-4 shrink-0 text-ember-soft" />
              {record ? `Récord: ${formatPoints(record.score)}` : "Sin récord con esta dificultad"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => {
              saveFilters(filters);
              setGame({ filters, seed: randomSeed(), rival: null, challenge: false });
            }}
          >
            Empezar
            <Icon name="next" className="size-5" />
          </button>
        </div>
      }
    >
      <FilterPanel value={filters} onChange={setFilters} facets={catalog?.facets ?? null} />
    </SetupLayout>
  );
}
