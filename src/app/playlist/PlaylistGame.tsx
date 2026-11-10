"use client";

import { FormEvent, useState } from "react";
import { GameScreen } from "@/components/GameScreen";
import { Icon } from "@/components/Icon";
import { SetupLayout } from "@/components/SetupLayout";
import { GAME_LENGTH, STAGES } from "@/lib/scoring";
import { loadRecentPlaylists, RecentPlaylist, removeRecentPlaylist, saveRecentPlaylist } from "@/lib/storage";
import { PlaylistInfo, PlaylistSource } from "@/lib/types";

const SOURCE_LABEL: Record<PlaylistSource, string> = {
  spotify: "Spotify",
  syncora: "Syncora Player",
  deezer: "Deezer",
};

const songsLabel = (n: number) => `${n} ${n === 1 ? "canción" : "canciones"}`;

function Cover({ src, className }: { src: string; className: string }) {
  if (!src) {
    return (
      <span className={`grid place-items-center bg-surface-2 text-indigo-soft ${className}`}>
        <Icon name="notes" className="size-1/2" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" referrerPolicy="no-referrer" className={`bg-surface-2 object-cover ${className}`} />;
}

export function PlaylistGame() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [recent, setRecent] = useState<RecentPlaylist[]>(loadRecentPlaylists);
  const [game, setGame] = useState<number | null>(null);
  // Songs already heard, per playlist, for as long as the page is open: the next game starts with the rest.
  const [playedByPlaylist] = useState(() => new Map<string, Set<number>>());

  const load = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || loading) return;
    setLoading(trimmed);
    setError(null);
    try {
      const res = await fetch("/api/playlist/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la playlist.");
        return;
      }
      const info = data as PlaylistInfo;
      setPlaylist(info);
      setLink("");
      saveRecentPlaylist(info);
      setRecent(loadRecentPlaylists());
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setLoading(null);
    }
  };

  if (playlist && game !== null) {
    const key = `${playlist.source}:${playlist.id}`;
    let played = playedByPlaylist.get(key);
    if (!played) {
      played = new Set<number>();
      playedByPlaylist.set(key, played);
    }
    return (
      <GameScreen
        key={game}
        config={{ mode: "playlist", count: GAME_LENGTH, playlist: { data: playlist.data, played } }}
        stages={[...STAGES]}
        title={playlist.name}
        subtitle={`${SOURCE_LABEL[playlist.source]} · ${songsLabel(GAME_LENGTH)}`}
        searchLanguage="all"
        searchSource="deezer"
        summaryHeading={playlist.name}
        onAgain={() => setGame((g) => (g ?? 0) + 1)}
        onExit={() => setGame(null)}
        exitLabel="Cambiar playlist"
      />
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void load(link);
  };

  const others = recent.filter((r) => !(playlist && r.source === playlist.source && r.id === playlist.id));

  return (
    <SetupLayout
      title="Tu playlist"
      intro={
        <p>
          Pega el enlace de una playlist pública de Spotify, Syncora Player o Deezer y adivina sus canciones. Para
          responder buscas en todo Deezer, no solo en la playlist.
        </p>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-ink-3">
            {playlist ? `${songsLabel(GAME_LENGTH)} de ${playlist.name}` : "Primero carga una playlist"}
          </p>
          <button type="button" className="btn btn-primary" disabled={!playlist} onClick={() => setGame((g) => (g ?? 0) + 1)}>
            Empezar
            <Icon name="next" className="size-5" />
          </button>
        </div>
      }
    >
      {playlist ? (
        <div className="flex items-center gap-4 rounded-[24px] bg-surface p-4">
          <Cover src={playlist.cover} className="size-20 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold wide tracking-[-0.02em]">{playlist.name}</p>
            <p className="mt-0.5 text-sm text-ink-3">
              {SOURCE_LABEL[playlist.source]} · {songsLabel(playlist.count)}
            </p>
          </div>
          <button type="button" className="icon-btn shrink-0" aria-label="Quitar playlist" onClick={() => setPlaylist(null)}>
            <Icon name="close" className="size-6" />
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="playlist-link" className="eyebrow">
            Enlace de la playlist
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3">
              <Icon name="link" className="size-5" />
            </span>
            <input
              id="playlist-link"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://open.spotify.com/playlist/…"
              className="field"
              value={link}
              disabled={!!loading}
              onChange={(e) => {
                setLink(e.target.value);
                setError(null);
              }}
            />
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-miss">{error}</p>}
          <button type="submit" className="btn btn-light mt-4 w-full" disabled={!link.trim() || !!loading}>
            {loading && loading === link.trim() ? "Cargando playlist…" : "Cargar playlist"}
          </button>
        </form>
      )}

      {playlist && (
        <p className="mt-4 text-sm text-ink-3">
          {GAME_LENGTH} canciones por partida, con los mismos puntos que en Partida. No se repiten hasta que suenen
          todas las de la playlist.
        </p>
      )}

      {others.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow">Recientes</h2>
          <ul className="mt-2 grid gap-1">
            {others.map((r) => (
              <li key={`${r.source}:${r.id}`} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => void load(r.url)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-surface disabled:opacity-60"
                >
                  <Cover src={r.cover} className="size-12 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className="block truncate text-sm text-ink-3">
                      {loading === r.url ? "Cargando…" : `${SOURCE_LABEL[r.source]} · ${songsLabel(r.count)}`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-btn shrink-0"
                  aria-label={`Quitar ${r.name} de recientes`}
                  onClick={() => {
                    removeRecentPlaylist(r);
                    setRecent(loadRecentPlaylists());
                  }}
                >
                  <Icon name="trash" className="size-5" />
                </button>
              </li>
            ))}
          </ul>
          {playlist && error && <p className="mt-3 text-sm font-semibold text-miss">{error}</p>}
        </section>
      )}
    </SetupLayout>
  );
}
