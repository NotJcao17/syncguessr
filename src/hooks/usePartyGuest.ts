"use client";

import type { DataConnection, Peer } from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { GuestMessage, HostMessage, PartyState, peerIdFor } from "@/lib/party";
import { SearchResultItem } from "@/lib/types";
import type { HostFeedback } from "./usePartyHost";

export type GuestStatus = "connecting" | "joined" | "closed" | "error";

/** A guest's side of a party: one data channel to the host, guesses out, game state in. */
export function usePartyGuest(code: string, name: string) {
  const [status, setStatus] = useState<GuestStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<PartyState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<HostFeedback | null>(null);
  const [attempt, setAttempt] = useState(0);
  const connRef = useRef<DataConnection | null>(null);
  const roundRef = useRef(-1);

  useEffect(() => {
    let cancelled = false;
    let peer: Peer | null = null;

    (async () => {
      const { Peer } = await import("peerjs");
      if (cancelled) return;
      peer = new Peer();
      peer.on("error", (err) => {
        if (cancelled) return;
        setStatus("error");
        setError(
          err.type === "peer-unavailable"
            ? "No hay ninguna sala con ese código. Revisa que el host la tenga abierta."
            : err.type === "network" || err.type === "server-error" || err.type === "socket-error"
              ? "No se pudo conectar. Revisa tu conexión a internet."
              : "No se pudo conectar con la sala."
        );
      });
      peer.on("open", () => {
        if (cancelled || !peer) return;
        const conn = peer.connect(peerIdFor(code), { reliable: true });
        connRef.current = conn;
        conn.on("open", () => {
          const join: GuestMessage = { type: "join", name };
          void conn.send(join);
        });
        conn.on("data", (raw) => {
          const msg = raw as HostMessage;
          if (!msg || typeof msg !== "object") return;
          if (msg.type === "welcome") {
            setMyId(msg.id);
            setStatus("joined");
          } else if (msg.type === "state") {
            // Feedback belongs to one round.
            if (msg.state.round !== roundRef.current || msg.state.phase === "lobby") setFeedback(null);
            roundRef.current = msg.state.round;
            setState(msg.state);
          } else if (msg.type === "feedback") {
            setFeedback({ correct: msg.correct, artistMatch: msg.artistMatch, title: msg.title, artist: msg.artist, points: msg.points });
          } else if (msg.type === "rejected") {
            setStatus("error");
            setError(msg.reason);
          }
        });
        conn.on("close", () => {
          if (cancelled) return;
          setStatus((s) => (s === "error" ? s : "closed"));
        });
      });
    })();

    return () => {
      cancelled = true;
      connRef.current = null;
      peer?.destroy();
    };
  }, [code, name, attempt]);

  const sendMessage = useCallback((msg: GuestMessage) => {
    const conn = connRef.current;
    if (conn?.open) void conn.send(msg);
  }, []);

  return {
    status,
    error,
    state,
    myId,
    feedback,
    guess: (item: SearchResultItem) => sendMessage({ type: "guess", item }),
    pass: () => sendMessage({ type: "pass" }),
    retry: () => {
      setStatus("connecting");
      setError(null);
      setAttempt((n) => n + 1);
    },
  };
}
