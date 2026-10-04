// Generates data/gherq/puzzles.json (one root a day) and data/gherq/lexicon.json.
//
//   node scripts/build-gherq.ts [days]
//
// Input: data/source/lexemes.json  [{ word, alts, root, pos, gloss, tier, flags }]
// - Lexicon: every flag-free dictionary word of 2–15 letters (and its alternative spellings)
//   -> its root, several roots for multi-root spellings, or null.
// - Puzzles: dictionary words grouped by root, dropping flagged entries, multi-word entries,
//   proper nouns, non noun/verb/adjective entries and anything outside 2–15 letters. Homographs
//   from the same root merge (glosses combined); alternative spellings fold in. Points come from
//   the tier; tiers 4–5 are bonus words (3 points, never needed for the stars). Plain
//   three-letter roots (no weak J/W in the middle or at the end) with 6–20 core words, at least 3
//   of them worth 1 point, qualify.
// - Schedule: easier roots (more 1-point words) early in the week, richer roots later; no two
//   consecutive roots share a radical; no root repeats within 365 days.
import { readFileSync, writeFileSync } from "node:fs";
import { GHERQ_EPOCH } from "../lib/day-index.ts";
import { MAX_LETTERS, MIN_LETTERS, pointsForTier, type GherqPuzzle, type GherqWord, type Lexicon } from "../lib/gherq/game.ts";
import { MAX_WORDS, MIN_ONE_POINT, MIN_WORDS, isSimpleRoot, validateGherq } from "../lib/gherq/validate.ts";
import { EXAMPLE_ROOT_KEY } from "../lib/gherq/example.ts";

const DAYS = Number(process.argv[2] ?? 365);
const SEED = 0x47686572; // "Gher"

interface Lexeme {
  word: string;
  alts?: string[];
  root: string | null;
  pos: string | null;
  gloss: string;
  tier: number | null;
  flags?: string[];
}

const read = (p: string) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const lexemes: Lexeme[] = read("data/source/lexemes.json");

const LETTERS = /^[A-BD-XZĠĦŻĊ]+$/u; // Maltese letters only: no C (it's Ċ), no Y, no spaces/apostrophes
const len = (w: string) => Array.from(w).length;
const okSpelling = (w: string) => LETTERS.test(w) && len(w) >= MIN_LETTERS && len(w) <= MAX_LETTERS;
const BAD_FLAGS = ["pending", "hypothetical", "archaic", "proper noun", "multiword"];
const clean = (l: Lexeme) => !(l.flags ?? []).some((f) => BAD_FLAGS.includes(f)) && l.pos !== "PROPN";
const POS = ["VERB", "NOUN", "ADJ"];
const mainPos = (pos: string | null) => (pos ?? "").split(/[|,]/).map((s) => s.trim()).find((p) => POS.includes(p)) ?? null;
const normRoot = (r: string | null) => (r ? r.trim().toLocaleLowerCase("mt") : null);

/* ---------- 1. lexicon ---------- */
const lexicon: Lexicon = {};
const addLex = (spelling: string, root: string | null) => {
  if (!okSpelling(spelling)) return;
  const cur = lexicon[spelling];
  if (cur === undefined) return void (lexicon[spelling] = root);
  if (root === null) return;
  const list = cur === null ? [] : Array.isArray(cur) ? cur : [cur];
  if (!list.includes(root)) list.push(root);
  lexicon[spelling] = list.length === 1 ? list[0] : list;
};
for (const l of lexemes) {
  if (!clean(l)) continue;
  for (const s of [l.word, ...(l.alts ?? [])]) addLex(s, normRoot(l.root));
}

/* ---------- 2. word families ---------- */
const families = new Map<string, Map<string, GherqWord & { tier: number | null }>>();
for (const l of lexemes) {
  const root = normRoot(l.root);
  const pos = mainPos(l.pos);
  if (!root || !pos || !clean(l) || !okSpelling(l.word) || !l.gloss) continue;
  const fam = families.get(root) ?? new Map();
  families.set(root, fam);
  const prev = fam.get(l.word);
  if (prev) {
    // homograph from the same root: one word, both meanings; the more familiar tier wins
    if (!prev.gloss.split("; ").includes(l.gloss)) prev.gloss = `${prev.gloss}; ${l.gloss}`;
    for (const a of l.alts ?? []) if (okSpelling(a) && !prev.alts.includes(a)) prev.alts.push(a);
    if (l.tier !== null && (prev.tier === null || l.tier < prev.tier)) {
      prev.tier = l.tier;
      prev.points = pointsForTier(l.tier);
    }
    continue;
  }
  fam.set(l.word, { word: l.word, alts: (l.alts ?? []).filter(okSpelling), pos, gloss: l.gloss, points: pointsForTier(l.tier), tier: l.tier });
}

