// Appends days to data/kelma/normali.json and tqila.json until each has DAYS entries.
//
//   node scripts/extend-kelma.mjs [days]   (default 365)
//
// Existing days are never touched, so already-played puzzles and streaks stay valid.
// New words come from data/source/answer-candidates.json: no flags, a gloss, in the guess list, nouns and
// adjectives only, not already an answer in either mode or a word of the day.
// Normali draws from tiers 1–2, Tqila from tiers 3–4. A seeded shuffle fixes the order.
import { readFileSync, writeFileSync } from "node:fs";

const DAYS = Number(process.argv[2] ?? 365);
const SEED = 0x6b776f72; // "kwor"

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));
const write = (p, data) => writeFileSync(new URL(`../data/${p}`, import.meta.url), JSON.stringify(data, null, 2) + "\n");

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const candidates = read("source/answer-candidates.json");
const lexemes = read("source/lexemes.json");
const guesses = new Set(read("kelma/valid-guesses.json"));
const wordOfDay = new Set(read("kelma/word-of-day.json").map((e) => e.word));
const lists = { normali: read("kelma/normali.json"), tqila: read("kelma/tqila.json") };

const posOf = new Map();
const rootOf = new Map();
for (const l of lexemes) {
  if (!posOf.has(l.word)) posOf.set(l.word, new Set());
  posOf.get(l.word).add(l.pos);
  if (l.root && !rootOf.has(l.word)) rootOf.set(l.word, l.root);
}

const used = new Set([...lists.normali, ...lists.tqila].map((e) => e.word));
const usable = (c) =>
  c.flags.length === 0 &&
  c.gloss.trim() !== "" &&
  guesses.has(c.word) &&
  Array.from(c.word).length === 5 &&
  !used.has(c.word) &&
  !wordOfDay.has(c.word) &&
  [...(posOf.get(c.word) ?? [])].some((p) => p === "NOUN" || p === "ADJ");

// Two meanings are enough on a results card.
const shortGloss = (g) => g.split(";").map((s) => s.trim()).filter(Boolean).slice(0, 2).join("; ");

const rand = mulberry32(SEED);
const tiers = { normali: [1, 2], tqila: [3, 4] };

for (const [name, entries] of Object.entries(lists)) {
  const pool = shuffle(candidates.filter((c) => tiers[name].includes(c.tier) && usable(c)), rand);
  while (entries.length < DAYS) {
    const c = pool.shift();
    if (!c) throw new Error(`${name}: ran out of candidates at day ${entries.length}`);
    used.add(c.word);
    const entry = { day: entries.length, word: c.word, gloss: shortGloss(c.gloss) };
    if (rootOf.has(c.word)) entry.root = rootOf.get(c.word);
    entries.push(entry);
  }
  write(`kelma/${name}.json`, entries);
  console.log(`${name}: ${entries.length} days`);
}
