// Builds the Dizzjunarju's word list from the word sheet and the Ġabra dump.
//
//   node scripts/build-dizzjunarju.mjs path/to/gabra    (the folder with lexemes.bson and wordforms.bson)
//
// Writes data/dizzjunarju/words.json: one row per entry, [word, label, meaning, root, tier, number, forms?],
// and data/dizzjunarju/forms.json: for each row, every other form of the word, for the search.
// - Only clean sheet rows go in: no flags (pending, hypothetical, proper noun) and a meaning.
// - A row whose only flag is "archaic" goes in too, marked archaic (the entry is labelled "ark.") and
//   given tier 5: the sheet's tier counts how often the spelling turns up, and an old word often
//   shares its spelling with a common one (tagħna, "a stabbing", is tier 1 because of "our").
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
/** Forms Ġabra doesn't have, added by hand: [{ word, pos?, kind, form, note }]. */
const HAND_FORMS = new URL("../data/source/dizzjunarju-forms.json", import.meta.url);
const LABEL = { VERB: "v.", ADJ: "aġġ.", ADV: "avv.", NUM: "num.", PRON: "pron.", ADP: "prep.", CONJ: "konġ.", INTJ: "interj." };

const up = (s) => s.trim().toLocaleUpperCase("mt");
const tidy = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const sheet = JSON.parse(readFileSync(new URL("../data/source/word-sheet.json", import.meta.url), "utf8"));

