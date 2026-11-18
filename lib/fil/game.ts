import { COLS, type FilPuzzle } from "./puzzles";

/** Bonus words that fill the hint button once. */
export const WORDS_PER_HINT = 3;
/** Shortest word that counts towards a hint. */
export const MIN_BONUS = 4;

export interface FilState {
  /** Theme words found, in the order found. */
  found: string[];
  /** Other words traced, in the order found. */
  bonus: string[];
  /** Bonus words not yet spent on a hint. */
  credit: number;
  /** The theme word the current hint outlines. */
  hint: string | null;
  hintsUsed: number;
}

export const newFilState = (): FilState => ({ found: [], bonus: [], credit: 0, hint: null, hintsUsed: 0 });

const tiles = (w: string) => Array.from(w);
export const isSolved = (p: FilPuzzle, s: FilState) => s.found.length >= p.words.length;

export const adjacent = (a: number, b: number) =>
  a !== b && Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) <= 1 && Math.abs((a % COLS) - (b % COLS)) <= 1;

/** Tiles already taken by found words: they can't be picked again. */
export function lockedTiles(p: FilPuzzle, s: FilState): Set<number> {
  return new Set(p.words.filter((w) => s.found.includes(w.word)).flatMap((w) => w.path));
}

/**
 * The selection after touching a tile. Going back onto the tile before the last one steps back.
 * When dragging, only a neighbour of the last tile adds on. When tapping, tapping the last tile again
 * means "confirm" (returned as "submit"), a tile earlier in the selection cuts back to it, and a tile
 * that doesn't join on starts a new selection.
 */
export function touchTile(sel: number[], tile: number, locked: Set<number>, tapping: boolean): number[] | "submit" {
  if (locked.has(tile)) return sel;
  const last = sel[sel.length - 1];
  if (sel.length >= 2 && tile === sel[sel.length - 2]) return sel.slice(0, -1);
  if (sel.includes(tile)) {
    if (!tapping) return sel;
    if (tile === last) return "submit";
    return sel.slice(0, sel.indexOf(tile) + 1);
  }
  if (!sel.length || adjacent(last, tile)) return [...sel, tile];
  return tapping ? [tile] : sel;
}

export type Verdict = { kind: "theme" | "bonus" | "already" | "short" | "invalid"; word: string };

const sameTiles = (a: number[], b: number[]) => a.length === b.length && [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();

/** What a traced selection is. A theme word counts only on its own tiles (each can be traced on just one set). */
export function judge(p: FilPuzzle, s: FilState, sel: number[]): Verdict {
  const word = sel.map((c) => p.grid[c]).join("");
  const w = p.words.find((x) => x.word === word && sameTiles(x.path, sel));
  if (w) return { kind: s.found.includes(word) ? "already" : "theme", word };
  if (tiles(word).length < MIN_BONUS) return { kind: "short", word };
  if (p.bonus.includes(word)) return { kind: s.bonus.includes(word) ? "already" : "bonus", word };
  return { kind: "invalid", word };
}

/** The state after a verdict (unchanged for "already", "short" and "invalid"). */
export function apply(s: FilState, v: Verdict): FilState {
  if (v.kind === "theme") return { ...s, found: [...s.found, v.word], hint: s.hint === v.word ? null : s.hint };
  if (v.kind === "bonus") return { ...s, bonus: [...s.bonus, v.word], credit: s.credit + 1 };
  return s;
}

/** A hint can be used with enough bonus words, while no outlined word is still waiting to be found. */
export function canHint(p: FilPuzzle, s: FilState): boolean {
  if (isSolved(p, s) || s.credit < WORDS_PER_HINT) return false;
  return !(s.hint && !s.found.includes(s.hint));
}

/** Use a hint: outline the tiles of one unfound word, picked at random. */
export function takeHint(p: FilPuzzle, s: FilState, rand: () => number = Math.random): FilState {
  if (!canHint(p, s)) return s;
  const left = p.words.filter((w) => !s.found.includes(w.word));
  const pick = left[Math.floor(rand() * left.length)];
  return { ...s, credit: s.credit - WORDS_PER_HINT, hintsUsed: s.hintsUsed + 1, hint: pick.word };
}

/** Saved state for this puzzle, with anything that doesn't fit it dropped (puzzles can be fixed later). */
export function sanitise(p: FilPuzzle, raw: unknown): FilState {
  const base = newFilState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<FilState>;
  const words = new Set(p.words.map((w) => w.word));
  const found = Array.isArray(r.found) ? [...new Set(r.found.filter((w) => words.has(w)))] : [];
  const bonus = Array.isArray(r.bonus) ? [...new Set(r.bonus.filter((w) => p.bonus.includes(w)))] : [];
  const hint = typeof r.hint === "string" && words.has(r.hint) ? r.hint : null;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
  return { found, bonus, credit: num(r.credit), hint, hintsUsed: num(r.hintsUsed) };
}
