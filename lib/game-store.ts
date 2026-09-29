import { track } from "./analytics";
import type { GameStatus } from "./game";
import type { Mode } from "./modes";
import { normaliseStats, recordGame, type Stats } from "./stats";
import { KEYS, readJSON, writeJSON } from "./storage";

export interface SavedState {
  day: number;
  guesses: string[];
  status: GameStatus;
}

export function loadState(mode: Mode, day: number): SavedState {
  const saved = readJSON<SavedState>(KEYS.state(mode));
  if (saved && saved.day === day && Array.isArray(saved.guesses)) {
    return { day, guesses: saved.guesses.filter((g) => typeof g === "string"), status: saved.status ?? "playing" };
  }
  return { day, guesses: [], status: "playing" };
}

export function saveState(mode: Mode, state: SavedState): void {
  writeJSON(KEYS.state(mode), state);
}

export function loadStats(mode: Mode): Stats {
  return normaliseStats(readJSON<Partial<Stats>>(KEYS.stats(mode)));
}

/**
 * Called whenever a game is (or is found to be) finished, including on reload.
 * Stats and the analytics event are written at most once per mode per day.
 */
export function completeGame(mode: Mode, day: number, word: string, won: boolean, guesses: number): Stats {
  const { stats, recorded } = recordGame(loadStats(mode), day, won, guesses);
  if (recorded) {
    writeJSON(KEYS.stats(mode), stats);
    track("game_end", { mode, day, word, won, guesses });
  }
  return stats;
}

/** Whether today's game in a mode is finished (for the home-page done mark). */
export function isDoneToday(mode: Mode, day: number): boolean {
  const saved = readJSON<SavedState>(KEYS.state(mode));
  return !!saved && saved.day === day && (saved.status === "won" || saved.status === "lost");
}
