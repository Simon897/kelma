import { MAX_LIVES } from "./game.ts";

export interface SellumStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  /** [won with 3 lives, won with 2, won with 1, lost] */
  lives: number[];
  lastCompletedDay: number | null;
  lastWonDay: number | null;
}

export function emptySellumStats(): SellumStats {
  return { played: 0, won: 0, currentStreak: 0, maxStreak: 0, lives: [0, 0, 0, 0], lastCompletedDay: null, lastWonDay: null };
}

export function normaliseSellumStats(raw: Partial<SellumStats> | null | undefined): SellumStats {
  const base = emptySellumStats();
  if (!raw || typeof raw !== "object") return base;
  const lives = Array.isArray(raw.lives) && raw.lives.length === 4 ? raw.lives.map((n) => (Number.isFinite(n) ? n : 0)) : base.lives;
  return { ...base, ...raw, lives };
}

/** Bucket for the lives distribution: 0–2 for a win with 3/2/1 lives left, 3 for a loss. */
export function livesBucket(won: boolean, livesLeft: number): number {
  return won ? MAX_LIVES - Math.max(1, Math.min(MAX_LIVES, livesLeft)) : 3;
}

/** Idempotent per day, like Kelma's: `recorded` is false if the day was already counted. */
export function recordSellum(stats: SellumStats, day: number, won: boolean, livesLeft: number): { stats: SellumStats; recorded: boolean } {
  if (stats.lastCompletedDay !== null && day <= stats.lastCompletedDay) return { stats, recorded: false };
  const next: SellumStats = { ...stats, lives: [...stats.lives] };
  next.played += 1;
  next.lastCompletedDay = day;
  next.lives[livesBucket(won, livesLeft)] += 1;
  if (won) {
    next.won += 1;
    next.currentStreak = stats.lastWonDay === day - 1 ? stats.currentStreak + 1 : 1;
    next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
    next.lastWonDay = day;
  } else {
    next.currentStreak = 0;
  }
  return { stats: next, recorded: true };
}

export function displaySellumStreak(stats: SellumStats, today: number): number {
  if (stats.lastWonDay === null) return 0;
  return stats.lastWonDay >= today - 1 ? stats.currentStreak : 0;
}
