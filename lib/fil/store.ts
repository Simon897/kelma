import { filWeekIndex } from "../day-index";
import { KEYS, readJSON, writeJSON } from "../storage";
import type { Progress } from "../today";
import { isSolved, sanitise, type FilState } from "./game";
import { PUZZLES, type FilPuzzle } from "./puzzles";

export const loadFilState = (p: FilPuzzle): FilState => sanitise(p, readJSON(KEYS.filState(p.week)));
export const saveFilState = (p: FilPuzzle, s: FilState) => writeJSON(KEYS.filState(p.week), s);
export const isFilSolved = (p: FilPuzzle) => isSolved(p, loadFilState(p));

/** This week's puzzle on the home page: done when solved, started once a word is found. */
export function filProgressThisWeek(instant: Date = new Date()): Progress {
  const p = PUZZLES[filWeekIndex(instant)];
  if (!p) return "none";
  const s = loadFilState(p);
  return isSolved(p, s) ? "done" : s.found.length ? "partial" : "none";
}
