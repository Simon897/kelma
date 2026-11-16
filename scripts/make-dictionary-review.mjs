// Writes dizzjunarju-review.xlsx: the sheet's unverified ("pending") words that have a meaning, for
// the editor to add to the Dizzjunarju, correct, or leave out. The dictionary itself only takes
// clean rows (no flags, with a meaning), so these words stay out until they are answered here.
//
//   node scripts/make-dictionary-review.mjs
//
// Run it again at any time: if dizzjunarju-review.xlsx is already there, the answers in it (and any
// corrections and notes) are carried over, the rows stay in the same order, and only the
// "Check first" hints are brought up to date. The old file is first copied to
// dizzjunarju-review.backup.xlsx. Close the sheet in Excel before running.
//
// Left out of the review: rows with no meaning, rows whose word is "?", and pending rows that are
// also flagged hypothetical, archaic or proper noun.
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeXlsx } from "./lib/xlsx-write.mjs";
import { readSheet } from "./lib/xlsx.mjs";

export const DECISIONS = { add: "✓ Add as it is", fix: "✎ Add with my corrections", no: "✗ Leave out" };
/** The one value of the "Archaic?" column: the entry will carry the label "ark.". */
export const ARCHAIC = "Yes";
export const POS_CHOICES = ["noun (m)", "noun (f)", "noun (pl)", "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection", "numeral"];
const OUT = new URL("../dizzjunarju-review.xlsx", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const sheet = read("data/source/word-sheet.json");
const wordforms = read("data/source/wordforms.json");
const dictionary = read("data/dizzjunarju/words.json");
const dictionaryForms = read("data/dizzjunarju/forms.json");

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

// Forms the dictionary's search already finds: KOTBA -> ktieb. (data/dizzjunarju/forms.json)
const foundBySearch = new Map();
dictionary.forEach((r, i) => {
  for (const form of dictionaryForms[i] ? dictionaryForms[i].split(" ") : []) {
    const key = form.toLocaleUpperCase("mt");
    const list = foundBySearch.get(key) ?? [];
    if (!list.some((x) => x.head === r[0])) list.push({ head: r[0], gloss: first(r[2]) });
    foundBySearch.set(key, list);
  }
});

// Answers already given in an earlier copy of the sheet, by Ref.
const HEADER = ["Your answer", "Word", "Meaning", "Part of speech", "How common", "Check first", "Corrected word", "Corrected meaning", "Corrected part of speech", "Archaic?", "Notes", "Ref"];
const KEPT = ["Your answer", "Corrected word", "Corrected meaning", "Corrected part of speech", "Archaic?", "Notes"];
const previous = new Map();
const previousOrder = [];
if (existsSync(OUT)) {
  const path = fileURLToPath(OUT);
  const [head, ...old] = readSheet(path, "Review");
  const col = Object.fromEntries(HEADER.map((name) => [name, Object.keys(head).find((k) => (head[k] ?? "").trim() === name)]));
  if (!col.Ref || !col["Your answer"]) throw new Error("dizzjunarju-review.xlsx has no Ref or Your answer column; not touching it.");
  for (const r of old) {
    const ref = (r[col.Ref] ?? "").trim();
    if (!ref) continue;
    previousOrder.push(ref);
    previous.set(ref, Object.fromEntries(KEPT.map((name) => [name, col[name] ? (r[col[name]] ?? "") : ""])));
  }
  copyFileSync(path, path.replace(/\.xlsx$/, ".backup.xlsx"));
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
  const found = foundBySearch.get(l.word);
  const forms = found ? null : formOf.get(l.word);
  if (found) {
    notes.push(`Searching this word already finds ${found.map((x) => `${x.head} (${x.gloss})`).join(", ")}: it is another form of that entry. Leave out unless it needs an entry of its own.`);
    rank = Math.max(rank, 2);
  }
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
// An updated sheet keeps its rows where they were, so the reviewer doesn't lose their place.
if (previous.size) {
  const at = new Map(previousOrder.map((ref, i) => [ref, i]));
  const place = (r) => at.get(String(r.ref)) ?? previousOrder.length;
  rows.sort((a, b) => place(a) - place(b));
}
const kept = (r, name) => previous.get(String(r.ref))?.[name] ?? "";
// A sheet from before the "Archaic?" column: a note saying the word is archaic becomes a tick.
const archaic = (r) => (kept(r, "Archaic?").trim() || (/\b(archaic|arkajk)/i.test(kept(r, "Notes")) ? ARCHAIC : ""));
const answered = rows.filter((r) => kept(r, "Your answer").trim()).length;
const lost = [...previous].filter(([ref, v]) => KEPT.some((n) => v[n].trim()) && !rows.some((r) => String(r.ref) === ref));
if (lost.length) throw new Error(`${lost.length} answered rows are no longer in the review (Ref ${lost.map((x) => x[0]).join(", ")}); not overwriting the sheet.`);

const TIER = { 1: "Very common", 2: "Common", 3: "Less common", 4: "Uncommon", 5: "Rare" };
const POS_NAME = { NOUN: "noun", VERB: "verb", ADJ: "adjective", ADV: "adverb", PRON: "pronoun", ADP: "preposition", CONJ: "conjunction", INTJ: "interjection", NUM: "numeral" };

const review = [HEADER.map((v) => ({ v, s: "header" }))];
for (const r of rows) {
  review.push([
    { v: kept(r, "Your answer"), s: "decide" },
    { v: r.word, s: "bold" },
    { v: r.gloss, s: "wrap" },
    { v: POS_NAME[r.pos] ?? "not given", s: POS_NAME[r.pos] ? "normal" : "muted" },
    { v: TIER[r.tier] ?? "No data", s: "normal" },
    { v: r.notes.join(" "), s: r.rank === 3 ? "medium" : "muted" },
    { v: kept(r, "Corrected word"), s: "decide" },
    { v: kept(r, "Corrected meaning"), s: "decide" },
    { v: kept(r, "Corrected part of speech"), s: "decide" },
    { v: archaic(r), s: "decide" },
    { v: kept(r, "Notes"), s: "wrap" },
    { v: String(r.ref), s: "muted" },
  ]);
}

const searchable = rows.filter((r) => foundBySearch.has(r.word.toLocaleUpperCase("mt")));
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
  [{ v: `2. If a word you are adding is archaic (no longer in everyday use), pick "${ARCHAIC}" in the "Archaic?" column. Its entry will carry the label "ark.".`, s: "wrap" }],
  [{ v: "3. Leave a row blank to skip it. It stays out of the dictionary and is asked again next time.", s: "wrap" }],
  [{ v: "4. Save the file and tell Claude it's done.", s: "wrap" }],
  [""],
  [{ v: "Things to know", s: "bold" }],
  [{ v: `• Words are shown in small letters. If one needs a capital (Malti, Ingliż), type it in "Corrected word".`, s: "wrap" }],
  [{ v: `• Where "Part of speech" says "not given" or just "noun", you can pick one in "Corrected part of speech", with the gender for nouns. Without it the entry shows no label, or plain "n.".`, s: "wrap" }],
  [{ v: `• Many meanings start with a capital letter or have typos. Fix them in "Corrected meaning" if you want them tidy.`, s: "wrap" }],
  [{ v: `• Do not change the "Ref" column. It ties each row back to the word sheet.`, s: "wrap" }],
  [""],
  ...(previous.size
    ? [
        [{ v: "This sheet was updated", s: "bold" }],
        [{ v: `• Your ${answered} answers, corrections and notes are kept, and the rows are in the same order as before.`, s: "wrap" }],
        [{ v: `• Only the "Check first" column changed. ${searchable.length} rows now say the word is already found by the dictionary's search, as another form of an entry (kotba finds ktieb). Those can be left out unless the word needs an entry of its own; ${searchable.filter((r) => kept(r, "Your answer").trim()).length} of them you had already answered, so have another look at those.`, s: "wrap" }],
        [{ v: "• The sheet as it was before the update is saved next to it as dizzjunarju-review.backup.xlsx.", s: "wrap" }],
      ]
    : [
        [{ v: "Order of the rows", s: "bold" }],
        [{ v: `• First ${counts.plain} rows: nothing odd spotted. Most common words first.`, s: "wrap" }],
        [{ v: `• Next ${counts.dup}: the word is already in the dictionary with another meaning.`, s: "wrap" }],
        [{ v: `• Next ${counts.form}: the spelling is another form of a word (a plural, a feminine, a verb form). Most are already found by the dictionary's search.`, s: "wrap" }],
        [{ v: `• Last ${counts.odd}: has a C or Y, the meaning just repeats the word, or the meaning looks unfinished.`, s: "wrap" }],
      ]),
  [{ v: "• You don't have to finish. Any answers help.", s: "wrap" }],
];

writeXlsx(OUT, [
  { name: "Start here", cols: [110], rows: start },
  {
    name: "Review",
    cols: [26, 18, 48, 14, 14, 52, 18, 40, 22, 11, 24, 7],
    rows: review,
    freeze: true,
    filter: true,
    lists: [
      { col: 0, from: 2, to: review.length, values: Object.values(DECISIONS) },
      { col: 8, from: 2, to: review.length, values: POS_CHOICES },
      { col: 9, from: 2, to: review.length, values: [ARCHAIC] },
    ],
  },
]);
if (previous.size) console.log(`Kept ${answered} answers from the existing sheet (backup: dizzjunarju-review.backup.xlsx). ${searchable.length} rows are now found by search.`);
console.log(`Wrote dizzjunarju-review.xlsx: ${counts.total} words (${counts.plain} plain, ${counts.dup} already in the dictionary, ${counts.form} forms of another word, ${counts.odd} to check closely).`);
