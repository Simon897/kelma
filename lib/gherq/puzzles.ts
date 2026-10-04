import puzzles from "../../data/gherq/puzzles.json";
import type { GherqPuzzle } from "./game";

const LIST = puzzles as GherqPuzzle[];

/** Today's root, or null before Għerq's epoch / after the data runs out. Never wraps. */
export function getGherqPuzzle(day: number): GherqPuzzle | null {
  if (!Number.isInteger(day) || day < 0) return null;
  return LIST.find((p) => p.day === day) ?? null;
}
