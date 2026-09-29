/** Content contract checks. Pure and dependency-free so the build script and tests share it. */

export interface AnswerEntry {
  day: number;
  word: string;
  gloss: string;
  root?: string;
  note?: string;
}

const TILE = /^[A-BD-ZĠĦŻĊ]$/u;

function checkWord(word: unknown, where: string, errors: string[]) {
  if (typeof word !== "string") {
    errors.push(`${where}: word is not a string`);
    return;
  }
  const chars = Array.from(word);
  if (chars.length !== 5) errors.push(`${where}: "${word}" is ${chars.length} characters, not 5`);
  if (!chars.every((c) => TILE.test(c))) errors.push(`${where}: "${word}" has characters outside the uppercase Maltese alphabet`);
}

export function validateData(
  lists: Record<string, AnswerEntry[]>,
  validGuesses: string[],
): string[] {
  const errors: string[] = [];
  const guessSet = new Set(validGuesses);

  validGuesses.forEach((w, i) => checkWord(w, `valid-guesses[${i}]`, errors));
  if (guessSet.size !== validGuesses.length) errors.push("valid-guesses: contains duplicates");

  for (const [name, entries] of Object.entries(lists)) {
    if (!Array.isArray(entries) || entries.length === 0) {
      errors.push(`${name}: must be a non-empty array`);
      continue;
    }
    const days = entries.map((e) => e.day);
    const sorted = [...days].sort((a, b) => a - b);
    const seen = new Set<number>();
    for (const d of days) {
      if (!Number.isInteger(d) || d < 0) errors.push(`${name}: day ${d} is not a non-negative integer`);
      if (seen.has(d)) errors.push(`${name}: day ${d} repeats`);
      seen.add(d);
    }
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i && !(i > 0 && sorted[i] === sorted[i - 1])) {
        errors.push(`${name}: days must run 0..${sorted.length - 1} with no gaps (gap before day ${sorted[i]})`);
        break;
      }
    }
    entries.forEach((e) => {
      const where = `${name} day ${e.day}`;
      checkWord(e.word, where, errors);
      if (typeof e.gloss !== "string" || e.gloss.trim() === "") errors.push(`${where}: gloss is required`);
      if (typeof e.word === "string" && !guessSet.has(e.word)) errors.push(`${where}: "${e.word}" is missing from valid-guesses`);
      const extra = Object.keys(e).filter((k) => !["day", "word", "gloss", "root", "note"].includes(k));
      if (extra.length) errors.push(`${where}: unexpected fields ${extra.join(", ")} (no tiers in shipped data)`);
    });
  }
  return errors;
}
