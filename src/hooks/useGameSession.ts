"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/lib/audioEngine";
import { scoreRound } from "@/lib/scoring";
import {
  addToHistory,
  HighScore,
  loadHistory,
  loadStats,
  recordGameFinished,
  recordRound,
  submitScore,
} from "@/lib/storage";
import { RoundTicket, Source } from "@/lib/types";
import { RoundOutcome, streamUrl } from "./useRound";

export type Mode = "libre" | "partida" | "artista" | "diario";

export interface SessionConfig {
  mode: Mode;
  source: Source;
  /** Songs in the game; null for endless free play. */
  count: number | null;
  /** Fixed games only: same seed, same songs. */
  seed?: string;
  /** Fixed games: skip songs the player heard recently. Off for daily games and challenges,
   * which must give everyone the same songs. */
  avoidRepeats?: boolean;
  /** Fixed games: where the high score is kept. */
  recordKey?: string;
  /** Fixed games: called once when the last round ends. */
  onFinished?: (outcomes: ScoredOutcome[], score: number) => void;
}

export interface GameResult {
  record: HighScore | null;
  isRecord: boolean;
}

export interface ScoredOutcome extends RoundOutcome {
  points: number;
  multiplier: number;
}

const MAX_LOAD_RETRIES = 3;

async function postJson<T>(url: string, body: object): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? "No se pudo cargar la canción" };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Sin conexión con el servidor" };
  }
}

/** A sequence of rounds: fetches tickets, preloads the next song, keeps score and streak. */
export function useGameSession(config: SessionConfig) {
  const [tickets, setTickets] = useState<RoundTicket[]>([]);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<ScoredOutcome[]>([]);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [freeStreak, setFreeStreak] = useState(() => {
    const s = loadStats();
    return { current: s.freeStreak, best: s.bestFreeStreak };
  });

  const failedRef = useRef<string[]>([]);
  const sparesRef = useRef<RoundTicket[]>([]);
  const recentArtistsRef = useRef<string[]>([]);
  const nextTicketRef = useRef<Promise<RoundTicket | null> | null>(null);
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  const fetchEndlessTicket = useCallback(async (): Promise<RoundTicket | null> => {
    const res = await postJson<RoundTicket>("/api/round", {
      source: configRef.current.source,
      exclude: loadHistory(),
      avoidArtists: recentArtistsRef.current,
      failed: failedRef.current,
    });
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    return res.data;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setOutcomes([]);
    setIndex(0);
    setStreak(0);
    setTickets([]);
    nextTicketRef.current = null;
    const { count, source, seed, avoidRepeats } = configRef.current;
    if (count === null) {
      const ticket = await fetchEndlessTicket();
      if (ticket) setTickets([ticket]);
    } else {
      const res = await postJson<{ rounds: RoundTicket[]; spares?: RoundTicket[] }>("/api/game", {
        source,
        count,
        seed,
        exclude: avoidRepeats ? loadHistory() : [],
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTickets(res.data.rounds);
      sparesRef.current = res.data.spares ?? [];
    }
    setStarted(true);
  }, [fetchEndlessTicket]);

  const ticket = tickets[index] ?? null;
  const isLast = config.count !== null && index >= config.count - 1;
  const finished = config.count !== null && outcomes.length >= config.count;

  const notice = ticket?.recycled ? "Ya escuchaste todas las canciones de esta selección. Empezamos de nuevo." : null;

  // Fixed games: start decoding the next song while this one is being played.
  useEffect(() => {
    const next = tickets[index + 1];
    if (next) audioEngine.preload(streamUrl(next));
  }, [tickets, index]);

  const onRoundFinished = useCallback(
    (outcome: RoundOutcome) => {
      const { points, multiplier } = scoreRound({
        won: outcome.won,
        stage: outcome.stage,
        artistStage: outcome.artistStage,
        streakBefore: streak,
      });
      const all = [...outcomes, { ...outcome, points, multiplier }];
      setOutcomes(all);
      setStreak((s) => (outcome.won ? s + 1 : 0));

      const { count, recordKey, onFinished } = configRef.current;
      if (count !== null && all.length >= count) {
        const total = all.reduce((sum, o) => sum + o.points, 0);
        recordGameFinished();
        const r = recordKey ? submitScore(recordKey, total) : { previous: null, isRecord: false };
        setResult({ record: r.previous, isRecord: r.isRecord });
        onFinished?.(all, total);
      }
      const stats = recordRound(outcome.won, outcome.stage, configRef.current.mode);
      setFreeStreak({ current: stats.freeStreak, best: stats.bestFreeStreak });
      if (outcome.track) {
        addToHistory(outcome.track.id);
        recentArtistsRef.current = [...recentArtistsRef.current, outcome.track.artist].slice(-3);
      }
      // Endless play: pick and preload the next song while the player reads the reveal.
      if (configRef.current.count === null) {
        nextTicketRef.current = fetchEndlessTicket().then((t) => {
          if (t) audioEngine.preload(streamUrl(t));
          return t;
        });
      }
    },
    [streak, outcomes, fetchEndlessTicket]
  );

  /** The track may be revealed after the round ended (retry after a network error). */
  const updateLastTrack = useCallback((track: RoundOutcome["track"]) => {
    if (!track) return;
    setOutcomes((prev) => (prev.length ? [...prev.slice(0, -1), { ...prev[prev.length - 1], track }] : prev));
    addToHistory(track.id);
  }, []);

  const next = useCallback(async () => {
    if (configRef.current.count !== null) {
      setIndex((i) => i + 1);
      return;
    }
    const pending = nextTicketRef.current ?? fetchEndlessTicket();
    nextTicketRef.current = null;
    const t = await pending;
    if (!t) return;
    setTickets((prev) => [...prev, t]);
    setIndex((i) => i + 1);
  }, [fetchEndlessTicket]);

  /** Free mode: swap the current song before any attempt, without touching the streak. */
  const reroll = useCallback(async () => {
    const t = await fetchEndlessTicket();
    if (t) setTickets((prev) => [...prev.slice(0, -1), t]);
  }, [fetchEndlessTicket]);

  /** Audio for this round could not be loaded: swap in another song before the player acts. */
  const handleLoadError = useCallback(async () => {
    if (!ticket) return;
    if (configRef.current.count !== null) {
      // Fixed games carry spare songs from the same seed, so a daily game stays the same for everyone.
      const spare = sparesRef.current.shift();
      if (spare) setTickets((prev) => prev.map((t, i) => (i === index ? spare : t)));
      return;
    }
    if (failedRef.current.length < MAX_LOAD_RETRIES * 4) {
      failedRef.current = [...failedRef.current, ticket.token];
      const recentFailures = failedRef.current.length;
      if (recentFailures % MAX_LOAD_RETRIES === 0) {
        setError("Deezer no está respondiendo. Revisa tu conexión e inténtalo de nuevo.");
        return;
      }
      await reroll();
    }
  }, [ticket, index, reroll]);

  const score = outcomes.reduce((sum, o) => sum + o.points, 0);

  return {
    ticket,
    index,
    outcomes,
    score,
    streak,
    error,
    notice,
    started,
    finished,
    result,
    freeStreak,
    isLast,
    start,
    next,
    reroll,
    onRoundFinished,
    updateLastTrack,
    handleLoadError,
    dismissError: () => setError(null),
  };
}
