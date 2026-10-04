import { track } from "../analytics";
import { KEYS, readJSON, writeJSON } from "../storage";
import {
  normaliseGherqState,
  normaliseGherqStats,
  recordStars,
  type GherqState,
  type GherqStats,
} from "./game";

export function loadGherqState(day: number): GherqState {
  return normaliseGherqState(readJSON<Partial<GherqState>>(KEYS.gherqState), day);
}

export function saveGherqState(state: GherqState): void {
  writeJSON(KEYS.gherqState, state);
}

export function loadGherqStats(): GherqStats {
  return normaliseGherqStats(readJSON<Partial<GherqStats>>(KEYS.gherqStats));
}

/** Updates today's stars in the stats (idempotent: stars only ever go up within a day). */
export function saveGherqStars(day: number, stars: number): GherqStats {
  const before = loadGherqStats();
  const after = recordStars(before, day, stars);
  if (after !== before) writeJSON(KEYS.gherqStats, after);
  return after;
}

/** Sends the day's game_end event, at most once per day (give up, five stars, or leaving with progress). */
export function trackGherqOnce(props: { day: number; stars: number; found: number; total: number; hints: number; revealed: boolean }): boolean {
  if (readJSON<number>(KEYS.gherqTracked) === props.day) return false;
  writeJSON(KEYS.gherqTracked, props.day);
  track("game_end", { game: "gherq", ...props });
  return true;
}

/** Home page ticks: finished = gave up or five stars; partial = at least one star. */
/** Today's progress for the home carousel; `coreWords` (the words the stars need) decides "done". */
export function gherqProgressToday(day: number, coreWords: string[] | null): "none" | "partial" | "done" {
  const s = readJSON<Partial<GherqState>>(KEYS.gherqState);
  if (!s || s.day !== day || !Array.isArray(s.found) || s.found.length === 0) return s?.day === day && s.revealed ? "done" : "none";
  if (s.revealed || (coreWords !== null && coreWords.every((w) => s.found!.includes(w)))) return "done";
  return "partial";
}
