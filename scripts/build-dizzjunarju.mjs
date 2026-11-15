// Builds the Dizzjunarju's word list from the word sheet and the Ġabra dump.
//
//   node scripts/build-dizzjunarju.mjs path/to/gabra    (the folder with lexemes.bson and wordforms.bson)
//
// Writes data/dizzjunarju/words.json: one row per entry, [word, label, meaning, root, tier, number].
// - Only clean sheet rows go in: no flags (pending, archaic, hypothetical, proper noun) and a meaning.
//   Each must match a verified Ġabra entry exactly (same word, part of speech and meanings), or the
//   build stops.
// - The word is spelt as Ġabra spells it, capitals included (Malti, Ingliż).
// - Nouns get their gender from Ġabra: the entry's own gender, or that of the word form spelt like
//   the headword. Where Ġabra gives none, or gives both, the label is plain "n.". Nothing is guessed.
// - Words spelt the same get a number (dar 1, dar 2), most common first.
// - Two rows for the same word and part of speech, where one's meanings are all in the other's,
//   become one entry.
// - EXCLUDE below lists the few clean rows left out by hand, each with the reason.
//
// After this, rebuild the search vectors: node scripts/build-dizzjunarju-embeddings.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bsonDocs } from "./lib/bson.mjs";

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "lexemes.bson")) || !existsSync(join(dir, "wordforms.bson"))) {
  console.error("Usage: node scripts/build-dizzjunarju.mjs path/to/gabra   (the folder with lexemes.bson and wordforms.bson)");
  process.exit(1);
}

/** Clean rows left out by hand: WORD or WORD|POS -> why. */
const EXCLUDE = {
  JULY: "English word",
  POSITIVE: "English word",
  MERCHANDISING: "English word",
  BARCODE: "English word",
  INCOTERMS: "English word",
  UPSTREAM: "English word",
  DOWNSTREAM: "English word",
  TIMESHARE: "English word",
  NETTING: "English word",
  DUMPING: "English word",
  FORFAITING: "English word",
  BEIGE: "English word",
  APRIL: "proper noun",
  ŻVIZZERA: "proper noun",
  MEDITERRAN: "proper noun",
  "STIGMA|VERB": "listed as a verb meaning 'stigma'",
};
/** Rows whose part of speech in the source doesn't fit the meaning: shown with no label. */
const NO_LABEL = new Set(["DAWWARA|INTJ", "QAQ|INTJ", "ŻELLIEQ|INTJ"]);
const LABEL = { VERB: "v.", ADJ: "aġġ.", ADV: "avv.", NUM: "num.", PRON: "pron.", ADP: "prep.", CONJ: "konġ.", INTJ: "interj." };

const up = (s) => s.trim().toLocaleUpperCase("mt");
const tidy = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const sheet = JSON.parse(readFileSync(new URL("../data/source/word-sheet.json", import.meta.url), "utf8"));

