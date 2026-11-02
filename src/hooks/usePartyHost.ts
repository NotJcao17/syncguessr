"use client";

import type { DataConnection, Peer } from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/lib/audioEngine";
import {
  cleanName,
  GuestMessage,
  HOST_ID,
  HostMessage,
  MAX_PLAYERS,
  PartyPlayer,
  PartyState,
  peerIdFor,
  randomCode,
} from "@/lib/party";
import { randomSeed } from "@/lib/rng";
import { ARTIST_SHARE, STAGE_POINTS, STAGES } from "@/lib/scoring";
import { LanguageFilter, RevealedTrack, RoundTicket, SearchResultItem, Source, VerifyResponse } from "@/lib/types";
import { streamUrl } from "./useRound";

interface Player extends PartyPlayer {
  /** Earliest clip where a wrong guess had the right artist this round. */
  artistStage: number | null;
}

export interface HostFeedback {
  correct: boolean;
  artistMatch?: boolean;
  title: string;
  artist: string;
  points?: number;
}

export type RoomStatus = "connecting" | "open" | "error";

async function verify(body: object): Promise<VerifyResponse | null> {
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? ((await res.json()) as VerifyResponse) : null;
  } catch {
    return null;
  }
}

const isSearchItem = (x: unknown): x is SearchResultItem => {
  const o = x as SearchResultItem;
  return !!o && Number.isInteger(o.id) && typeof o.title === "string" && typeof o.artist === "string";
};

/**
 * The host's side of a party: opens the room, keeps every player's score, plays the audio and
 * checks each guess. All game state lives in a ref and is copied out (and broadcast) on change,
 * so guesses that arrive together never read a stale round.
 */