/* ---------- clean sheet rows ---------- */
const isArchaic = (l) => l.flags.length === 1 && l.flags[0] === "archaic";
const seen = new Set();
let rows = sheet
  .map((l, i) => ({ ...l, i }))
  .filter((l) => (!l.flags.length || isArchaic(l)) && l.gloss.trim())
  .map((l) => (isArchaic(l) ? { ...l, archaic: true, tier: 5 } : l))
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
    forms: [],
  };
  byId.set(String(d._id), lex);
  byWord.set(up(d.lemma), [...(byWord.get(up(d.lemma)) ?? []), lex]);
}
for (const w of bsonDocs(join(dir, "wordforms.bson"))) {
  const lex = byId.get(String(w.lexeme_id));
  if (!lex || !w.surface_form) continue;
  const form = w.surface_form.trim().toLocaleLowerCase("mt");
  if (form === lex.lemma.toLocaleLowerCase("mt")) {
    if (w.gender) lex.formGenders.add(w.gender);
    if (w.number) lex.formNumbers.add(w.number);
    continue;
  }
  // Other forms of the word: plurals, feminines, and a verb's plain conjugation (no "him", "to her"
  // or negative endings, which would be hundreds of forms per verb). Unverified forms are left out.
  if (w.pending || w.possessor || w.dir_obj || w.ind_obj || w.polarity === "neg" || !/^[a-zċġħżàèìòù'-]+$/.test(form)) continue;
  // Ġabra's duals are left out altogether, from the entry and from the search: most are built by
  // rule and not real words (badtejn, wardtajn, żebbuġtejn), with nothing to tell them from the
  // real ones (jumejn, sagħtejn). Real duals go in dizzjunarju-forms.json by hand, kind "dual".
  if (w.number === "dl") continue;
  lex.forms.push({ form, number: w.number ?? null, gender: w.gender ?? null, kind: w.form ?? null });
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
  r.lex = ranked[0].lex;
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

/* ---------- other forms of each word ---------- */
// What an entry prints under the headword. Ġabra's forms mix collected words with ones built by
// rule (it has "badtejn" as the dual of bajd), and nothing marks which is which, so only the
// safest are printed, one of each:
//   a noun's plural, unless the headword is a collective (its "plural" there is the plural of the
//     single item, e.g. ross: rossiet);
//   an adjective's feminine, plural and comparative.
// Everything else Ġabra has (single items of collectives, collectives, further plurals, a noun's
// other-gender form, verb forms) is searchable but not printed. Forms added by hand in
// dizzjunarju-forms.json are always printed, under their kind:
//   sing  one of a collective (bebbux: bebbuxu)      coll  the collective of a single item
//   f, m  feminine, masculine      pl, dual, comp  plural, dual, comparative
const SHOWN = ["sing", "coll", "f", "m", "pl", "dual", "comp"];
const byHand = existsSync(HAND_FORMS) ? JSON.parse(readFileSync(HAND_FORMS, "utf8")) : [];
for (const h of byHand) {
  if (!SHOWN.includes(h.kind) || !rows.some((r) => r.word === h.word)) {
    console.error(`${HAND_FORMS.pathname.split("/").pop()}: no entry ${h.word}, or unknown kind ${h.kind}`);
    process.exit(1);
  }
}
const kindOf = (f, lex, pos) => {
  if (pos === "ADJ") {
    if (f.kind === "comparative" || f.number === "sp") return "comp";
    if (f.kind) return null;
    if (f.number === "pl") return "pl";
    if (f.number === "sg" && f.gender === "f" && genderOf(lex) === "m") return "f";
    return null;
  }
  return pos === "NOUN" && !f.kind && f.number === "pl" && !lex.formNumbers.has("coll") ? "pl" : null;
};
let withShown = 0;
let searchable = 0;
for (const r of rows) {
  const lex = r.lex;
  const own = r.lemma.toLocaleLowerCase("mt");
  const shown = new Map(SHOWN.map((k) => [k, []]));
  const all = new Set();
  const placed = new Set();
  const put = (kind, form, hand = false) => {
    all.add(form);
    // One form of each kind from Ġabra; a form is never printed twice.
    if (kind && !placed.has(form) && (hand || !shown.get(kind).length)) {
      placed.add(form);
      shown.get(kind).push(form);
    }
  };
  for (const k of SHOWN) for (const f of lex.forms) if (f.form !== own && kindOf(f, lex, r.pos) === k) put(k, f.form);
  for (const f of lex.forms) if (f.form !== own) put(null, f.form);
  for (const h of byHand) if (h.word === r.word && (!h.pos || h.pos === r.pos) && h.form.toLocaleLowerCase("mt") !== own) put(h.kind, h.form.toLocaleLowerCase("mt"), true);
  r.shown = SHOWN.filter((k) => shown.get(k).length).map((k) => [k, shown.get(k).join(", ")]);
  r.forms = [...all].join(" ");
  if (r.shown.length) withShown++;
  searchable += all.size;
}

const out = rows.map((r) => [r.lemma, r.label, tidy(r.gloss), tidy(r.root), r.tier, r.number ?? 0, ...(r.shown.length || r.archaic ? [r.shown] : []), ...(r.archaic ? [1] : [])]);
for (const e of out) {
  if (!e[0] || !e[2] || !(e[4] >= 1 && e[4] <= 5)) {
    console.error(`Bad entry: ${JSON.stringify(e)}`);
    process.exit(1);
  }
}
mkdirSync(new URL("../data/dizzjunarju/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/dizzjunarju/words.json", import.meta.url), "[\n" + out.map((e) => JSON.stringify(e)).join(",\n") + "\n]\n");

// forms.json: for each row of words.json, every other form of the word, space-separated.
writeFileSync(new URL("../data/dizzjunarju/forms.json", import.meta.url), "[\n" + rows.map((r) => JSON.stringify(r.forms)).join(",\n") + "\n]\n");

const count = (label) => out.filter((e) => e[1] === label).length;
console.log(`Forms: ${withShown} entries show theirs; ${searchable} forms are searchable (data/dizzjunarju/forms.json).`);
console.log(`Wrote ${out.length} entries to data/dizzjunarju/words.json (from ${cleanCount} clean sheet rows).`);
console.log(`Archaic words, labelled "ark.": ${rows.filter((r) => r.archaic).length}.`);
console.log(`Left out by hand: ${excluded.length}. Merged as duplicates: ${merged.size}.`);
console.log(`Nouns: ${count("n.m.")} n.m., ${count("n.f.")} n.f., ${count("n.pl.")} n.pl., ${count("n.")} with no gender in Ġabra.`);
