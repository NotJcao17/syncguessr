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
import { ArtistResult, HITS_PER_ARTIST, hitsFor, MIN_HIT_SONGS } from "@/lib/types";

const recordKey = (artists: string[], hits: boolean) =>
  `artista:${GAME_LENGTH}:${[...artists].sort().join("|")}${hits ? ":hits" : ""}`;

const listNames = (names: string[]) =>
  names.length <= 2 ? names.join(" y ") : `${names.slice(0, 2).join(", ")} y ${names.length - 2} más`;

interface Game {
  artists: string[];
  hits: boolean;
  seed: string;
  rival: number | null;
  challenge: boolean;
}

export function ArtistaGame() {
  const params = useSearchParams();
  const router = useRouter();
  const [artists, setArtists] = useState<ArtistResult[]>(loadArtists);
  // Off whenever the screen opens; a challenge link still carries its own setting.
  const [hitsOnly, setHitsOnly] = useState(false);
  const [game, setGame] = useState<Game | null>(null);

  const challenge = (() => {
    const seed = params.get("reto");
    const names = (params.get("a") ?? "").split("|").filter(Boolean).slice(0, 20);
    if (!seed || names.length === 0) return null;
    const p = Number(params.get("p"));
    return { seed, artists: names, hits: params.get("h") === "1", rival: Number.isFinite(p) && p > 0 ? p : null };
  })();

  const names = artists.map((a) => a.name);
  const namesKey = names.join("|");
  const record = useMemo(
    () => (namesKey ? loadRecord(recordKey(namesKey.split("|"), hitsOnly)) : null),
    [namesKey, hitsOnly]
  );

  const leaveChallenge = () => {
    if (challenge) router.replace("/artista");
  };

  if (game) {
    const challengeUrl =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/artista?reto=${game.seed}&a=${encodeURIComponent(game.artists.join("|"))}${game.hits ? "&h=1" : ""}`;
    return (
      <GameScreen
        key={game.seed}
        config={{
          mode: "artista",
          source: { kind: "artists", artists: game.artists, hits: game.hits },
          count: GAME_LENGTH,
          seed: game.seed,
          avoidRepeats: !game.challenge,
        }}
        stages={[...STAGES]}
        title={listNames(game.artists)}
        subtitle={game.hits ? "Modo artista · Solo hits" : "Modo artista"}
        searchLanguage="all"
        // The player already knows who sings, so the search only lists the chosen artists' songs.
        searchArtists={game.artists}
        recordKey={recordKey(game.artists, game.hits)}
        summaryHeading={`${game.hits ? "Solo hits" : "Modo artista"} · ${listNames(game.artists)}`}
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
        intro={
          <p>
            {GAME_LENGTH} {challenge.hits ? "éxitos" : "canciones"} de {listNames(challenge.artists)}, las mismas que le tocaron a
            quien te retó.
          </p>
        }
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

  const totalSongs = artists.reduce((s, a) => s + (hitsOnly ? hitsFor(a.songs) : a.songs), 0);
  const minSongs = hitsOnly ? MIN_HIT_SONGS : GAME_LENGTH;
  const canStart = artists.length > 0 && totalSongs >= minSongs;

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
                  ? hitsOnly
                    ? `${totalSongs} éxitos: agrega artistas hasta llegar a ${minSongs}`
                    : `Solo ${totalSongs} canciones: agrega otro artista`
                  : `${totalSongs} ${hitsOnly ? "éxitos" : "canciones"} de ${artists.length} artista${artists.length > 1 ? "s" : ""}`}
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
              setGame({ artists: names, hits: hitsOnly, seed: randomSeed(), rival: null, challenge: false });
            }}
          >
            Empezar
            <Icon name="next" className="size-5" />
          </button>
        </div>
      }
    >
      <button
        type="button"
        role="switch"
        aria-checked={hitsOnly}
        onClick={() => setHitsOnly(!hitsOnly)}
        className="mb-6 flex w-full items-center gap-4 rounded-2xl bg-surface p-4 text-left"
      >
        <Icon name="star" className="size-6 shrink-0 text-indigo-soft" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold wide">Solo hits</span>
          <span className="block text-sm text-ink-3">
            Solo las {HITS_PER_ARTIST} canciones más conocidas de cada artista. Para jugar con muchos artistas sin toparte con
            sus canciones de nicho.
          </span>
        </span>
        <span className="switch" aria-hidden="true" />
      </button>
      <ArtistPicker value={artists} onChange={setArtists} hitsOnly={hitsOnly} />
    </SetupLayout>
  );
}
