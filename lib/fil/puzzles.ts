import data from "../../data/fil/puzzles.json";

/** One word on the board: its tiles in order (0–47, row by row) and its English meaning. */
export interface FilWord {
  word: string;
  gloss: string;
  path: number[];
}

/** One week's puzzle, as written by scripts/build-fil.mjs and checked by scripts/validate-fil.mjs. */
export interface FilPuzzle {
  week: number;
  id: string;
  theme: { mt: string; en: string };
  /** 48 tiles, row by row, 6 to a row. GĦ and IE take two tiles, as in Kelma. */
  grid: string[];
  words: FilWord[];
  /** Every other clean word-sheet word of 4+ letters that can be traced in the grid: each one counts towards a hint. */
  bonus: string[];
}

export const COLS = 6;
export const ROWS = 8;
export const PUZZLES = data as FilPuzzle[];

/** The puzzles out by a week index (0 = Ġimgħa 1): all weeks up to it, or none before launch. */
export function releasedPuzzles(weekIndex: number): FilPuzzle[] {
  return weekIndex < 0 ? [] : PUZZLES.slice(0, weekIndex + 1);
}
