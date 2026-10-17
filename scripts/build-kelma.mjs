// Builds the Kelma answer lists from day FROM on, by how hard each word is to solve.
//
//   node scripts/build-kelma.mjs [--from N] [days]   (FROM defaults to each list's length; days to 365)
//
// Days before FROM are never touched, so already-played puzzles and streaks stay valid. Pass the
// first day nobody has played yet (tomorrow's day index) to rebuild the rest.
//
// Candidates come from data/source/answer-candidates.json: no flags, a gloss, in the guess list,
// 5 letters, nouns and adjectives only, tier 1–4, not used on a kept day and not a word of the day.
// Each is scored from data/source/kelma-difficulty.json (run scripts/kelma-difficulty.mjs first):
//   solve = solver guesses + 0.25·traps (capped at 10) + 0.6 per unusual letter + 0.8 per repeat
// - Normali: tier 1–3, the easiest by solve + 0.9 per tier above 1 (familiar words first), with
//   unusual letters and repeats counted again (2 and 1.6 in all), since players feel them most.
// - Diffiċli (tqila): tier 2–4, the hardest by solve, but no word the solver needs over 6 guesses
//   for, so it stays winnable. Normali picks first.
// A seeded shuffle then spreads each list over the days.
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const fromArg = args.indexOf("--from");
const FROM = fromArg >= 0 ? Number(args[fromArg + 1]) : null;
const DAYS = Number(args.filter((_, i) => i !== fromArg && i !== fromArg + 1)[0] ?? 365);
const SEED = 0x6b776f72; // "kwor"
/** Letters players read as unusual: X, Ż/Z, Q, the dotted Ġ/Ċ, H, J, W and the G of GĦ. */
const UNUSUAL = new Set(["X", "Ż", "Z", "Q", "Ġ", "Ċ", "H", "J", "W", "G"]);
const DIFFICLI_MAX_STEPS = 6;

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

// Words you've approved by hand (data/source/kelma-approved.json) join the candidates with your
// spelling and meaning, and skip the flag and part-of-speech checks; GAHAN's row becomes ĠAĦAN.
const approved = read("source/kelma-approved.json").map((a) => ({ word: a.word, tier: a.tier, gloss: a.gloss, flags: [], approved: true }));
const candidates = [...read("source/answer-candidates.json").filter((c) => !approved.some((a) => a.word === c.word)), ...approved];
const difficulty = new Map(read("source/kelma-difficulty.json").map((d) => [d.word, d]));
const lexemes = read("source/lexemes.json");
const guesses = new Set(read("kelma/valid-guesses.json"));
const wordOfDay = new Set(read("kelma/word-of-day.json").map((e) => e.word));
const lists = { normali: read("kelma/normali.json"), tqila: read("kelma/tqila.json") };
for (const name of Object.keys(lists)) lists[name] = lists[name].slice(0, FROM ?? lists[name].length);

const posOf = new Map();
const rootOf = new Map();
for (const l of lexemes) {
  if (!posOf.has(l.word)) posOf.set(l.word, new Set());
  posOf.get(l.word).add(l.pos);
  if (l.root && !rootOf.has(l.word)) rootOf.set(l.word, l.root);
}

const used = new Set([...lists.normali, ...lists.tqila].map((e) => e.word));
const usable = candidates
  .filter(
    (c) =>
      c.flags.length === 0 &&
      c.gloss.trim() !== "" &&
      c.tier >= 1 &&
      c.tier <= 4 &&
      guesses.has(c.word) &&
      Array.from(c.word).length === 5 &&
      !used.has(c.word) &&
      !wordOfDay.has(c.word) &&
      (c.approved || [...(posOf.get(c.word) ?? [])].some((p) => p === "NOUN" || p === "ADJ")),
  )
  .map((c) => {
    const d = difficulty.get(c.word);
    if (!d) throw new Error(`${c.word} has no difficulty score: run scripts/kelma-difficulty.mjs`);
    const letters = Array.from(c.word);
    const unusual = letters.filter((l) => UNUSUAL.has(l)).length;
    const repeats = letters.length - new Set(letters).size;
    return { ...c, steps: d.steps, unusual, repeats, solve: d.steps + 0.25 * Math.min(d.traps, 10) + 0.6 * unusual + 0.8 * repeats };
  });

const need = (name) => DAYS - lists[name].length;
// Normali leans harder against unusual letters and repeats: they read as hard to players.
const easiness = (c) => c.solve + 0.9 * (c.tier - 1) + 1.4 * c.unusual + 0.8 * c.repeats;
const normali = usable
  .filter((c) => c.tier <= 3)
  .sort((a, b) => easiness(a) - easiness(b) || a.word.localeCompare(b.word))
  .slice(0, need("normali"));
const taken = new Set(normali.map((c) => c.word));
const tqila = usable
  .filter((c) => c.tier >= 2 && c.steps <= DIFFICLI_MAX_STEPS && !taken.has(c.word))
  .sort((a, b) => b.solve - a.solve || a.word.localeCompare(b.word))
  .slice(0, need("tqila"));

// Two meanings are enough on a results card.
const shortGloss = (g) => g.split(";").map((s) => s.trim()).filter(Boolean).slice(0, 2).join("; ");

const rand = mulberry32(SEED);
for (const [name, picked] of Object.entries({ normali, tqila })) {
  const entries = lists[name];
  if (picked.length < need(name)) throw new Error(`${name}: only ${picked.length} candidates for ${need(name)} days`);
  for (const c of shuffle(picked, rand)) {
    const entry = { day: entries.length, word: c.word, gloss: shortGloss(c.gloss) };
    if (rootOf.has(c.word)) entry.root = rootOf.get(c.word);
    entries.push(entry);
  }
  write(`kelma/${name}.json`, entries);
  const avg = picked.length ? (picked.reduce((s, c) => s + c.steps, 0) / picked.length).toFixed(2) : "-";
  console.log(`${name}: ${entries.length} days (${picked.length} new, solver average ${avg} guesses)`);
}
