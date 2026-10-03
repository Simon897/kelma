import { LADDER_STEPS, diffCount } from "./graph.ts";

export const MAX_LIVES = 3;
/** Words the player types: floors 2–4. The last step to the target completes itself. */
export const PLAYER_WORDS = LADDER_STEPS - 1;
/** An accepted word's row flips in tile by tile (Kelma's reveal timing); input is locked meanwhile. */
export const STEP_MS = 4 * 180 + 350;
/** Time for the target row to flip green, tile by tile. */
export const TARGET_REVEAL_MS = 4 * 180 + 350;
/** The end panel waits for the reveal and the confetti, then about 1.2s more. */
export const RESULT_DELAY_MS = STEP_MS + TARGET_REVEAL_MS + 1200;

export type SellumStatus = "playing" | "won" | "lost";

export interface SellumState {
  day: number;
  /** Words the player entered and had accepted (0–3). The start and target aren't stored. */
  words: string[];
  lives: number;
  status: SellumStatus;
}

export interface LadderContext {
  start: string;
  target: string;
  /** Shortest distance to the target for every word within 4 steps (from distancesFrom). */
  toTarget: ReadonlyMap<string, number>;
  isWord: (w: string) => boolean;
}

/**
 * How an entry is treated, in the order the rules are checked:
 * shape and used are typing slips (no life lost); not-word and dead-end cost a life.
 */
export type EntryResult = "shape" | "used" | "not-word" | "dead-end" | "ok";

export const COSTS_LIFE: Record<EntryResult, boolean> = {
  shape: false,
  used: false,
  "not-word": true,
  "dead-end": true,
  ok: false,
};

export function newState(day: number): SellumState {
  return { day, words: [], lives: MAX_LIVES, status: "playing" };
}

/** The word on the floor above the active one. */
export function previousWord(state: SellumState, ctx: LadderContext): string {
  return state.words.length ? state.words[state.words.length - 1] : ctx.start;
}

export function classifyEntry(state: SellumState, word: string, ctx: LadderContext): EntryResult {
  const prev = previousWord(state, ctx);
  if (diffCount(prev, word) !== 1) return "shape"; // wrong length, or 0 / 2+ letters changed
  if (word === ctx.start || state.words.includes(word)) return "used";
  if (!ctx.isWord(word)) return "not-word";
  const step = state.words.length + 1;
  if (ctx.toTarget.get(word) !== LADDER_STEPS - step) return "dead-end";
  return "ok";
}

/**
 * Applies one submitted word. On the third accepted word the last step (to the target) is
 * always exactly one letter, so the game completes itself and is won.
 */
export function submitWord(state: SellumState, word: string, ctx: LadderContext): { state: SellumState; result: EntryResult } {
  if (state.status !== "playing") return { state, result: "shape" };
  const result = classifyEntry(state, word, ctx);
  if (result === "ok") {
    const words = [...state.words, word];
    return { state: { ...state, words, status: words.length === PLAYER_WORDS ? "won" : "playing" }, result };
  }
  if (COSTS_LIFE[result]) {
    const lives = state.lives - 1;
    return { state: { ...state, lives, status: lives <= 0 ? "lost" : "playing" }, result };
  }
  return { state, result };
}

/** The whole ladder as far as it goes: start, accepted words, and the target once won. */
export function ladderWords(state: SellumState, ctx: Pick<LadderContext, "start" | "target">): string[] {
  return [ctx.start, ...state.words, ...(state.status === "won" ? [ctx.target] : [])];
}

/** Sanitise whatever was in storage. */
export function normaliseState(raw: Partial<SellumState> | null, day: number): SellumState {
  if (!raw || raw.day !== day || !Array.isArray(raw.words)) return newState(day);
  const lives = Number.isInteger(raw.lives) ? Math.max(0, Math.min(MAX_LIVES, raw.lives as number)) : MAX_LIVES;
  const status: SellumStatus = raw.status === "won" || raw.status === "lost" ? raw.status : "playing";
  return { day, words: raw.words.filter((w) => typeof w === "string").slice(0, PLAYER_WORDS), lives, status };
}
