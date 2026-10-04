// Writes gherq-root-review.xlsx: dictionary words with no root, each with a suggested root to
// approve or reject. Words that could unlock a new Għerq puzzle come first.
//
//   node scripts/make-root-review.mjs
//
// Answers go back in with scripts/apply-root-review.mjs. Words already answered (in
// data/source/root-review.json) are left out, so later rounds only ask about new words.
import { existsSync, readFileSync } from "node:fs";
import { confidence, glossWords, suggestRoots } from "./lib/root-suggest.mjs";
import { S, writeXlsx } from "./lib/xlsx-write.mjs";

export const DECISIONS = { yes: "✓ Yes", other: "✓ Use the other root", different: "✎ Different root (type it)", no: "✗ No root" };
const OUT = new URL("../gherq-root-review.xlsx", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const lexemes = read("data/source/lexemes.json");
const answered = existsSync(new URL("../data/source/root-review.json", import.meta.url)) ? read("data/source/root-review.json") : {};

// Same eligibility as the Għerq generator (scripts/build-gherq.ts).
const POS = ["VERB", "NOUN", "ADJ"];
const BAD = ["pending", "hypothetical", "archaic", "proper noun", "multiword"];
const mainPos = (p) => (p ?? "").split(/[|,]/).map((s) => s.trim()).find((x) => POS.includes(x));
const clean = (l) => !(l.flags ?? []).some((f) => BAD.includes(f)) && l.pos !== "PROPN";
const okSpelling = (w) => /^[A-BD-XZĠĦŻĊ]+$/u.test(w) && [...w].length >= 2 && [...w].length <= 15;
const points = (t) => (t === 1 || t === 2 ? 1 : t === 3 || t === 4 ? 2 : 3);
const eligible = lexemes.filter((l) => clean(l) && mainPos(l.pos) && okSpelling(l.word) && l.gloss);

// Families as they stand: root -> unique words (best tier wins).
const families = new Map();
for (const l of eligible) {
  if (!l.root) continue;
  const r = l.root.toLocaleLowerCase("mt");
  const fam = families.get(r) ?? new Map();
  families.set(r, fam);
  const prev = fam.get(l.word);
  if (!prev || (l.tier ?? 9) < (prev.tier ?? 9)) fam.set(l.word, { word: l.word, gloss: l.gloss, tier: l.tier });
}
const famList = new Map([...families].map(([r, m]) => [r, [...m.values()]]));
const famWords = new Map([...famList].map(([r, m]) => [r, new Set(m.flatMap((x) => [...glossWords(x.gloss)]))]));
const qualifies = (n, ones, root) => root !== "k-t-b" && n >= 8 && n <= 20 && ones >= 3;
const stats = (root) => {
  const m = famList.get(root) ?? [];
  return { n: m.length, ones: m.filter((x) => points(x.tier) === 1).length };
};

// One row per spelling with no root (merging duplicate entries).
const byWord = new Map();
for (const l of eligible) {
  if (l.root || l.word in answered) continue;
  const cur = byWord.get(l.word);
  if (cur) {
    if (!cur.gloss.includes(l.gloss)) cur.gloss += `; ${l.gloss}`;
    cur.tier = Math.min(cur.tier ?? 9, l.tier ?? 9);
    if (!cur.pos.includes(mainPos(l.pos))) cur.pos.push(mainPos(l.pos));
  } else byWord.set(l.word, { word: l.word, gloss: l.gloss, tier: l.tier, pos: [mainPos(l.pos)] });
}

const rows = [];
for (const w of byWord.values()) {
  const s = suggestRoots(w.word, w.gloss, famList, famWords);
  const conf = confidence(s[0]);
  if (!conf) continue;
  const alt = s.slice(1).find((x) => x.score >= s[0].score - 1.5 && x.score >= 1.5);
  rows.push({ ...w, best: s[0], alt, conf });
}

// What each approval would do for its root, counting the other suggestions for the same root.
const pending = new Map();
for (const r of rows) {
  const p = pending.get(r.best.root) ?? { n: 0, ones: 0 };
  p.n++;
  if (points(r.tier) === 1) p.ones++;
  pending.set(r.best.root, p);
}
const label = (root) => root.toLocaleUpperCase("mt");
for (const r of rows) {
  const root = r.best.root;
  const { n, ones } = stats(root);
  const one = points(r.tier) === 1 ? 1 : 0;
  const all = pending.get(root);
  if (qualifies(n, ones, root)) {
    r.impact = `Adds a word to ${label(root)}, already a puzzle`;
    r.rank = 2;
  } else if (qualifies(n + 1, ones + one, root)) {
    r.impact = `★ Unlocks ${label(root)} as a new puzzle (${n} → ${n + 1} words)`;
    r.rank = 0;
  } else if (n + all.n <= 20 && qualifies(n + all.n, ones + all.ones, root)) {
    r.impact = `★ Could unlock ${label(root)}, with the ${all.n - 1} other suggestion${all.n === 2 ? "" : "s"} for it (${n} → ${n + all.n} words)`;
    r.rank = 1;
  } else {
    const short = Math.max(0, 8 - n - 1);
    r.impact = `${label(root)}: ${n} → ${n + 1} words${short ? ` (${short} short of a puzzle)` : ""}${ones + one < 3 ? `, needs ${3 - ones - one} more common word${3 - ones - one === 1 ? "" : "s"}` : ""}`;
    r.rank = 3;
  }
}
const confRank = { high: 0, medium: 1 };
rows.sort(
  (a, b) =>
    a.rank - b.rank ||
    (a.rank <= 1 ? a.best.root.localeCompare(b.best.root, "mt") : 0) ||
    confRank[a.conf] - confRank[b.conf] ||
    (a.tier ?? 9) - (b.tier ?? 9) ||
    a.word.localeCompare(b.word, "mt"),
);

const TIER = { 1: "Very common", 2: "Common", 3: "Less common", 4: "Uncommon", 5: "Rare" };
const POS_NAME = { NOUN: "noun", VERB: "verb", ADJ: "adjective" };
const familyText = (root) => {
  const m = [...(famList.get(root) ?? [])].sort((a, b) => (a.tier ?? 9) - (b.tier ?? 9));
  const shown = m.slice(0, 3).map((x) => `${x.word} (${x.gloss.split(";")[0].trim()})`);
  return shown.join("; ") + (m.length > 3 ? `; +${m.length - 3} more` : "");
};
const why = (s) => (s.meaning ? `Letters fit and the meaning matches ("${s.shared.slice(0, 2).join('", "')}")` : "Letters fit (meaning not checked: no shared words)");

const header = ["Your answer", "Word", "Suggested root", "Meaning", "Words already in that root", "Why suggested", "Confidence", "How common", "What approving does", "Other possible root", "Your root (if different)", "Notes"];
const sheet = [header.map((v) => ({ v, s: "header" }))];
for (const r of rows) {
  sheet.push([
    { v: "", s: "decide" },
    { v: r.word, s: "bold" },
    { v: label(r.best.root), s: "root" },
    { v: `${r.gloss}  (${r.pos.map((p) => POS_NAME[p]).join(", ")})`, s: "wrap" },
    { v: familyText(r.best.root), s: "muted" },
    { v: why(r.best), s: "muted" },
    { v: r.conf === "high" ? "High" : "Medium", s: r.conf },
    { v: `${TIER[r.tier] ?? "No data"} (${points(r.tier)} pt)`, s: "normal" },
    { v: r.impact, s: r.rank <= 1 ? "impact" : "wrap" },
    { v: r.alt ? `${label(r.alt.root)}: ${familyText(r.alt.root)}` : "", s: "muted" },
    { v: "", s: "decide" },
    { v: "", s: "wrap" },
  ]);
}

const counts = {
  total: rows.length,
  unlock: rows.filter((r) => r.rank <= 1).length,
  high: rows.filter((r) => r.conf === "high").length,
};
const start = [
  [{ v: "Għerq: missing roots", s: "title" }],
  [""],
  [{ v: `These ${counts.total} words have no root in the word list, so Għerq can't use them. Each has a suggested root for you to check.`, s: "wrap" }],
  [""],
  [{ v: "How to answer (Review tab)", s: "bold" }],
  [{ v: `1. In the yellow "Your answer" column, pick from the dropdown:`, s: "wrap" }],
  [{ v: `     ${DECISIONS.yes}: the suggested root is right.`, s: "wrap" }],
  [{ v: `     ${DECISIONS.other}: the root in "Other possible root" is right.`, s: "wrap" }],
  [{ v: `     ${DECISIONS.different}: type the right root in "Your root (if different)", like q-għ-d.`, s: "wrap" }],
  [{ v: `     ${DECISIONS.no}: it has no Semitic root (a loanword, say), or it shouldn't be used.`, s: "wrap" }],
  [{ v: "2. Leave a row blank to skip it. It will be asked again next time.", s: "wrap" }],
  [{ v: "3. Save the file and tell Claude it's done.", s: "wrap" }],
  [""],
  [{ v: "Where to start", s: "bold" }],
  [{ v: `• The first ${counts.unlock} rows (marked ★) could each unlock a new puzzle. They're grouped by root.`, s: "wrap" }],
  [{ v: `• "High" confidence (${counts.high} rows) means the letters and the English meaning both point to the root. "Medium" means only the letters do, so check those more carefully.`, s: "wrap" }],
  [{ v: `• "Words already in that root" shows the family the word would join, to make the call quick.`, s: "wrap" }],
  [{ v: "• You don't have to finish. Any answers help, and answered words aren't asked again.", s: "wrap" }],
];

writeXlsx(OUT, [
  { name: "Start here", cols: [110], rows: start },
  {
    name: "Review",
    cols: [24, 14, 12, 40, 44, 30, 11, 18, 38, 36, 16, 20],
    rows: sheet,
    freeze: true,
    filter: true,
    lists: [{ col: 0, from: 2, to: sheet.length, values: Object.values(DECISIONS) }],
  },
]);
console.log(`Wrote gherq-root-review.xlsx: ${counts.total} words (${counts.unlock} could unlock puzzles, ${counts.high} high confidence).`);
