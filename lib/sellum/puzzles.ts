import puzzles from "../../data/sellum/puzzles.json";
import type { SellumPuzzle } from "./validate";

const LIST = puzzles as SellumPuzzle[];

/** Today's puzzle, or null before Sellum's epoch / after the data runs out. Never wraps. */
export function getSellumPuzzle(day: number): SellumPuzzle | null {
  if (!Number.isInteger(day) || day < 0) return null;
  return LIST.find((p) => p.day === day) ?? null;
}
