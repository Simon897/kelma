// Types for fil-grid.mjs, for the TypeScript tests.
export interface GridWord {
  word: string;
  path: number[];
}
export interface GridPuzzle {
  id?: string;
  grid: string[];
  words?: GridWord[];
}
export const COLS: number;
export const ROWS: number;
export const N: number;
export function chars(w: string): string[];
export function adjacent(a: number, b: number): boolean;
export function tileSets(grid: string[], word: string): number;
export function checkPuzzle(p: GridPuzzle): string[];
export function traceableWords(grid: string[], dict: Set<string>, maxLen?: number): Set<string>;