export function usePartyHost(hostName: string) {
  const stages = [...STAGES];
  const [code, setCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomStatus>("connecting");
  const [state, setState] = useState<PartyState | null>(null);
  const [feedback, setFeedback] = useState<HostFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const conns = useRef(new Map<string, DataConnection>());
  const game = useRef({
    phase: "lobby" as PartyState["phase"],
    round: 0,
    rounds: 0,
    stage: 0,
    language: "all" as LanguageFilter,
    players: new Map<string, Player>(),
    track: null as RevealedTrack | null,
    tickets: [] as RoundTicket[],
    spares: [] as RoundTicket[],
    /** Bumps on every new round so late verify answers are dropped. */
    epoch: 0,
    pending: new Set<string>(),
  });

  const snapshot = useCallback((): PartyState => {
    const g = game.current;
    return {
      phase: g.phase,
      round: g.round,
      rounds: g.rounds,
      stage: g.stage,
      stages,
      language: g.language,
      players: [...g.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        status: p.status,
        roundPoints: p.roundPoints,
        online: p.online,
      })),
      track: g.phase === "reveal" || g.phase === "final" ? g.track : null,
    };
    // stages is a constant copy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = (conn: DataConnection, msg: HostMessage) => {
    if (conn.open) void conn.send(msg);
  };

  const publish = useCallback(() => {
    const s = snapshot();
    setState(s);
    for (const conn of conns.current.values()) send(conn, { type: "state", state: s });
  }, [snapshot]);

  const notify = useCallback((playerId: string, msg: Extract<HostMessage, { type: "feedback" }>) => {
    if (playerId === HOST_ID) {
      setFeedback({ correct: msg.correct, artistMatch: msg.artistMatch, title: msg.title, artist: msg.artist, points: msg.points });
      return;
    }
    const conn = conns.current.get(playerId);
    if (conn) send(conn, msg);
  }, []);

  // --- rounds ---------------------------------------------------------------

  const reveal = useCallback(async () => {
    const g = game.current;
    if (g.phase !== "playing" && g.phase !== "loading") return;
    const epoch = g.epoch;
    g.phase = "reveal";
    audioEngine.stop();
    for (const p of g.players.values()) {
      if (p.status === "correct") continue;
      p.status = "out";
      if (p.artistStage !== null) {
        p.roundPoints = Math.round(STAGE_POINTS[p.artistStage] * ARTIST_SHARE);
        p.score += p.roundPoints;
      }
    }
    publish();
    const token = g.tickets[g.round]?.token;
    if (!g.track && token) {
      const res = await verify({ token, reveal: true });
      if (g.epoch !== epoch) return;
      g.track = res?.track ?? null;
      publish();
    }
  }, [publish]);

  const openStage = useCallback(
    (stage: number) => {
      const g = game.current;
      g.stage = stage;
      for (const p of g.players.values()) if (p.status === "waiting") p.status = "guessing";
      audioEngine.play(stages[stage]);
      publish();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [publish]
  );

  /** Moves on when nobody connected can still guess at this clip. */
  const checkProgress = useCallback(() => {
    const g = game.current;
    if (g.phase !== "playing") return;
    const active = [...g.players.values()].filter((p) => p.online);
    if (active.some((p) => p.status === "guessing") || g.pending.size > 0) return;
    if (active.every((p) => p.status === "correct") || g.stage >= stages.length - 1) void reveal();
    else openStage(g.stage + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, openStage]);

  const startRound = useCallback(
    async (index: number) => {
      const g = game.current;
      g.epoch++;
      const epoch = g.epoch;
      g.round = index;
      g.stage = 0;
      g.track = null;
      g.phase = "loading";
      g.pending.clear();
      for (const p of g.players.values()) {
        p.status = "guessing";
        p.roundPoints = 0;
        p.artistStage = null;
      }
      setFeedback(null);
      publish();
      // Songs whose audio fails are swapped for a spare from the same game.
      for (;;) {
        const ticket = g.tickets[index];
        const ok = await audioEngine.load(streamUrl(ticket));
        if (g.epoch !== epoch) return;
        if (ok) break;
        const spare = g.spares.shift();
        if (!spare) {
          setError("No se pudo cargar el audio. Revisa la conexión del host.");
          return;
        }
        g.tickets[index] = spare;
      }
      setError(null);
      g.phase = "playing";
      audioEngine.play(stages[0]);
      const next = g.tickets[index + 1];
      if (next) audioEngine.preload(streamUrl(next));
      publish();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [publish]
  );

  const startGame = useCallback(
    async (source: Source, count: number, language: LanguageFilter) => {
      const g = game.current;
      setError(null);
      g.phase = "loading";
      g.language = language;
      publish();
      try {
        const res = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, count, seed: randomSeed() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "No se pudo armar la partida");
        g.tickets = data.rounds;
        g.spares = data.spares ?? [];
        g.rounds = count;
        for (const p of g.players.values()) p.score = 0;
        await startRound(0);
      } catch (err) {
        g.phase = "lobby";
        setError(err instanceof Error ? err.message : "Sin conexión con el servidor");
        publish();
      }
    },
    [publish, startRound]
  );

  const next = useCallback(() => {
    const g = game.current;
    if (g.phase !== "reveal") return;
    if (g.round + 1 < g.rounds) void startRound(g.round + 1);
    else {
      g.phase = "final";
      audioEngine.stop();
      publish();
    }
  }, [publish, startRound]);

  const backToLobby = useCallback(() => {
    const g = game.current;
    g.epoch++;
    g.phase = "lobby";
    g.track = null;
    for (const p of g.players.values()) {
      p.status = "guessing";
      p.roundPoints = 0;
    }
    audioEngine.stop();
    publish();
  }, [publish]);

  // --- guesses ----------------------------------------------------------------

  const guess = useCallback(
    async (playerId: string, item: SearchResultItem) => {
      const g = game.current;
      const player = g.players.get(playerId);
      const token = g.tickets[g.round]?.token;
      if (g.phase !== "playing" || !player || player.status !== "guessing" || !token || g.pending.has(playerId)) return;
      const { epoch, stage } = g;
      g.pending.add(playerId);
      const res = await verify({ token, guessId: item.id });
      g.pending.delete(playerId);
      if (g.epoch !== epoch || g.phase !== "playing") return;
      const said = { title: item.title, artist: item.artist };
      if (res?.correct) {
        // Points for the clip that was open when the guess was sent, not when the answer came back.
        player.status = "correct";
        player.roundPoints = STAGE_POINTS[stage];
        player.score += player.roundPoints;
        g.track ??= res.track ?? null;
        notify(playerId, { type: "feedback", correct: true, points: player.roundPoints, ...said });
      } else {
        player.status = "waiting";
        if (res?.artistMatch && player.artistStage === null) player.artistStage = stage;
        notify(playerId, { type: "feedback", correct: false, artistMatch: res?.artistMatch, ...said });
      }
      publish();
      checkProgress();
    },
    [notify, publish, checkProgress]
  );

  const pass = useCallback(
    (playerId: string) => {
      const player = game.current.players.get(playerId);
      if (game.current.phase !== "playing" || player?.status !== "guessing") return;
      player.status = "waiting";
      publish();
      checkProgress();
    },
    [publish, checkProgress]
  );

  // --- room ---------------------------------------------------------------------

  const handlers = useRef({ guess, pass, publish, checkProgress });
  useEffect(() => {
    handlers.current = { guess, pass, publish, checkProgress };
  });

  useEffect(() => {
    let cancelled = false;
    const g = game.current;
    const open = conns.current;
    g.players.set(HOST_ID, {
      id: HOST_ID,
      name: cleanName(hostName) || "Host",
      score: 0,
      status: "guessing",
      roundPoints: 0,
      online: true,
      artistStage: null,
    });

    const onConnection = (conn: DataConnection) => {
      conn.on("data", (raw) => {
        const msg = raw as GuestMessage;
        if (!msg || typeof msg !== "object") return;
        if (msg.type === "join") {
          const name = cleanName(String(msg.name ?? "")) || "Invitado";
          const players = game.current.players;
          // A guest who reloads comes back with a new id: an offline player with the same name keeps their score.
          const returning = [...players.values()].find((p) => !p.online && p.name === name);
          if (!returning && players.size >= MAX_PLAYERS) {
            send(conn, { type: "rejected", reason: "La sala está llena" });
            setTimeout(() => conn.close(), 500);
            return;
          }
          if (returning) players.delete(returning.id);
          players.set(conn.peer, {
            id: conn.peer,
            name,
            score: returning?.score ?? 0,
            status: returning?.status === "correct" ? "correct" : "guessing",
            roundPoints: returning?.roundPoints ?? 0,
            online: true,
            artistStage: returning?.artistStage ?? null,
          });
          conns.current.set(conn.peer, conn);
          send(conn, { type: "welcome", id: conn.peer });
          handlers.current.publish();
        } else if (msg.type === "guess" && isSearchItem(msg.item)) {
          void handlers.current.guess(conn.peer, msg.item);
        } else if (msg.type === "pass") {
          handlers.current.pass(conn.peer);
        }
      });
      conn.on("close", () => {
        conns.current.delete(conn.peer);
        const p = game.current.players.get(conn.peer);
        if (p) p.online = false;
        handlers.current.publish();
        // Someone leaving may have been the last one still guessing.
        handlers.current.checkProgress();
      });
    };

    (async () => {
      const { Peer } = await import("peerjs");
      // A taken code (another room) gets a new one.
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        const roomCode = randomCode();
        const peer = new Peer(peerIdFor(roomCode));
        const opened = await new Promise<boolean | "taken">((resolve) => {
          peer.once("open", () => resolve(true));
          peer.once("error", (err) => resolve(err.type === "unavailable-id" ? "taken" : false));
        });
        if (cancelled) {
          peer.destroy();
          return;
        }
        if (opened === "taken") {
          peer.destroy();
          continue;
        }
        if (!opened) {
          peer.destroy();
          setRoom("error");
          return;
        }
        peerRef.current = peer;
        peer.on("connection", onConnection);
        // Phones drop the broker's socket in the background; open data channels survive, new joins need it back.
        peer.on("disconnected", () => {
          if (!peer.destroyed) peer.reconnect();
        });
        setCode(roomCode);
        setRoom("open");
        handlers.current.publish();
        return;
      }
      if (!cancelled) setRoom("error");
    })();

    return () => {
      cancelled = true;
      peerRef.current?.destroy();
      peerRef.current = null;
      open.clear();
      audioEngine.stop();
    };
    // The room lives as long as the screen; the host's name is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback(() => {
    const g = game.current;
    if (g.phase === "reveal" || g.phase === "final") audioEngine.play("full");
    else if (g.phase === "playing") audioEngine.play(stages[g.stage]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    code,
    room,
    state,
    feedback,
    error,
    stages,
    startGame,
    next,
    backToLobby,
    play,
    reveal: () => void reveal(),
    openNextStage: () => {
      const g = game.current;
      if (g.phase !== "playing") return;
      if (g.stage >= stages.length - 1) void reveal();
      else openStage(g.stage + 1);
    },
    guess: (item: SearchResultItem) => void guess(HOST_ID, item),
    pass: () => pass(HOST_ID),
  };
}