// An alternative spelling that is itself a headword in the family folds into it.
for (const fam of families.values()) {
  for (const w of [...fam.values()]) for (const a of w.alts) fam.delete(a);
}

const radicals = (root: string) => root.split("-").map((r) => r.toLocaleUpperCase("mt"));
type Family = { root: string; words: GherqWord[]; ease: number };
const qualifying: Family[] = [];
for (const [root, fam] of families) {
  const words = [...fam.values()].map(({ tier: _t, ...w }) => w);
  // Stars count core words only; rare (bonus) words come on top.
  const core = words.filter((w) => w.points !== 3).length;
  const ones = words.filter((w) => w.points === 1).length;
  if (core < MIN_WORDS || core > MAX_WORDS || ones < MIN_ONE_POINT) continue;
  if (root === EXAMPLE_ROOT_KEY) continue; // shown in full on the how-to-play page
  if (!isSimpleRoot(radicals(root))) continue; // plain three-letter roots only
  qualifying.push({ root, words, ease: ones / core });
}
console.log(`${lexemes.length} lexemes -> ${Object.keys(lexicon).length} lexicon spellings, ${families.size} roots, ${qualifying.length} qualifying (${MIN_WORDS}–${MAX_WORDS} core words, ≥${MIN_ONE_POINT} worth 1 point)`);

/* ---------- 3. schedule ---------- */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const pool = [...qualifying];
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}

// Weekday (0 = Monday) of each day, counted from the epoch.
const [y, m, d] = GHERQ_EPOCH.split("-").map(Number);
const epochWeekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
const weekday = (day: number) => (epochWeekday + day) % 7;
const shares = (a: string, b: string) => radicals(a).some((r) => radicals(b).includes(r));

// No root repeats within 365 days, so a year needs as many roots as days.
const days = Math.min(DAYS, pool.length);

/**
 * One greedy pass. Radicals like Ħ sit in a big share of roots, so at each step the roots
 * carrying the most-remaining radicals go first (when they don't clash with yesterday), with
 * the weekday's target ease as the tie-break. Returns the order and its number of clashes.
 */
function schedule(order: Family[]): { picked: Family[]; clashes: number } {
  const remaining = [...order];
  const picked: Family[] = [];
  let clashes = 0;
  for (let day = 0; day < days; day++) {
    const want = 0.8 - (weekday(day) / 6) * 0.6; // Monday easiest … Sunday richest
    const prev = picked[day - 1];
    const load = new Map<string, number>();
    for (const f of remaining) for (const r of radicals(f.root)) load.set(r, (load.get(r) ?? 0) + 1);
    const weight = (f: Family) => Math.max(...radicals(f.root).map((r) => load.get(r) ?? 0));
    let candidates = remaining.filter((f) => !prev || !shares(f.root, prev.root));
    if (!candidates.length) {
      candidates = remaining;
      clashes++;
    }
    const best = candidates
      .slice(0, 40)
      .sort((x, y) => weight(y) - weight(x) || Math.abs(x.ease - want) - Math.abs(y.ease - want))[0];
    remaining.splice(remaining.indexOf(best), 1);
    picked.push(best);
  }
  return { picked, clashes };
}

let best = schedule(pool);
for (let attempt = 0; attempt < 400 && best.clashes > 0; attempt++) {
  const order = [...pool];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const next = schedule(order);
  if (next.clashes < best.clashes) best = next;
}
const chosen = best.picked;

const puzzles: GherqPuzzle[] = chosen.map((f, day) => {
  const words = [...f.words].sort((a, b) => len(a.word) - len(b.word) || a.word.localeCompare(b.word, "mt"));
  return {
    day,
    root: radicals(f.root),
    words,
  };
});

const errors = validateGherq(puzzles, lexicon);
if (errors.length) {
  console.error(errors.slice(0, 20).join("\n"));
  process.exit(1);
}
const consecutiveShared = puzzles.filter((p, i) => i > 0 && shares(p.root.join("-").toLocaleLowerCase("mt"), puzzles[i - 1].root.join("-").toLocaleLowerCase("mt"))).length;
writeFileSync(new URL("../data/gherq/puzzles.json", import.meta.url), JSON.stringify(puzzles) + "\n");
writeFileSync(new URL("../data/gherq/lexicon.json", import.meta.url), JSON.stringify(lexicon) + "\n");
console.log(
  `Wrote ${puzzles.length} days to data/gherq/puzzles.json${puzzles.length < DAYS ? ` (only ${pool.length} qualifying roots, and roots can't repeat within 365 days)` : ""}; consecutive days sharing a radical: ${consecutiveShared}.`,
);
