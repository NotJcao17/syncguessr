"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/lib/audioEngine";
import { RevealedTrack, RoundTicket, SearchResultItem, VerifyResponse } from "@/lib/types";

export type RoundPhase = "loading" | "ready" | "won" | "lost" | "error";

export interface Attempt {
  /** Index into the round's stage list. */
  stage: number;
  kind: "skip" | "wrong" | "correct";
  guess?: { title: string; artist: string };
  artistMatch?: boolean;
}

export interface RoundOutcome {
  won: boolean;
  /** Stage index where the round ended. */
  stage: number;
  /** Earliest stage where a wrong guess had the right artist. */
  artistStage: number | null;
  track: RevealedTrack | null;
}

export const streamUrl = (ticket: RoundTicket) => `/api/stream?t=${encodeURIComponent(ticket.token)}`;

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

/**
 * One round: load the audio, play clips, take guesses and skips, reveal at the end.
 * `unlocked` only moves forward; replaying an earlier clip never gives extra attempts.
 */
export function useRound({
  ticket,
  stages,
  autoPlay,
  onFinish,
}: {
  ticket: RoundTicket | null;
  /** Clip lengths in seconds, shortest first. */
  stages: number[];
  autoPlay: boolean;
  onFinish: (outcome: RoundOutcome) => void;
}) {
  const [phase, setPhase] = useState<RoundPhase>("loading");
  const [unlocked, setUnlocked] = useState(0);
  const [listening, setListening] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [track, setTrack] = useState<RevealedTrack | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealFailed, setRevealFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [roundToken, setRoundToken] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);
  // Synchronous guards: several fast clicks can land before React re-renders with the new state.
  const unlockedRef = useRef(0);
  const finishedRef = useRef<string | null>(null);
  const attemptsRef = useRef<Attempt[]>([]);
  const pushAttempt = useCallback((attempt: Attempt) => {
    attemptsRef.current = [...attemptsRef.current, attempt];
    setAttempts(attemptsRef.current);
    return attemptsRef.current;
  }, []);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  // A new ticket resets the round (state adjusted during render, not in an effect).
  if (ticket && ticket.token !== roundToken) {
    setRoundToken(ticket.token);
    setPhase("loading");
    setUnlocked(0);
    setListening(0);
    setAttempts([]);
    setTrack(null);
    setRevealFailed(false);
    setPeaks([]);
  }

  // Load the audio for the ticket; stale loads are ignored.
  useEffect(() => {
    if (!ticket) return;
    const token = ticket.token;
    if (tokenRef.current !== token) {
      unlockedRef.current = 0;
      finishedRef.current = null;
      attemptsRef.current = [];
    }
    tokenRef.current = token;
    audioEngine.load(streamUrl(ticket)).then((ok) => {
      if (tokenRef.current !== token) return;
      setPhase(ok ? "ready" : "error");
      if (!ok) return;
      setPeaks(audioEngine.peaks(stages[stages.length - 1], 240));
      if (autoPlay) audioEngine.play(stages[0]);
    });
    // stages/autoPlay are read once per round on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket, loadAttempt]);

  const reload = useCallback(() => {
    setPhase("loading");
    setLoadAttempt((n) => n + 1);
  }, []);

  const play = useCallback(
    (stageIndex?: number) => {
      if (!ticket || phase === "loading" || phase === "error") return;
      if (phase === "won" || phase === "lost") {
        audioEngine.play("full");
        return;
      }
      const idx = Math.min(stageIndex ?? unlocked, unlocked);
      setListening(idx);
      audioEngine.play(stages[idx]);
    },
    [ticket, phase, unlocked, stages]
  );

  const finish = useCallback(
    async (won: boolean, stage: number, allAttempts: Attempt[], revealed: RevealedTrack | null) => {
      const token = tokenRef.current;
      // The reveal request takes a moment; without this, extra clicks meanwhile ended the round again.
      if (!token || finishedRef.current === token) return;
      finishedRef.current = token;
      let finalTrack = revealed;
      if (!finalTrack && token) {
        const res = await verify({ token, reveal: true });
        if (tokenRef.current !== token) return;
        finalTrack = res?.track ?? null;
        setRevealFailed(!finalTrack);
      }
      setTrack(finalTrack);
      setPhase(won ? "won" : "lost");
      const artistHit = allAttempts.find((a) => a.artistMatch);
      onFinishRef.current({ won, stage, artistStage: artistHit ? artistHit.stage : null, track: finalTrack });
    },
    []
  );

  const advance = useCallback(
    (attempt: Attempt) => {
      if (finishedRef.current === tokenRef.current) return;
      const current = unlockedRef.current;
      const next = pushAttempt({ ...attempt, stage: current });
      if (current + 1 >= stages.length) {
        audioEngine.stop();
        void finish(false, current, next, null);
        return;
      }
      const nextStage = current + 1;
      unlockedRef.current = nextStage;
      setUnlocked(nextStage);
      setListening(nextStage);
      audioEngine.play(stages[nextStage]);
    },
    [stages, finish, pushAttempt]
  );

  const guess = useCallback(
    async (item: SearchResultItem) => {
      if (phase !== "ready" || busy || !tokenRef.current) return;
      const token = tokenRef.current;
      setBusy(true);
      audioEngine.stop();
      const res = await verify({ token, guessId: item.id });
      setBusy(false);
      if (tokenRef.current !== token || !res) return;
      const g = { title: item.title, artist: item.artist };
      if (res.correct) {
        const stage = unlockedRef.current;
        const next = pushAttempt({ stage, kind: "correct", guess: g });
        void finish(true, stage, next, res.track ?? null);
      } else {
        advance({ stage: unlockedRef.current, kind: "wrong", guess: g, artistMatch: res.artistMatch });
      }
    },
    [phase, busy, finish, advance, pushAttempt]
  );

  const skip = useCallback(() => {
    if (phase !== "ready" || busy) return;
    advance({ stage: unlockedRef.current, kind: "skip" });
  }, [phase, busy, advance]);

  const giveUp = useCallback(() => {
    if (phase !== "ready" || busy || finishedRef.current === tokenRef.current) return;
    audioEngine.stop();
    const stage = unlockedRef.current;
    void finish(false, stage, pushAttempt({ stage, kind: "skip" }), null);
  }, [phase, busy, finish, pushAttempt]);

  /** The audio never loaded: count the round as lost so a fixed game can go on. */
  const forfeit = useCallback(() => {
    if (phase !== "error") return;
    void finish(false, stages.length - 1, attemptsRef.current, null);
  }, [phase, stages, finish]);

  const retryReveal = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    const res = await verify({ token, reveal: true });
    if (tokenRef.current !== token || !res?.track) return;
    setTrack(res.track);
    setRevealFailed(false);
  }, []);

  return { phase, unlocked, listening, attempts, track, peaks, busy, revealFailed, play, guess, skip, giveUp, retryReveal, reload, forfeit };
}
