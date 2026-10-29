"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArtistPicker } from "@/components/ArtistPicker";
import { GameScreen } from "@/components/GameScreen";
import { Icon } from "@/components/Icon";
import { CountPicker, SetupLayout } from "@/components/SetupLayout";
import { randomSeed } from "@/lib/rng";
import { STAGES, formatPoints } from "@/lib/scoring";
import { loadArtists, loadRecord, saveArtists } from "@/lib/storage";
import { ArtistResult } from "@/lib/types";

const COUNTS: (number | null)[] = [5, 10, 20, null];

const recordKey = (count: number, artists: string[]) => `artista:${count}:${[...artists].sort().join("|")}`;

const listNames = (names: string[]) =>
  names.length <= 2 ? names.join(" y ") : `${names.slice(0, 2).join(", ")} y ${names.length - 2} más`;

interface Game {
  artists: string[];
  count: number | null;
  seed: string;
  rival: number | null;
}

export function ArtistaGame() {
  const params = useSearchParams();
  const router = useRouter();
  const [artists, setArtists] = useState<ArtistResult[]>(loadArtists);
  const [count, setCount] = useState<number | null>(10);
  const [onlyTheirSongs, setOnlyTheirSongs] = useState(true);
  const [game, setGame] = useState<Game | null>(null);

  const challenge = (() => {
    const seed = params.get("reto");
    const names = (params.get("a") ?? "").split("|").filter(Boolean).slice(0, 20);
    const n = Number(params.get("n"));
    if (!seed || names.length === 0 || !Number.isInteger(n) || n < 1 || n > 50) return null;
    const p = Number(params.get("p"));
    return { seed, artists: names, count: n, rival: Number.isFinite(p) && p > 0 ? p : null };
  })();

  const names = artists.map((a) => a.name);
  const namesKey = names.join("|");
  const record = useMemo(
    () => (count && namesKey ? loadRecord(recordKey(count, namesKey.split("|"))) : null),
    [count, namesKey]
  );

  if (game) {
    const challengeUrl =
      game.count === null || typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/artista?reto=${game.seed}&n=${game.count}&a=${encodeURIComponent(game.artists.join("|"))}`;
    return (
      <GameScreen
        key={game.seed}
        config={{ mode: "artista", source: { kind: "artists", artists: game.artists }, count: game.count, seed: game.seed }}
        stages={[...STAGES]}
        title={listNames(game.artists)}
        subtitle={game.count ? `${game.count} canciones` : "Sin límite"}
        searchLanguage="all"
        searchArtists={onlyTheirSongs || challenge ? game.artists : undefined}
        recordKey={game.count ? recordKey(game.count, game.artists) : undefined}
        summaryHeading={`Modo artista · ${listNames(game.artists)}`}
        challengeUrl={challengeUrl}
        rival={game.rival}
        againLabel="Jugar otra"
        onAgain={() => {
          if (challenge) router.replace("/artista");
          setGame({ ...game, seed: randomSeed(), rival: null });
        }}
      />
    );
  }

  if (challenge) {
    return (
      <SetupLayout
        title="Reto de artista"
        headline={
          challenge.rival ? (
            <>
              Supera <span className="text-indigo-soft">{formatPoints(challenge.rival)}</span> puntos
            </>
          ) : (
            "Te retaron"
          )
        }
        intro={<p>{challenge.count} canciones de {listNames(challenge.artists)}, las mismas que le tocaron a quien te retó.</p>}
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => router.replace("/artista")}>
              Elegir otros
            </button>
            <button type="button" className="btn btn-primary flex-1" onClick={() => setGame({ ...challenge })}>
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
  const canStart = artists.length > 0 && (count === null || totalSongs >= count);

  return (
    <SetupLayout
      title="Modo artista"
      headline={
        <>
          ¿Cuánto sabes
          <br />
          <span className="text-indigo-soft">de tu artista?</span>
        </>
      }
      intro={<p>Elige uno o varios y solo sonarán sus canciones. Ideal para retar a alguien que dice ser su fan.</p>}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className={`font-semibold ${artists.length && !canStart ? "text-miss" : "text-ink-2"}`}>
              {artists.length === 0
                ? "Elige al menos un artista"
                : !canStart
                  ? `Solo ${totalSongs} canciones: elige menos o agrega artistas`
                  : `${totalSongs} canciones de ${artists.length} artista${artists.length > 1 ? "s" : ""}`}
            </p>
            {count && artists.length > 0 && (
              <p className="mt-0.5 flex items-center gap-1.5 text-ink-3">
                <Icon name="crown" className="size-4 text-ember-soft" />
                {record ? `Tu récord: ${formatPoints(record.score)}` : "Aún sin récord con esta selección"}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => {
              saveArtists(artists);
              setGame({ artists: names, count, seed: randomSeed(), rival: null });
            }}
          >
            Empezar
            <Icon name="next" className="size-5" />
          </button>
        </div>
      }
    >
      <ArtistPicker value={artists} onChange={setArtists} />
      <div className="mt-8">
        <CountPicker value={count} options={COUNTS} onChange={setCount} />
      </div>
      <label className="mt-6 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={onlyTheirSongs}
          onChange={(e) => setOnlyTheirSongs(e.target.checked)}
          className="mt-1 size-4 accent-[var(--color-indigo)]"
        />
        <span>
          <span className="font-semibold">El buscador solo muestra sus canciones</span>
          <span className="block text-sm text-ink-3">Desactívalo si quieres que también tengas que descartar canciones de otros.</span>
        </span>
      </label>
    </SetupLayout>
  );
}
