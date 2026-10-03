import { track } from "../analytics";
import { KEYS, readJSON, writeJSON } from "../storage";
import { normaliseState, type SellumState } from "./game";
import { normaliseSellumStats, recordSellum, type SellumStats } from "./stats";

export function loadSellumState(day: number): SellumState {
  return normaliseState(readJSON<Partial<SellumState>>(KEYS.sellumState), day);
}

export function saveSellumState(state: SellumState): void {
  writeJSON(KEYS.sellumState, state);
}

export function loadSellumStats(): SellumStats {
  return normaliseSellumStats(readJSON<Partial<SellumStats>>(KEYS.sellumStats));
}

/** Records a finished game (also on reload); stats and analytics happen at most once per day. */
export function completeSellum(state: SellumState): SellumStats {
  const won = state.status === "won";
  const { stats, recorded } = recordSellum(loadSellumStats(), state.day, won, state.lives);
  if (recorded) {
    writeJSON(KEYS.sellumStats, stats);
    track("game_end", { game: "sellum", day: state.day, won, livesLeft: state.lives, steps: state.words.length + (won ? 1 : 0) });
  }
  return stats;
}

export function isSellumDoneToday(day: number): boolean {
  const s = readJSON<Partial<SellumState>>(KEYS.sellumState);
  return !!s && s.day === day && (s.status === "won" || s.status === "lost");
}
