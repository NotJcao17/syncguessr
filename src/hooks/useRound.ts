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
      const next = [...attempts, attempt];
      setAttempts(next);
      if (unlocked + 1 >= stages.length) {
        audioEngine.stop();
        void finish(false, unlocked, next, null);
        return;
      }
      const nextStage = unlocked + 1;
      setUnlocked(nextStage);
      setListening(nextStage);
      audioEngine.play(stages[nextStage]);
    },
    [attempts, unlocked, stages, finish]
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
        const next = [...attempts, { stage: unlocked, kind: "correct" as const, guess: g }];
        setAttempts(next);
        void finish(true, unlocked, next, res.track ?? null);
      } else {
        advance({ stage: unlocked, kind: "wrong", guess: g, artistMatch: res.artistMatch });
      }
    },
    [phase, busy, attempts, unlocked, finish, advance]
  );

  const skip = useCallback(() => {
    if (phase !== "ready" || busy) return;
    advance({ stage: unlocked, kind: "skip" });
  }, [phase, busy, unlocked, advance]);

  const giveUp = useCallback(() => {
    if (phase !== "ready" || busy) return;
    audioEngine.stop();
    const next = [...attempts, { stage: unlocked, kind: "skip" as const }];
    setAttempts(next);
    void finish(false, unlocked, next, null);
  }, [phase, busy, attempts, unlocked, finish]);

  const retryReveal = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    const res = await verify({ token, reveal: true });
    if (tokenRef.current !== token || !res?.track) return;
    setTrack(res.track);
    setRevealFailed(false);
  }, []);

  return { phase, unlocked, listening, attempts, track, peaks, busy, revealFailed, play, guess, skip, giveUp, retryReveal, reload };
}
