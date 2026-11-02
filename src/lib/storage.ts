"use client";

import { DEFAULT_FILTERS, sanitizeFilters } from "./filters";
import { ArtistResult, Filters } from "./types";

/** Everything the player keeps lives in this browser. Every access is guarded: storage can be blocked. */

const KEYS = {
  filters: "syncguessr:filters",
  volume: "syncguessr:volume",
  stages: "syncguessr:stages",
  history: "syncguessr:history",
  stats: "syncguessr:stats",
  records: "syncguessr:records",
  daily: "syncguessr:daily",
  artists: "syncguessr:artists",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: the game still works, it just forgets
  }
}

export const loadFilters = (): Filters => sanitizeFilters(read(KEYS.filters, DEFAULT_FILTERS));
export const saveFilters = (f: Filters) => write(KEYS.filters, f);

export const loadVolume = (): number => {
  const v = read<number>(KEYS.volume, 0.85);
  return typeof v === "number" && v >= 0 && v <= 1 ? v : 0.85;
};
export const saveVolume = (v: number) => write(KEYS.volume, v);

/** Which of the five stages free mode uses. */
export const loadEnabledStages = (): boolean[] => {
  const s = read<boolean[]>(KEYS.stages, [true, true, true, true, true]);
  return Array.isArray(s) && s.length === 5 && s.some(Boolean) ? s.map(Boolean) : [true, true, true, true, true];
};
export const saveEnabledStages = (s: boolean[]) => write(KEYS.stages, s);

export const loadArtists = (): ArtistResult[] => {
  const a = read<ArtistResult[]>(KEYS.artists, []);
  return Array.isArray(a) ? a.filter((x) => x && typeof x.name === "string").slice(0, 20) : [];
};
export const saveArtists = (a: ArtistResult[]) => write(KEYS.artists, a);

// --- Played history (free mode avoids repeats) ---------------------------------

const HISTORY_MAX = 5000;
export const loadHistory = (): number[] => {
  const h = read<number[]>(KEYS.history, []);
  return Array.isArray(h) ? h.filter(Number.isInteger) : [];
};
export function addToHistory(trackId: number) {
  const h = loadHistory().filter((id) => id !== trackId);
  h.push(trackId);
  write(KEYS.history, h.slice(-HISTORY_MAX));
}
export const clearHistory = () => write(KEYS.history, []);

// --- Stats ---------------------------------------------------------------------

export interface Stats {
  rounds: number;
  wins: number;
  /** Wins per stage index (0.1s … 15s). */
  byStage: number[];
  freeStreak: number;
  bestFreeStreak: number;
  games: number;
  dailyStreak: number;
  bestDailyStreak: number;
  lastDaily: string | null;
}

const EMPTY_STATS: Stats = {
  rounds: 0,
  wins: 0,
  byStage: [0, 0, 0, 0, 0],
  freeStreak: 0,
  bestFreeStreak: 0,
  games: 0,
  dailyStreak: 0,
  bestDailyStreak: 0,
  lastDaily: null,
};

export const loadStats = (): Stats => ({ ...EMPTY_STATS, ...read<Partial<Stats>>(KEYS.stats, {}) });

export function recordRound(won: boolean, stage: number, mode: string) {
  const s = loadStats();
  s.rounds++;
  if (won) {
    s.wins++;
    s.byStage[stage] = (s.byStage[stage] ?? 0) + 1;
  }
  if (mode === "libre") {
    s.freeStreak = won ? s.freeStreak + 1 : 0;
    s.bestFreeStreak = Math.max(s.bestFreeStreak, s.freeStreak);
  }
  write(KEYS.stats, s);
  return s;
}

export function recordGameFinished() {
  const s = loadStats();
  s.games++;
  write(KEYS.stats, s);
}

export const resetStats = () => write(KEYS.stats, EMPTY_STATS);

// --- High scores -----------------------------------------------------------------

export interface HighScore {
  score: number;
  date: string;
}

export const loadRecords = (): Record<string, HighScore> => read(KEYS.records, {});
export const loadRecord = (key: string): HighScore | null => loadRecords()[key] ?? null;

/** Stores the score if it beats the record. Returns the previous record. */
export function submitScore(key: string, score: number): { previous: HighScore | null; isRecord: boolean } {
  const records = loadRecords();
  const previous = records[key] ?? null;
  const isRecord = score > 0 && (!previous || score > previous.score);
  if (isRecord) {
    records[key] = { score, date: new Date().toISOString() };
    write(KEYS.records, records);
  }
  return { previous, isRecord };
}

// --- Daily challenge ---------------------------------------------------------------

export interface DailyResult {
  score: number;
  /** Stage index solved per song, or null when missed. */
  stages: (number | null)[];
}

export const loadDaily = (): Record<string, DailyResult> => read(KEYS.daily, {});

export function saveDaily(day: string, result: DailyResult, yesterday: string) {
  const all = loadDaily();
  if (all[day]) return;
  all[day] = result;
  const keep = Object.keys(all).sort().slice(-60);
  write(KEYS.daily, Object.fromEntries(keep.map((k) => [k, all[k]])));

  const s = loadStats();
  s.dailyStreak = s.lastDaily === yesterday ? s.dailyStreak + 1 : 1;
  s.bestDailyStreak = Math.max(s.bestDailyStreak, s.dailyStreak);
  s.lastDaily = day;
  write(KEYS.stats, s);
}
