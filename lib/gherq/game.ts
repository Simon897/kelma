/**
 * Għerq: find every dictionary word that grows from today's root.
 * Pure and dependency-free, so the browser, the build-time validator and the generator share it.
 */

export interface GherqWord {
  word: string;
  /** Ġabra's alternative spellings: typing any of them finds this word, once. */
  alts: string[];
  pos: string;
  gloss: string;
  points: 1 | 2 | 3;
}

export interface GherqPuzzle {
  day: number;
  /** Radicals as display tiles; a digraph radical like "GĦ" is one element. */
  root: string[];
  words: GherqWord[];
}

/** Spelling -> root ("k-t-b"), several roots for multi-root spellings, or null for no root. */
export type Lexicon = Record<string, string | string[] | null>;

export const MIN_LETTERS = 2;
export const MAX_LETTERS = 15;

export const tiles = (w: string) => Array.from(w);
export const rootKey = (root: string[]) => root.join("-").toLocaleLowerCase("mt");
export const rootLabel = (root: string[]) => root.join("-");

/**
 * Points by word familiarity: tiers 1–2 → 1, tier 3 → 2. Uncommon and rare words (tiers 4–5, or
 * no data) are bonus words worth 3: they count if found, but no star ever needs them.
 */
export function pointsForTier(tier: number | null | undefined): 1 | 2 | 3 {
  if (tier === 1 || tier === 2) return 1;
  if (tier === 3) return 2;
  return 3;
}

/** A bonus word: a rare word of the root (3 points, a golden pod), never needed for the stars. */
export const isBonus = (w: GherqWord) => w.points === 3;
/** The words the stars are counted on: everything but the bonus words. */
export const coreWords = (p: GherqPuzzle) => p.words.filter((w) => !isBonus(w));
export const bonusWords = (p: GherqPuzzle) => p.words.filter(isBonus);

/** Every accepted spelling -> its canonical word. */
export function spellingIndex(puzzle: GherqPuzzle): Map<string, string> {
  const m = new Map<string, string>();
  for (const w of puzzle.words) {
    m.set(w.word, w.word);
    for (const a of w.alts) m.set(a, w.word);
  }
  return m;
}

const rootsOf = (entry: string | string[] | null | undefined): string[] =>
  entry == null ? [] : Array.isArray(entry) ? entry : [entry];

export type EntryKind = "short" | "ok" | "repeat" | "wrong-root" | "not-word" | "excluded" | "pending";

/**
 * How a typed entry is treated (rules table §2). Wrong answers never cost anything.
 * "pending" means the lexicon hasn't loaded yet: check again shortly, never "not a word".
 */
export function classifyEntry(
  entry: string,
  puzzle: GherqPuzzle,
  found: ReadonlySet<string>,
  lexicon: Lexicon | null,
): { kind: EntryKind; word?: string } {
  if (tiles(entry).length < MIN_LETTERS) return { kind: "short" };
  const canonical = spellingIndex(puzzle).get(entry);
  if (canonical) return { kind: found.has(canonical) ? "repeat" : "ok", word: canonical };
  if (!lexicon) return { kind: "pending" };
  if (!(entry in lexicon)) return { kind: "not-word" };
  // A real word of today's root that isn't in the puzzle (e.g. removed in approval) doesn't count.
  return { kind: rootsOf(lexicon[entry]).includes(rootKey(puzzle.root)) ? "excluded" : "wrong-root" };
}

/** Points for the stars: core words only. */
export const totalPoints = (p: GherqPuzzle) => coreWords(p).reduce((s, w) => s + w.points, 0);
export function earnedPoints(p: GherqPuzzle, found: ReadonlySet<string>): number {
  return coreWords(p).reduce((s, w) => s + (found.has(w.word) ? w.points : 0), 0);
}
/** Extra points from bonus words found (shown on top, never counted for stars). */
export function bonusPoints(p: GherqPuzzle, found: ReadonlySet<string>): number {
  return bonusWords(p).reduce((s, w) => s + (found.has(w.word) ? w.points : 0), 0);
}
/** Core words found (what the share line and progress count). */
export const coreFound = (p: GherqPuzzle, found: ReadonlySet<string>) => coreWords(p).filter((w) => found.has(w.word)).length;

/**
 * Points needed for stars 2–5 (thresholds round up); star 1 is the first word found.
 * A 9-point puzzle: [3, 5, 7, 9].
 */
export function starThresholds(total: number): number[] {
  return [0.25, 0.5, 0.75, 1].map((f) => Math.ceil(total * f));
}

export function starsFor(earned: number, total: number, foundCount: number): number {
  if (foundCount === 0) return 0;
  return 1 + starThresholds(total).filter((t) => earned >= t).length;
}

/** Points to the next star, or null at five stars. */
export function nextStarIn(earned: number, total: number, foundCount: number): number | null {
  if (foundCount === 0) return null; // the first word earns the first star
  const next = starThresholds(total).find((t) => earned < t);
  return next === undefined ? null : next - earned;
}

/** Easiest first: fewest points, then shortest, then A–Z. */
const byEase = (a: GherqWord, b: GherqWord) => a.points - b.points || tiles(a.word).length - tiles(b.word).length || a.word.localeCompare(b.word, "mt");

