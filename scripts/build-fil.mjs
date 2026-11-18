// Builds Fil's puzzles: data/fil/puzzles.json, one per week, from data/source/fil-themes.json.
//
//   node scripts/build-fil.mjs            (then: node scripts/validate-fil.mjs)
//
// A puzzle already in data/fil/puzzles.json that passes every grid rule keeps its layout, so a
// published week never changes. One that fails is laid out again with exactly the same words.
// A new week picks 6–9 of its theme's `words` adding up to 48 letters.
// Words must be Dizzjunarju headwords (data/dizzjunarju/words.json), which give their English meanings.
// Each puzzle also gets its bonus words, for the hints: every clean word-sheet word of 4+ letters
// that can be traced in its grid.
import { readFileSync, writeFileSync } from "node:fs";
import { checkPuzzle, layOut, pickWords, rng, traceableWords } from "./lib/fil-grid.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const OUT = new URL("../data/fil/puzzles.json", import.meta.url);
const themes = read("../data/source/fil-themes.json");
let existing = [];
try {
  existing = read("../data/fil/puzzles.json");
} catch {
  /* first build */
}

const up = (s) => s.toLocaleUpperCase("mt");
const meaning = new Map();
for (const r of read("../data/dizzjunarju/words.json")) if (!meaning.has(up(r[0]))) meaning.set(up(r[0]), r[2]);
const short = (m) => m.replace(/\([^)]*\)/g, "").split(";").map((s) => s.trim()).filter(Boolean).slice(0, 2).join("; ");

// Valid words for the hints: clean word-sheet rows (no flags, a meaning), letters only.
const LETTERS = /^[A-ZĊĠĦŻ]+$/u;
const valid = new Set(read("../data/source/word-sheet.json").filter((w) => !w.flags.length && w.gloss && LETTERS.test(w.word)).map((w) => w.word));

const report = [];
const puzzles = themes.map((th, i) => {
  const week = i + 1;
  const old = existing.find((p) => p.id === th.id);
  let layout = old && checkPuzzle(old).length === 0 ? { grid: old.grid, words: old.words } : null;
  if (!layout) {
    const r = rng(20261118 + week);
    const fixed = old ? old.words.map((w) => w.word) : null;
    for (let t = 0; t < 400 && !layout; t++) {
      const chosen = fixed ?? pickWords(th.words, r);
      if (!chosen) throw new Error(`${th.id}: no 6–9 of its words add up to 48 letters`);
      const order = r.shuffle([...chosen]);
      const got = layOut(order, r, Date.now() + 2000);
      if (!got) continue;
      layout = { grid: got.grid, words: order.map((word, j) => ({ word, path: got.paths[j] })) };
    }
    if (!layout) throw new Error(`${th.id}: couldn't lay out a grid`);
    report.push({ week, id: th.id, why: old ? checkPuzzle(old) : ["new"] });
  }
  for (const w of layout.words) if (!meaning.has(w.word)) throw new Error(`${th.id}: ${w.word} isn't a Dizzjunarju headword`);
  const words = layout.words.map(({ word, path }) => ({ word, gloss: short(meaning.get(word)), path }));
  const own = new Set(words.map((w) => w.word));
  const bonus = [...traceableWords(layout.grid, valid)].filter((w) => !own.has(w)).sort();
  return { week, id: th.id, theme: th.theme, grid: layout.grid, words, bonus };
});

writeFileSync(OUT, "[\n" + puzzles.map((p) => JSON.stringify(p)).join(",\n") + "\n]\n");
console.log(`Wrote ${puzzles.length} puzzles to data/fil/puzzles.json.`);
for (const p of puzzles) console.log(`  week ${p.week} ${p.id}: ${p.words.map((w) => w.word).join(", ")} (${p.bonus.length} bonus words)`);
if (report.length) {
  console.log("Laid out again:");
  for (const r of report) console.log(`  week ${r.week} ${r.id}: ${r.why.join("; ")}`);
}
