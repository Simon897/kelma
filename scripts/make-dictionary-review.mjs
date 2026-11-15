// Writes dizzjunarju-review.xlsx: the sheet's unverified ("pending") words that have a meaning, for
// the editor to add to the Dizzjunarju, correct, or leave out. The dictionary itself only takes
// clean rows (no flags, with a meaning), so these words stay out until they are answered here.
//
//   node scripts/make-dictionary-review.mjs
//
// Left out of the review: rows with no meaning, rows whose word is "?", and pending rows that are
// also flagged hypothetical, archaic or proper noun.
import { readFileSync } from "node:fs";
import { writeXlsx } from "./lib/xlsx-write.mjs";

export const DECISIONS = { add: "✓ Add as it is", fix: "✎ Add with my corrections", no: "✗ Leave out" };
export const POS_CHOICES = ["noun (m)", "noun (f)", "noun (pl)", "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection", "numeral"];
const OUT = new URL("../dizzjunarju-review.xlsx", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const sheet = read("data/source/word-sheet.json");
const wordforms = read("data/source/wordforms.json");

const low = (s) => s.toLocaleLowerCase("mt");
const first = (gloss) => gloss.split(";")[0].trim();

// What the dictionary already has, and which spellings are a form of another headword.
const inDictionary = new Map();
for (const l of sheet) {
  if (l.flags.length || !l.gloss.trim()) continue;
  inDictionary.set(l.word, [...(inDictionary.get(l.word) ?? []), l]);
}
const KIND = { pl: "a plural", f: "a feminine form", verb: "a verb form" };
const formOf = new Map();
for (const [head, forms] of Object.entries(wordforms)) {
  for (const [form, kind] of Object.entries(forms)) {
    if (form === head) continue;
    formOf.set(form, [...(formOf.get(form) ?? []), { head, kind }]);
  }
}

const rows = [];
sheet.forEach((l, ref) => {
  const gloss = l.gloss.trim();
  if (!gloss || l.word === "?" || l.flags.length !== 1 || l.flags[0] !== "pending") return;
  const notes = [];
  let rank = 0;
  const same = inDictionary.get(l.word);
  if (same) {
    notes.push(`Already in the dictionary as: ${same.map((s) => first(s.gloss)).join(" / ")}. Add only if this is a different meaning.`);
    rank = 1;
  }
  const forms = formOf.get(l.word);
  if (forms) {
    notes.push(`Also ${forms.map((f) => `${KIND[f.kind]} of ${low(f.head)}`).join(", ")}. The dictionary lists the main form only.`);
    rank = Math.max(rank, 2);
  }
  const english = /[CY]/.test(l.word) || gloss.toLowerCase().split(/[;,]/).some((g) => g.trim().replace(/^to /, "") === l.word.toLowerCase());
  if (english) {
    notes.push(/[CY]/.test(l.word) ? "Has a C or Y, so probably English or a name. Leave out if it is not a Maltese word." : "The meaning just repeats the word. Check it is a Maltese word and give it a real meaning.");
    rank = 3;
  }
  if (/\?/.test(gloss)) {
    notes.push("The meaning looks unfinished.");
    rank = 3;
  }
  rows.push({ ref, word: low(l.word), gloss, pos: l.pos, tier: l.tier, notes, rank });
});
rows.sort((a, b) => a.rank - b.rank || (a.tier ?? 9) - (b.tier ?? 9) || a.word.localeCompare(b.word, "mt"));

const TIER = { 1: "Very common", 2: "Common", 3: "Less common", 4: "Uncommon", 5: "Rare" };
const POS_NAME = { NOUN: "noun", VERB: "verb", ADJ: "adjective", ADV: "adverb", PRON: "pronoun", ADP: "preposition", CONJ: "conjunction", INTJ: "interjection", NUM: "numeral" };

const header = ["Your answer", "Word", "Meaning", "Part of speech", "How common", "Check first", "Corrected word", "Corrected meaning", "Corrected part of speech", "Notes", "Ref"];
const review = [header.map((v) => ({ v, s: "header" }))];
for (const r of rows) {
  review.push([
    { v: "", s: "decide" },
    { v: r.word, s: "bold" },
    { v: r.gloss, s: "wrap" },
    { v: POS_NAME[r.pos] ?? "not given", s: POS_NAME[r.pos] ? "normal" : "muted" },
    { v: TIER[r.tier] ?? "No data", s: "normal" },
    { v: r.notes.join(" "), s: r.rank === 3 ? "medium" : "muted" },
    { v: "", s: "decide" },
    { v: "", s: "decide" },
    { v: "", s: "decide" },
    { v: "", s: "wrap" },
    { v: String(r.ref), s: "muted" },
  ]);
}

const counts = { total: rows.length, plain: rows.filter((r) => r.rank === 0).length, dup: rows.filter((r) => r.rank === 1).length, form: rows.filter((r) => r.rank === 2).length, odd: rows.filter((r) => r.rank === 3).length };
const start = [
  [{ v: "Dizzjunarju: unverified words", s: "title" }],
  [""],
  [{ v: `These ${counts.total} words are in the word sheet with a meaning, but Ġabra has not verified them, so they are not in the Dizzjunarju. Words you approve here get added.`, s: "wrap" }],
  [""],
  [{ v: "How to answer (Review tab)", s: "bold" }],
  [{ v: `1. In the yellow "Your answer" column, pick from the dropdown:`, s: "wrap" }],
  [{ v: `     ${DECISIONS.add}: the word, meaning and part of speech are all right.`, s: "wrap" }],
  [{ v: `     ${DECISIONS.fix}: type what should change in the yellow "Corrected" columns. Leave a "Corrected" cell blank to keep what is there.`, s: "wrap" }],
  [{ v: `     ${DECISIONS.no}: not a Maltese dictionary word (English, a name, a verb form, a wrong meaning you can't fix).`, s: "wrap" }],
  [{ v: "2. Leave a row blank to skip it. It stays out of the dictionary and is asked again next time.", s: "wrap" }],
  [{ v: "3. Save the file and tell Claude it's done.", s: "wrap" }],
  [""],
  [{ v: "Things to know", s: "bold" }],
  [{ v: `• Words are shown in small letters. If one needs a capital (Malti, Ingliż), type it in "Corrected word".`, s: "wrap" }],
  [{ v: `• Where "Part of speech" says "not given" or just "noun", you can pick one in "Corrected part of speech", with the gender for nouns. Without it the entry shows no label, or plain "n.".`, s: "wrap" }],
  [{ v: `• Many meanings start with a capital letter or have typos. Fix them in "Corrected meaning" if you want them tidy.`, s: "wrap" }],
  [{ v: `• Do not change the "Ref" column. It ties each row back to the word sheet.`, s: "wrap" }],
  [""],
  [{ v: "Order of the rows", s: "bold" }],
  [{ v: `• First ${counts.plain} rows: nothing odd spotted. Most common words first.`, s: "wrap" }],
  [{ v: `• Next ${counts.dup}: the word is already in the dictionary with another meaning.`, s: "wrap" }],
  [{ v: `• Next ${counts.form}: the spelling is also a plural, feminine or verb form of another word.`, s: "wrap" }],
  [{ v: `• Last ${counts.odd}: has a C or Y, the meaning just repeats the word, or the meaning looks unfinished.`, s: "wrap" }],
  [{ v: "• You don't have to finish. Any answers help.", s: "wrap" }],
];

writeXlsx(OUT, [
  { name: "Start here", cols: [110], rows: start },
  {
    name: "Review",
    cols: [26, 18, 48, 14, 14, 52, 18, 40, 22, 24, 7],
    rows: review,
    freeze: true,
    filter: true,
    lists: [
      { col: 0, from: 2, to: review.length, values: Object.values(DECISIONS) },
      { col: 8, from: 2, to: review.length, values: POS_CHOICES },
    ],
  },
]);
console.log(`Wrote dizzjunarju-review.xlsx: ${counts.total} words (${counts.plain} plain, ${counts.dup} already in the dictionary, ${counts.form} forms of another word, ${counts.odd} to check closely).`);
