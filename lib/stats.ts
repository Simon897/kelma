import { MAX_GUESSES } from "./game";

export interface Stats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  /** 6 buckets, index = guesses.length - 1 */
  distribution: number[];
  lastCompletedDay: number | null;
  lastWonDay: number | null;
}

export function emptyStats(): Stats {
  return {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: new Array(MAX_GUESSES).fill(0),
    lastCompletedDay: null,
    lastWonDay: null,
  };
}

/** Coerce whatever was in storage into a valid Stats object. */
export function normaliseStats(raw: Partial<Stats> | null | undefined): Stats {
  const base = emptyStats();
  if (!raw || typeof raw !== "object") return base;
  const dist = Array.isArray(raw.distribution) && raw.distribution.length === MAX_GUESSES
    ? raw.distribution.map((n) => (Number.isFinite(n) ? n : 0))
    : base.distribution;
  return { ...base, ...raw, distribution: dist };
}

/**
 * Record a finished game. Idempotent per day: returns `recorded: false` if this
 * day was already counted, which is also what keeps analytics firing once.
 */
export function recordGame(
  stats: Stats,
  day: number,
  won: boolean,
  guessCount: number,
): { stats: Stats; recorded: boolean } {
  if (stats.lastCompletedDay !== null && day <= stats.lastCompletedDay) {
    return { stats, recorded: false };
  }
  const next: Stats = { ...stats, distribution: [...stats.distribution] };
  next.played += 1;
  next.lastCompletedDay = day;
  if (won) {
    next.won += 1;
    next.distribution[guessCount - 1] += 1;
    next.currentStreak = stats.lastWonDay === day - 1 ? stats.currentStreak + 1 : 1;
    next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
    next.lastWonDay = day;
  } else {
    next.currentStreak = 0;
  }
  return { stats: next, recorded: true };
}

/** The streak as it stands today: a missed day breaks it even before the next game. */
export function displayStreak(stats: Stats, today: number): number {
  if (stats.lastWonDay === null) return 0;
  return stats.lastWonDay >= today - 1 ? stats.currentStreak : 0;
}
