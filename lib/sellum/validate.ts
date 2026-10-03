import { LADDER_STEPS, buildGraph, countShortestRoutes, diffCount, distancesFrom, type WordGraph } from "./graph.ts";

export interface SellumPuzzle {
  day: number;
  start: string;
  target: string;
  /** Number of shortest routes (any valid words), shown on the end screen. */
  routes: number;
  /** One legal route, 5 words, start to target. */
  example: string[];
}

export const MIN_ROUTES = 3;

/** Build-time checks for data/sellum/puzzles.json. Returns a list of problems (empty = OK). */
export function validateSellum(puzzles: SellumPuzzle[], validGuesses: string[], graph?: WordGraph): string[] {
  const errors: string[] = [];
  if (!Array.isArray(puzzles) || puzzles.length === 0) return ["sellum: puzzles must be a non-empty array"];
  const g = graph ?? buildGraph(validGuesses);

  const days = puzzles.map((p) => p.day).sort((a, b) => a - b);
  days.forEach((d, i) => {
    if (d !== i) errors.push(`sellum: days must run 0..${days.length - 1} with no repeats or gaps (found ${d} at position ${i})`);
  });

  for (const p of puzzles) {
    const at = `sellum day ${p.day}`;
    if (!g.has(p.start)) errors.push(`${at}: start "${p.start}" is not in the word list`);
    if (!g.has(p.target)) errors.push(`${at}: target "${p.target}" is not in the word list`);
    const toTarget = distancesFrom(g, p.target, LADDER_STEPS);
    if (toTarget.get(p.start) !== LADDER_STEPS) {
      errors.push(`${at}: ${p.start} -> ${p.target} is ${toTarget.get(p.start) ?? "more than 4"} steps, not exactly ${LADDER_STEPS}`);
      continue;
    }
    const ex = p.example;
    const legal =
      Array.isArray(ex) &&
      ex.length === LADDER_STEPS + 1 &&
      ex[0] === p.start &&
      ex[LADDER_STEPS] === p.target &&
      ex.every((w, i) => g.has(w) && toTarget.get(w) === LADDER_STEPS - i) &&
      ex.every((w, i) => i === 0 || diffCount(ex[i - 1], w) === 1);
    if (!legal) errors.push(`${at}: example ${JSON.stringify(ex)} is not a legal route`);
    if (!(p.routes >= MIN_ROUTES)) errors.push(`${at}: routes is ${p.routes}, needs at least ${MIN_ROUTES}`);
    const actual = countShortestRoutes(g, p.start, toTarget);
    if (actual !== p.routes) errors.push(`${at}: routes says ${p.routes} but there are ${actual}`);
  }
  return errors;
}