/* ---------- clean sheet rows ---------- */
const seen = new Set();
let rows = sheet
  .map((l, i) => ({ ...l, i }))
  .filter((l) => !l.flags.length && l.gloss.trim())
  .filter((l) => {
    const k = [l.word, l.pos, l.gloss, l.root].join("|");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
const cleanCount = rows.length;

/* ---------- Ġabra: spelling, gender ---------- */
const need = new Set(rows.map((l) => l.word));
const byId = new Map();
const byWord = new Map();
for (const d of bsonDocs(join(dir, "lexemes.bson"))) {
  if (!d.lemma || !need.has(up(d.lemma))) continue;
  const lex = {
    lemma: d.lemma.trim(),
    pos: d.pos ?? null,
    gender: d.gender ?? null,
    pending: !!d.pending,
    glosses: (d.glosses ?? []).map((g) => (g.gloss ?? "").trim()).filter(Boolean),
    root: d.root?.radicals ?? null,
    formGenders: new Set(),
    formNumbers: new Set(),
  };
  byId.set(String(d._id), lex);
  byWord.set(up(d.lemma), [...(byWord.get(up(d.lemma)) ?? []), lex]);
}
for (const w of bsonDocs(join(dir, "wordforms.bson"))) {
  const lex = byId.get(String(w.lexeme_id));
  if (!lex || !w.surface_form || w.surface_form.trim().toLocaleLowerCase("mt") !== lex.lemma.toLocaleLowerCase("mt")) continue;
  if (w.gender) lex.formGenders.add(w.gender);
  if (w.number) lex.formNumbers.add(w.number);
}

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
const genderOf = (lex) => {
  const g = new Set([...lex.formGenders].filter((x) => x === "m" || x === "f"));
  if (lex.gender === "m" || lex.gender === "f") g.add(lex.gender);
  return g.size === 1 ? [...g][0] : "";
};
const nounLabel = (lex) => (lex.formNumbers.has("pl") && !lex.formNumbers.has("sg") ? "n.pl." : genderOf(lex) ? `n.${genderOf(lex)}.` : "n.");

for (const r of rows) {
  const score = (lex) => (norm(lex.glosses.join("; ")) === norm(r.gloss) ? 100 : 0) + ((lex.pos ?? null) === (r.pos ?? null) ? 30 : 0) + ((lex.root ?? "").toLowerCase() === (r.root ?? "") ? 5 : 0) + (lex.pending ? 0 : 3);
  const ranked = (byWord.get(r.word) ?? []).map((lex) => ({ lex, s: score(lex) })).sort((a, b) => b.s - a.s);
  if (!ranked.length || ranked[0].s < 130 || ranked[0].lex.pending) {
    console.error(`No verified Ġabra entry matches the sheet row ${r.word} (${r.pos}): ${r.gloss}`);
    process.exit(1);
  }
  r.lemma = ranked[0].lex.lemma;
  if (r.pos === "NOUN") {
    // Two Ġabra entries can match equally well: keep the label only if they agree.
    const labels = new Set(ranked.filter((x) => x.s === ranked[0].s).map((x) => nounLabel(x.lex)));
    r.label = labels.size === 1 ? [...labels][0] : "n.";
  } else r.label = NO_LABEL.has(`${r.word}|${r.pos}`) ? "" : (LABEL[r.pos] ?? "");
}

/* ---------- left out by hand, then near-duplicates ---------- */
const excluded = rows.filter((r) => EXCLUDE[r.word] || EXCLUDE[`${r.word}|${r.pos}`]);
rows = rows.filter((r) => !excluded.includes(r));

const senses = (g) => new Set(g.toLowerCase().replace(/\([^)]*\)/g, "").split(";").map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean));
const groups = new Map();
for (const r of rows) groups.set(`${r.word}|${r.pos}`, [...(groups.get(`${r.word}|${r.pos}`) ?? []), r]);
const merged = new Set();
for (const group of groups.values()) {
  if (group.length < 2) continue;
  for (const x of group) {
    for (const y of group) {
      if (x === y || merged.has(x) || merged.has(y)) continue;
      const a = senses(x.gloss);
      const b = senses(y.gloss);
      if (![...a].every((v) => b.has(v))) continue;
      if (a.size !== b.size || x.gloss.length < y.gloss.length || (x.gloss.length === y.gloss.length && x.i > y.i)) merged.add(x);
    }
  }
}
rows = rows.filter((r) => !merged.has(r));

/* ---------- numbers for words spelt the same ---------- */
const sameSpelling = new Map();
for (const r of rows) sameSpelling.set(r.lemma.toLocaleLowerCase("mt"), [...(sameSpelling.get(r.lemma.toLocaleLowerCase("mt")) ?? []), r]);
for (const group of sameSpelling.values()) {
  if (group.length < 2) continue;
  group.sort((a, b) => a.tier - b.tier || a.i - b.i);
  group.forEach((r, k) => (r.number = k + 1));
}

const out = rows.map((r) => [r.lemma, r.label, tidy(r.gloss), tidy(r.root), r.tier, r.number ?? 0]);
for (const e of out) {
  if (!e[0] || !e[2] || !(e[4] >= 1 && e[4] <= 5)) {
    console.error(`Bad entry: ${JSON.stringify(e)}`);
    process.exit(1);
  }
}
mkdirSync(new URL("../data/dizzjunarju/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/dizzjunarju/words.json", import.meta.url), "[\n" + out.map((e) => JSON.stringify(e)).join(",\n") + "\n]\n");

const count = (label) => out.filter((e) => e[1] === label).length;
console.log(`Wrote ${out.length} entries to data/dizzjunarju/words.json (from ${cleanCount} clean sheet rows).`);
console.log(`Left out by hand: ${excluded.length}. Merged as duplicates: ${merged.size}.`);
console.log(`Nouns: ${count("n.m.")} n.m., ${count("n.f.")} n.f., ${count("n.pl.")} n.pl., ${count("n.")} with no gender in Ġabra.`);
