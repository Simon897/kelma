export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export const FLIP_MS = 300;
export const FLIP_STAGGER_MS = 180;
/** Input stays locked for exactly this long after a guess. */
export const REVEAL_MS = (WORD_LENGTH - 1) * FLIP_STAGGER_MS + 350;
/** The result panel waits for the reveal plus this, so it never covers the moment. */
export const RESULT_DELAY_MS = REVEAL_MS + 1200;

export type LetterState = "correct" | "present" | "absent";
export type GameStatus = "playing" | "won" | "lost";

/** Split a word into tiles. Every tile is one Unicode character (GĦ and IE are two tiles). */
export function tiles(word: string): string[] {
  return Array.from(word);
}

/**
 * Two-pass scoring so duplicate letters are handled correctly:
 * 1. exact matches are `correct`; unmatched solution letters go into a tally;
 * 2. remaining guess letters are `present` only while the tally has a copy left.
 */
export function scoreGuess(guess: string, solution: string): LetterState[] {
  const g = tiles(guess);
  const s = tiles(solution);
  const result: LetterState[] = new Array(g.length).fill("absent");
  const remaining = new Map<string, number>();

  for (let i = 0; i < g.length; i++) {
    if (g[i] === s[i]) result[i] = "correct";
    else remaining.set(s[i], (remaining.get(s[i]) ?? 0) + 1);
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === "correct") continue;
    const left = remaining.get(g[i]) ?? 0;
    if (left > 0) {
      result[i] = "present";
      remaining.set(g[i], left - 1);
    }
  }
  return result;
}

const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

/** Best known state for each letter across all guesses: correct > present > absent. */
export function keyboardStates(guesses: string[], solution: string): Record<string, LetterState> {
  const states: Record<string, LetterState> = {};
  for (const guess of guesses) {
    const scores = scoreGuess(guess, solution);
    tiles(guess).forEach((letter, i) => {
      const prev = states[letter];
      if (!prev || RANK[scores[i]] > RANK[prev]) states[letter] = scores[i];
    });
  }
  return states;
}

const MALTESE_EXTRA = new Set(["Ġ", "Ħ", "Ż", "Ċ"]);

/**
 * Normalise a typed character to a Maltese tile letter, or null to reject it.
 * Maltese has no plain C, so C becomes Ċ.
 */
export function normaliseKey(key: string): string | null {
  if (Array.from(key).length !== 1) return null;
  const upper = key.toLocaleUpperCase("mt");
  if (upper === "C") return "Ċ";
  if (/^[A-BD-Z]$/.test(upper)) return upper;
  if (MALTESE_EXTRA.has(upper)) return upper;
  return null;
}

export const KEYBOARD_ROWS: string[][] = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "Ġ", "H", "Ħ", "J", "K", "L"],
  ["ENTER", "Z", "Ż", "X", "Ċ", "V", "B", "N", "M", "BACKSPACE"],
];
