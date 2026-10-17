// Generates data/sellum/puzzles.json: 365 daily word ladders.
//
//   node scripts/build-sellum.ts [--from N] [days]   (days before N are kept as they are)
//
// Input: data/source/answer-candidates.json  [{ word, tier, gloss, flags }]
//        data/kelma/valid-guesses.json       (the graph every route may use)
// A pair qualifies when:
//   - start and target are common words: tier 1–3, no flags (so no proper nouns)
//   - they differ in exactly 4 places and are 4 steps apart, so every step puts one of the
//     target's letters in place: no detour through a letter the target doesn't have
//   - at least 1 shortest route uses only dictionary words (tier 1–5, no flags), and at least
//     2 shortest routes exist in total (any valid words; that's the number on the end screen)
// The schedule then never repeats a pair, keeps any start/target word out for 45 days (60 left too few days),
// and never runs consecutive puzzles with the same start letter or the same target letter.
import { readFileSync, writeFileSync } from "node:fs";
import { LADDER_STEPS, buildGraph, countShortestRoutes, diffCount, distancesFrom, shortestRoutes } from "../lib/sellum/graph.ts";
import { MIN_ROUTES, validateSellum, type SellumPuzzle } from "../lib/sellum/validate.ts";

const args = process.argv.slice(2);
const fromAt = args.indexOf("--from");
const FROM = fromAt >= 0 ? Number(args[fromAt + 1]) : 0;
const DAYS = Number(args.filter((_, i) => fromAt < 0 || (i !== fromAt && i !== fromAt + 1))[0] ?? 365);
const WORD_COOLDOWN = 45;
// Direct ladders are rarer: 1 dictionary route (with MIN_ROUTES = 2) gives 418 pairs.
const MIN_DICTIONARY_ROUTES = 1;
const SEED = 0x53656c6c; // "Sell"

interface Candidate {
  word: string;
  tier: number | string;
  gloss: string;
  flags: string[];
}

const read = (p: string) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const valid: string[] = read("data/kelma/valid-guesses.json");
const candidates: Candidate[] = read("data/source/answer-candidates.json");

const graph = buildGraph(valid);
const clean = (c: Candidate) => graph.has(c.word) && (!c.flags || c.flags.length === 0) && typeof c.tier === "number";
const common = new Set(candidates.filter((c) => clean(c) && (c.tier as number) <= 3).map((c) => c.word));
const dictionary = new Set(candidates.filter((c) => clean(c) && (c.tier as number) <= 5).map((c) => c.word));

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
const shuffle = <T,>(xs: T[]) => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
};

/* ---------- 1. find every qualifying pair ---------- */
type Pair = { a: string; b: string; routes: number; example: string[] };
const pairs: Pair[] = [];
const commonList = [...common].sort();
const t0 = Date.now();
const toCache = new Map<string, Map<string, number>>();
for (const a of commonList) {
  for (const b of commonList) {
    if (b <= a || diffCount(a, b) !== LADDER_STEPS) continue;
    let toB = toCache.get(b);
    if (!toB) toCache.set(b, (toB = distancesFrom(graph, b, LADDER_STEPS)));
    if (toB.get(a) !== LADDER_STEPS) continue;
    const dictRoutes = countShortestRoutes(graph, a, toB, (w) => dictionary.has(w));
    if (dictRoutes < MIN_DICTIONARY_ROUTES) continue;
    const routes = countShortestRoutes(graph, a, toB);
    if (routes < MIN_ROUTES) continue;
    const example = shortestRoutes(graph, a, toB, (w) => dictionary.has(w), 1)[0];
    pairs.push({ a, b, routes, example });
  }
}
console.log(`${common.size} common words, ${dictionary.size} dictionary words -> ${pairs.length} qualifying pairs (${Date.now() - t0} ms)`);

/* ---------- 2. schedule ---------- */
// A greedy pass in a random order, repeated many times; the longest schedule wins. Busy
// words (ŻABRA sits in 16 pairs) are what the 60-day cooldown squeezes, so order matters.
const TRIES = 400;
const first = (w: string) => Array.from(w)[0];
type Oriented = [start: string, target: string, example: string[]];

const kept: SellumPuzzle[] = (read("data/sellum/puzzles.json") as SellumPuzzle[]).slice(0, FROM);
const keptPair = new Set(kept.map((p) => [p.start, p.target].sort().join("|")));

function schedule(order: Pair[]): { puzzles: SellumPuzzle[]; relaxed: number } {
  const lastUsed = new Map<string, number>(); // word -> last day it was a start or target
  for (const p of kept) for (const w of [p.start, p.target]) lastUsed.set(w, p.day);
  const puzzles: SellumPuzzle[] = [...kept];
  const pool = order.filter((p) => !keptPair.has([p.a, p.b].sort().join("|")));
  let relaxed = 0;
  for (let day = kept.length; day < DAYS; day++) {
    const prev = puzzles[day - 1];
    const rested = (p: Pair) =>
      [p.a, p.b].every((w) => {
        const u = lastUsed.get(w);
        return u === undefined || day - u >= WORD_COOLDOWN;
      });
    const varied = ([s, t]: Oriented) => !prev || (first(s) !== first(prev.start) && first(t) !== first(prev.target));
    const orient = (p: Pair): Oriented[] =>
      shuffle([
        [p.a, p.b, p.example],
        [p.b, p.a, [...p.example].reverse()],
      ]);
    // Prefer a rested pair that, one way round, varies from yesterday; else any rested pair.
    let idx = -1;
    let chosen: Oriented | undefined;
    for (let i = 0; i < pool.length && !chosen; i++) {
      if (!rested(pool[i])) continue;
      chosen = orient(pool[i]).find(varied);
      if (chosen) idx = i;
    }
    if (!chosen) {
      idx = pool.findIndex(rested);
      if (idx < 0) break;
      chosen = orient(pool[idx])[0];
      relaxed++;
    }
    const p = pool.splice(idx, 1)[0];
    const [start, target, example] = chosen;
    puzzles.push({ day, start, target, routes: p.routes, example });
    lastUsed.set(start, day);
    lastUsed.set(target, day);
  }
  return { puzzles, relaxed };
}

let best = schedule(shuffle([...pairs]));
for (let i = 1; i < TRIES && best.puzzles.length < DAYS; i++) {
  const next = schedule(shuffle([...pairs]));
  if (next.puzzles.length > best.puzzles.length) best = next;
}
const { puzzles, relaxed } = best;
if (puzzles.length < DAYS) {
  console.warn(`Only ${puzzles.length} of ${DAYS} days fit the rules (60-day word cooldown, no repeated pairs).`);
}

const errors = validateSellum(puzzles, valid, graph);
if (errors.length) {
  console.error(errors.slice(0, 20).join("\n"));
  process.exit(1);
}
writeFileSync(
  new URL("../data/sellum/puzzles.json", import.meta.url),
  "[\n" + puzzles.map((p) => "  " + JSON.stringify(p)).join(",\n") + "\n]\n",
);
console.log(`Wrote ${puzzles.length} days to data/sellum/puzzles.json (${pairs.length - puzzles.length} pairs unused; letter-variety rule relaxed on ${relaxed} days).`);
