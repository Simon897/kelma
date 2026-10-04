import { isBonus, rootKey, type GherqPuzzle, type Lexicon } from "./game.ts";

/** Core words (the ones the stars count) per puzzle; bonus words come on top. */
export const MIN_WORDS = 6;
export const MAX_WORDS = 20;
export const MIN_ONE_POINT = 3;
export const ROOT_COOLDOWN = 365;

/** Radicals that turn into vowels or vanish in many forms (ĦIEN from Ħ-J-N, MEXA from M-X-J). */
const WEAK = new Set(["J", "W", "'"]);
/**
 * Only plain three-letter roots make puzzles: exactly three radicals, and no weak one (J, W, ')
 * in the middle or at the end, where it hides inside the words and makes the family hard to see.
 * A W or J at the start stays visible (WAQAF, WILED), so it's allowed.
 */
export function isSimpleRoot(root: string[]): boolean {
  const r = root.map((x) => x.toLocaleUpperCase("mt"));
  return r.length === 3 && r[0] !== "'" && !WEAK.has(r[1]) && !WEAK.has(r[2]);
}

/** Build-time checks for data/gherq/puzzles.json. Returns a list of problems (empty = OK). */
export function validateGherq(puzzles: GherqPuzzle[], lexicon: Lexicon): string[] {
  const errors: string[] = [];
  if (!Array.isArray(puzzles) || puzzles.length === 0) return ["gherq: puzzles must be a non-empty array"];

  const days = puzzles.map((p) => p.day).sort((a, b) => a - b);
  days.forEach((d, i) => {
    if (d !== i) errors.push(`gherq: days must run 0..${days.length - 1} with no repeats or gaps (found ${d} at position ${i})`);
  });

  const lastSeen = new Map<string, number>();
  for (const p of [...puzzles].sort((a, b) => a.day - b.day)) {
    const at = `gherq day ${p.day} (${p.root?.join("-")})`;
    const key = rootKey(p.root ?? []);
    if (!isSimpleRoot(p.root ?? [])) errors.push(`${at}: only plain three-letter roots (no J, W or ' in the middle or at the end)`);
    const prev = lastSeen.get(key);
    if (prev !== undefined && p.day - prev < ROOT_COOLDOWN) errors.push(`${at}: root repeats within ${ROOT_COOLDOWN} days (day ${prev})`);
    lastSeen.set(key, p.day);

    const words = p.words ?? [];
    const core = words.filter((w) => !isBonus(w)).length;
    if (core < MIN_WORDS || core > MAX_WORDS) errors.push(`${at}: has ${core} core words, needs ${MIN_WORDS}–${MAX_WORDS}`);
    if (words.filter((w) => w.points === 1).length < MIN_ONE_POINT) errors.push(`${at}: needs at least ${MIN_ONE_POINT} one-point words`);

    const spellings = new Set<string>();
    for (const w of words) {
      if (![1, 2, 3].includes(w.points)) errors.push(`${at}: ${w.word} has points ${w.points}, must be 1, 2 or 3`);
      if (!w.gloss?.trim()) errors.push(`${at}: ${w.word} has no gloss`);
      for (const s of [w.word, ...(w.alts ?? [])]) {
        if (spellings.has(s)) errors.push(`${at}: ${s} appears twice (counting alternative spellings)`);
        spellings.add(s);
        const roots = lexicon[s];
        const list = roots == null ? [] : Array.isArray(roots) ? roots : [roots];
        if (!(s in lexicon)) errors.push(`${at}: ${s} is not in lexicon.json`);
        else if (!list.includes(key)) errors.push(`${at}: lexicon.json doesn't give ${s} the root ${key}`);
      }
    }
  }
  return errors;
}
