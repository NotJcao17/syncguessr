import { LanguageFilter, RevealedTrack, SearchResultItem } from "./types";

/**
 * Party mode: the host's browser runs the game and plays the audio; everyone else joins with a
 * code over WebRTC (PeerJS) and only sends guesses. The host checks every guess against the
 * server, so guests never hold the round token (and can't ask the server for the answer).
 */

/** Peer ids live on the public PeerJS broker, so they carry an app prefix. */
export const peerIdFor = (code: string) => `syncguessr-fiesta-${code.toLowerCase()}`;

// No 0/O, 1/I/L: codes are read aloud across a room.
const CODE_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 4;

export function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => CODE_LETTERS[b % CODE_LETTERS.length]).join("");
}

export const normalizeCode = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);

export const MAX_PLAYERS = 12;
export const HOST_ID = "host";

export type PartyPhase = "lobby" | "loading" | "playing" | "reveal" | "final";

/** Where a player stands in the current round. */
export type PlayerStatus =
  /** Can guess at the open clip. */
  | "guessing"
  /** Missed or passed this clip; can guess again when the next one opens. */
  | "waiting"
  | "correct"
  /** Missed every clip of the round. */
  | "out";

export interface PartyPlayer {
  id: string;
  name: string;
  score: number;
  status: PlayerStatus;
  /** Points won in the current round (shown on the reveal). */
  roundPoints: number;
  online: boolean;
}

/** Everything a guest needs to draw its screen; the host sends it again after every change. */
export interface PartyState {
  phase: PartyPhase;
  /** 0-based index of the current song. */
  round: number;
  rounds: number;
  /** Index of the longest clip open in this round. */
  stage: number;
  stages: number[];
  language: LanguageFilter;
  players: PartyPlayer[];
  /** The answer, only once the round is over. */
  track: RevealedTrack | null;
}

export type GuestMessage =
  | { type: "join"; name: string }
  | { type: "guess"; item: SearchResultItem }
  | { type: "pass" };

export type HostMessage =
  | { type: "welcome"; id: string }
  | { type: "state"; state: PartyState }
  | { type: "feedback"; correct: boolean; artistMatch?: boolean; title: string; artist: string; points?: number }
  | { type: "rejected"; reason: string };

export const cleanName = (raw: string) => raw.replace(/\s+/g, " ").trim().slice(0, 20);

/** Standings: score first, then who joined first. */
export const ranking = (players: PartyPlayer[]) => [...players].sort((a, b) => b.score - a.score);
