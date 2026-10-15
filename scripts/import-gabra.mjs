// Builds Għerq's source data from the full Ġabra dump (mongodump .bson files).
//
//   node scripts/import-gabra.mjs path/to/gabra    (the folder with lexemes.bson and wordforms.bson)
//   node scripts/build-gherq.ts                    # then rebuild the puzzles
//
// Writes:
// - data/source/lexemes.json   [{ word, alts, root, pos, gloss, tier, flags }]
//   Every verified Ġabra headword (not pending, archaic, hypothetical, multi-word, a proper noun or a
//   place name), with its alternative spellings. Tier and flags come from the word-tiers sheet
//   (data/source/word-sheet.json) where the word is there; otherwise tier is null, so in Għerq it is a
//   bonus word. Sheet words Ġabra doesn't have are kept as they are. Roots answered in the review
//   sheet (root-review.json, a root or null for "no root") override Ġabra's.
// - data/source/wordforms.json  { HEADWORD: { FORM: "pl" | "f" | "verb" } }
//   Plurals (and duals), feminine forms and plain verb forms (no object pronouns, no negation) of
//   every rooted noun, adjective and verb, so Għerq can say "try the singular" instead of "not a word".
//
// Keep a safe copy of the dump: Ġabra's site no longer serves it.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bsonDocs } from "./lib/bson.mjs";

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "lexemes.bson"))) {
  console.error("Usage: node scripts/import-gabra.mjs path/to/gabra   (the folder with lexemes.bson and wordforms.bson)");
  process.exit(1);
}

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));
const up = (s) => s.trim().toLocaleUpperCase("mt");
const POS = new Set(["NOUN", "VERB", "ADJ"]);

const sheet = read("source/word-sheet.json");
const reviewUrl = new URL("../data/source/root-review.json", import.meta.url);
const review = existsSync(reviewUrl) ? JSON.parse(readFileSync(reviewUrl, "utf8")) : {};
const sheetBy = new Map();
for (const l of sheet) {
  const list = sheetBy.get(l.word) ?? [];
  list.push(l);
  sheetBy.set(l.word, list);
}

/* ---------- headwords ---------- */
const out = [];
const usedSheet = new Set();
const lexemeOf = new Map(); // Ġabra id -> { word, pos } for rooted nouns, verbs and adjectives
let skipped = 0;
for (const d of bsonDocs(join(dir, "lexemes.bson"))) {
  if (!d.lemma || d.pending || d.archaic || d.hypothetical || d.multiword || d.pos === "PROPN" || d.onomastic_type) {
    skipped++;
    continue;
  }
  const word = up(d.lemma);
  const pos = d.pos ?? null;
  // The sheet can hold the same word twice (a pending, rootless row and a clean one): prefer the
  // row with the same part of speech, then the clean one, then one with a root, then the most familiar.
  const rank = (l) => [
    (l.pos ?? "").split(/[|,]/).map((s) => s.trim()).includes(pos) ? 0 : 1,
    (l.flags ?? []).length ? 1 : 0,
    l.root ? 0 : 1,
    l.tier ?? 9,
  ];
  const byRank = (a, b) => rank(a).reduce((d, v, i) => d || v - rank(b)[i], 0);
  const match = [...(sheetBy.get(word) ?? [])].sort(byRank)[0];
  if (match) usedSheet.add(match);
  let root = d.root?.radicals ? d.root.radicals.trim().toLocaleLowerCase("mt") : (match?.root ?? null);
  if (word in review) root = review[word];
  const gloss = (d.glosses ?? []).map((g) => g.gloss?.trim()).filter(Boolean).slice(0, 3).join("; ") || match?.gloss || "";
  out.push({
    word,
    alts: (d.alternatives ?? []).map(up).filter((a) => a && a !== word),
    root,
    pos,
    gloss,
    tier: match?.tier ?? null,
    // Ġabra has verified this entry, so the sheet's "pending" no longer applies.
    flags: (match?.flags ?? []).filter((f) => f !== "pending"),
  });
  if (root && POS.has(pos)) lexemeOf.set(d._id, { word, pos });
}
const kept = sheet.filter((l) => !usedSheet.has(l) && !out.some((o) => o.word === l.word));
out.push(...kept);
writeFileSync(new URL("../data/source/lexemes.json", import.meta.url), JSON.stringify(out) + "\n");
console.log(`lexemes: ${out.length} (${out.length - kept.length} from Ġabra, ${kept.length} sheet-only kept; ${skipped} Ġabra entries skipped)`);

/* ---------- word forms ---------- */
const forms = {};
let n = 0;
for (const f of bsonDocs(join(dir, "wordforms.bson"))) {
  const lex = lexemeOf.get(f.lexeme_id);
  if (!lex || !f.surface_form) continue;
  let kind = null;
  if (lex.pos === "VERB") {
    if (["perf", "impf", "imp"].includes(f.aspect) && f.polarity !== "neg" && !f.dir_obj && !f.ind_obj) kind = "verb";
  } else if (f.number === "pl" || f.number === "dl") kind = "pl";
  else if (f.gender === "f") kind = "f";
  if (!kind) continue;
  const form = up(f.surface_form);
  if (form === lex.word || /\s/.test(form)) continue;
  (forms[lex.word] ??= {})[form] ??= kind;
  n++;
}
writeFileSync(new URL("../data/source/wordforms.json", import.meta.url), JSON.stringify(forms) + "\n");
console.log(`wordforms: ${Object.keys(forms).length} headwords, ${Object.values(forms).reduce((s, m) => s + Object.keys(m).length, 0)} forms (${n} matched)`);
