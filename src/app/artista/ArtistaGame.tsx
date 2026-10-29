"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArtistPicker } from "@/components/ArtistPicker";
import { GameScreen } from "@/components/GameScreen";
import { Icon } from "@/components/Icon";
import { SetupLayout } from "@/components/SetupLayout";
import { randomSeed } from "@/lib/rng";
import { GAME_LENGTH, STAGES, formatPoints } from "@/lib/scoring";
import { loadArtists, loadRecord, saveArtists } from "@/lib/storage";
import { ArtistResult } from "@/lib/types";

const recordKey = (artists: string[]) => `artista:${GAME_LENGTH}:${[...artists].sort().join("|")}`;

const listNames = (names: string[]) =>
  names.length <= 2 ? names.join(" y ") : `${names.slice(0, 2).join(", ")} y ${names.length - 2} más`;

interface Game {
  artists: string[];
  seed: string;
  rival: number | null;
  challenge: boolean;
}

export function ArtistaGame() {
  const params = useSearchParams();
  const router = useRouter();
  const [artists, setArtists] = useState<ArtistResult[]>(loadArtists);
  const [game, setGame] = useState<Game | null>(null);

  const challenge = (() => {
    const seed = params.get("reto");
    const names = (params.get("a") ?? "").split("|").filter(Boolean).slice(0, 20);
    if (!seed || names.length === 0) return null;
    const p = Number(params.get("p"));
    return { seed, artists: names, rival: Number.isFinite(p) && p > 0 ? p : null };
  })();

  const names = artists.map((a) => a.name);
  const namesKey = names.join("|");
  const record = useMemo(() => (namesKey ? loadRecord(recordKey(namesKey.split("|"))) : null), [namesKey]);

  const leaveChallenge = () => {
    if (challenge) router.replace("/artista");
  };

  if (game) {
    const challengeUrl =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/artista?reto=${game.seed}&a=${encodeURIComponent(game.artists.join("|"))}`;
    return (
      <GameScreen
        key={game.seed}
        config={{
          mode: "artista",
          source: { kind: "artists", artists: game.artists },
          count: GAME_LENGTH,
          seed: game.seed,
          avoidRepeats: !game.challenge,
        }}
        stages={[...STAGES]}
        title={listNames(game.artists)}
        subtitle="Modo artista"
        searchLanguage="all"
        // The player already knows who sings, so the search only lists the chosen artists' songs.
        searchArtists={game.artists}
        recordKey={recordKey(game.artists)}
        summaryHeading={`Modo artista · ${listNames(game.artists)}`}
        challengeUrl={challengeUrl}
        rival={game.rival}
        onAgain={() => {
          leaveChallenge();
          setGame({ ...game, seed: randomSeed(), rival: null, challenge: false });
        }}
        onExit={() => {
          leaveChallenge();
          setGame(null);
        }}
        exitLabel="Cambiar artistas"
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
        intro={<p>{GAME_LENGTH} canciones de {listNames(challenge.artists)}, las mismas que le tocaron a quien te retó.</p>}
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => router.replace("/artista")}>
              Elegir otros
            </button>
            <button type="button" className="btn btn-primary flex-1" onClick={() => setGame({ ...challenge, challenge: true })}>
              Aceptar reto
              <Icon name="next" className="size-5" />
            </button>
          </div>
        }
      >
        {null}
      </SetupLayout>
    );
  }

  const totalSongs = artists.reduce((s, a) => s + a.songs, 0);
  const canStart = artists.length > 0 && totalSongs >= GAME_LENGTH;

  return (
    <SetupLayout
      title="Modo artista"
      intro={<p>Elige uno o varios artistas y adivina {GAME_LENGTH} de sus canciones.</p>}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            <p className={`font-semibold ${artists.length && !canStart ? "text-miss" : "text-ink-2"}`}>
              {artists.length === 0
                ? "Elige al menos un artista"
                : !canStart
                  ? `Solo ${totalSongs} canciones: agrega otro artista`
                  : `${totalSongs} canciones de ${artists.length} artista${artists.length > 1 ? "s" : ""}`}
            </p>
            {artists.length > 0 && (
              <p className="mt-0.5 flex items-center gap-1.5 text-ink-3">
                <Icon name="crown" className="size-4 shrink-0 text-ember-soft" />
                {record ? `Récord: ${formatPoints(record.score)}` : "Sin récord con esta selección"}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => {
              saveArtists(artists);
              setGame({ artists: names, seed: randomSeed(), rival: null, challenge: false });
            }}
          >
            Empezar
            <Icon name="next" className="size-5" />
          </button>
        </div>
      }
    >
      <ArtistPicker value={artists} onChange={setArtists} />
    </SetupLayout>
  );
}