/** The clue list: every core word, easiest first (bonus words aren't listed). */
export const clueOrder = (p: GherqPuzzle) => coreWords(p).sort(byEase);

/**
 * What a hint reveals for a word: the first letter that isn't one of the root's letters (those
 * are on screen already), with its position. A word made only of root letters reveals its first.
 */
export function hintLetter(word: string, root: string[]): { index: number; letter: string } {
  const rootLetters = new Set(root.flatMap((r) => tiles(r.toLocaleUpperCase("mt"))));
  const t = tiles(word);
  const index = Math.max(0, t.findIndex((l) => !rootLetters.has(l)));
  return { index, letter: t[index] };
}

/** The next word a hint helps with: the easiest one not found or hinted yet. */
export function nextHint(p: GherqPuzzle, found: ReadonlySet<string>, hinted: readonly string[]): GherqWord | null {
  return clueOrder(p).find((w) => !found.has(w.word) && !hinted.includes(w.word)) ?? null;
}

/** Found list order: by length, then alphabetically. */
export const byLengthThenAlpha = (a: string, b: string) => tiles(a).length - tiles(b).length || a.localeCompare(b, "mt");

/** Share text: never any found words. Counts are core words; bonus words found are added on. */
export function gherqShareText(opts: { day: number; root: string[]; stars: number; found: number; total: number; bonus?: number; hints: number; lang: "mt" | "en" }): string {
  const stars = "★".repeat(opts.stars) + "☆".repeat(5 - opts.stars);
  const words = opts.lang === "mt" ? "kliem" : "words";
  const bonus = opts.bonus ? ` +${opts.bonus} bonus` : "";
  const lines = [`Għerq #${opts.day + 1} · ${rootLabel(opts.root)}`, `${stars} ${opts.found}/${opts.total} ${words}${bonus}`];
  if (opts.hints > 0) {
    lines.push(opts.lang === "mt" ? `${opts.hints} ${opts.hints === 1 ? "ħjiel" : "ħjiliet"}` : `${opts.hints} ${opts.hints === 1 ? "hint" : "hints"}`);
  }
  return lines.join("\n");
}

/* ------------------------------ state ------------------------------ */

export interface GherqState {
  day: number;
  /** Canonical words found. */
  found: string[];
  hints: number;
  revealed: boolean;
  /** Words whose meaning a hint revealed (so the hint cards survive a reload). */
  hinted: string[];
}

export function newGherqState(day: number): GherqState {
  return { day, found: [], hints: 0, revealed: false, hinted: [] };
}

export function normaliseGherqState(raw: Partial<GherqState> | null, day: number): GherqState {
  if (!raw || raw.day !== day || !Array.isArray(raw.found)) return newGherqState(day);
  const strs = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);
  return {
    day,
    found: strs(raw.found),
    hints: Number.isInteger(raw.hints) ? Math.max(0, raw.hints as number) : 0,
    revealed: raw.revealed === true,
    hinted: strs(raw.hinted),
  };
}

/* ------------------------------ stats ------------------------------ */

export interface GherqStats {
  played: number;
  currentStreak: number;
  maxStreak: number;
  /** Days that ended on 1–5 stars (index 0 = 1 star). */
  stars: number[];
  totalStars: number;
  lastDay: number | null;
  lastDayStars: number;
  /** Last day with at least one star: the streak rule. */
  lastStarDay: number | null;
}

export function emptyGherqStats(): GherqStats {
  return { played: 0, currentStreak: 0, maxStreak: 0, stars: [0, 0, 0, 0, 0], totalStars: 0, lastDay: null, lastDayStars: 0, lastStarDay: null };
}

export function normaliseGherqStats(raw: Partial<GherqStats> | null | undefined): GherqStats {
  const base = emptyGherqStats();
  if (!raw || typeof raw !== "object") return base;
  const stars = Array.isArray(raw.stars) && raw.stars.length === 5 ? raw.stars.map((n) => (Number.isFinite(n) ? n : 0)) : base.stars;
  return { ...base, ...raw, stars };
}

/**
 * Records today's stars. Called whenever the day's stars change: the first call of a day counts
 * it as played; later calls move it between star buckets. A day with ≥1 star extends the streak.
 */
export function recordStars(stats: GherqStats, day: number, stars: number): GherqStats {
  if (stars < 1) return stats;
  const next: GherqStats = { ...stats, stars: [...stats.stars] };
  if (stats.lastDay === day) {
    if (stars <= stats.lastDayStars) return stats;
    next.stars[stats.lastDayStars - 1] -= 1;
    next.stars[stars - 1] += 1;
    next.totalStars += stars - stats.lastDayStars;
    next.lastDayStars = stars;
    return next;
  }
  if (stats.lastDay !== null && day < stats.lastDay) return stats;
  next.played += 1;
  next.stars[stars - 1] += 1;
  next.totalStars += stars;
  next.lastDay = day;
  next.lastDayStars = stars;
  next.currentStreak = stats.lastStarDay === day - 1 ? stats.currentStreak + 1 : 1;
  next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
  next.lastStarDay = day;
  return next;
}

export function displayGherqStreak(stats: GherqStats, today: number): number {
  return stats.lastStarDay !== null && stats.lastStarDay >= today - 1 ? stats.currentStreak : 0;
}

export const averageStars = (s: GherqStats) => (s.played ? s.totalStars / s.played : 0);
