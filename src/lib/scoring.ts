/** Clip lengths in seconds, shortest first. Every mode uses the same five so scores stay comparable. */
export const STAGES = [0.1, 0.5, 2, 8, 15] as const;

/** Base points for solving at each stage. */
export const STAGE_POINTS = [1000, 800, 600, 400, 200] as const;

/** Share of a stage's points granted when the round is lost but the artist was guessed at that stage. */
export const ARTIST_SHARE = 0.25;

/** Every consecutive solved round adds 10% (capped at +50%). */
export const streakMultiplier = (streakBefore: number) => 1 + Math.min(streakBefore, 5) * 0.1;

export interface RoundScoreInput {
  won: boolean;
  /** Stage index where the song was solved. */
  stage: number;
  /** Earliest stage where a wrong guess had the right artist, if any. */
  artistStage: number | null;
  streakBefore: number;
}

export function scoreRound({ won, stage, artistStage, streakBefore }: RoundScoreInput) {
  if (won) {
    const multiplier = streakMultiplier(streakBefore);
    return { points: Math.round(STAGE_POINTS[stage] * multiplier), multiplier };
  }
  if (artistStage !== null) {
    return { points: Math.round(STAGE_POINTS[artistStage] * ARTIST_SHARE), multiplier: 1 };
  }
  return { points: 0, multiplier: 1 };
}

export const formatSeconds = (s: number) => `${s}s`;

export const formatPoints = (n: number) => n.toLocaleString("es-MX");
