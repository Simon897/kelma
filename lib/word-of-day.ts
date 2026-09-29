/**
 * Kelma ta' kuljum: one rare word a day (Ġabra tier 5, no flags, with a meaning), any length.
 * The list in data/kelma/word-of-day.json is already shuffled; day N shows entry N mod length.
 * Unlike the puzzles it wraps around, and it runs before the epoch too.
 */
export interface WordOfDay {
  word: string;
  gloss: string;
}

/** Game words are stored uppercase; word-of-day words keep Ġabra's lowercase. */
export const toAnswerForm = (word: string) => word.toLocaleUpperCase("mt");

/**
 * Today's word. Skips any word that is (or will be) a Kelma answer in either mode,
 * so the word of the day can never give away a puzzle.
 */
export function pickWordOfDay(list: WordOfDay[], day: number, answers: ReadonlySet<string>): WordOfDay | null {
  const n = list.length;
  if (n === 0) return null;
  const start = ((day % n) + n) % n;
  for (let i = 0; i < n; i++) {
    const entry = list[(start + i) % n];
    if (!answers.has(toAnswerForm(entry.word))) return entry;
  }
  return null;
}
