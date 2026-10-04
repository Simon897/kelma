// Reads the answers from gherq-root-review.xlsx into data/source/root-review.json (word -> root,
// or null for "no root"), then fills those roots into data/source/lexemes.json.
//
//   node scripts/apply-root-review.mjs [path/to/gherq-root-review.xlsx]
//   node scripts/build-gherq.ts        # then rebuild the puzzles
//
// root-review.json is kept, so answers survive a re-import of the word list
// (placeholder-gherq-lexemes.mjs applies it too) and answered words aren't asked again.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readSheet } from "./lib/xlsx.mjs";

const DECISIONS = { yes: "✓ Yes", other: "✓ Use the other root", different: "✎ Different root (type it)", no: "✗ No root" };
const path = process.argv[2] ?? new URL("../gherq-root-review.xlsx", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const reviewUrl = new URL("../data/source/root-review.json", import.meta.url);
const lexUrl = new URL("../data/source/lexemes.json", import.meta.url);

const [header, ...rows] = readSheet(decodeURIComponent(path), "Review");
const col = (name) => Object.keys(header).find((k) => header[k].trim() === name);
const C = {
  answer: col("Your answer"),
  word: col("Word"),
  root: col("Suggested root"),
  other: col("Other possible root"),
  mine: col("Your root (if different)"),
};
// A root is radicals joined by hyphens, like q-għ-d (an apostrophe counts as a radical).
const ROOT = /^([a-zġħżċ']|għ|ie)+(-([a-zġħżċ']|għ)+){1,3}$/u;
const norm = (s) => (s ?? "").trim().toLocaleLowerCase("mt").replace(/\s+/g, "").replace(/–|—/g, "-");

const review = existsSync(reviewUrl) ? JSON.parse(readFileSync(reviewUrl, "utf8")) : {};
const problems = [];
const tally = { yes: 0, other: 0, different: 0, no: 0, skipped: 0 };
for (const r of rows) {
  const word = (r[C.word] ?? "").trim();
  const answer = (r[C.answer] ?? "").trim();
  if (!word) continue;
  if (!answer) {
    tally.skipped++;
    continue;
  }
  let root;
  if (answer === DECISIONS.yes) root = norm(r[C.root]);
  else if (answer === DECISIONS.other) root = norm((r[C.other] ?? "").split(":")[0]);
  else if (answer === DECISIONS.different) root = norm(r[C.mine]);
  else if (answer === DECISIONS.no) root = null;
  else {
    problems.push(`${word}: unknown answer "${answer}"`);
    continue;
  }
  if (root !== null && !ROOT.test(root)) {
    problems.push(`${word}: "${root || "(empty)"}" isn't a root like q-għ-d`);
    continue;
  }
  review[word] = root;
  const key = Object.entries(DECISIONS).find(([, v]) => v === answer)[0];
  tally[key]++;
}

writeFileSync(reviewUrl, JSON.stringify(Object.fromEntries(Object.entries(review).sort(([a], [b]) => a.localeCompare(b, "mt"))), null, 2) + "\n");

// Fill the roots in (only where the word list has none; a listed root is never overwritten).
const lexemes = JSON.parse(readFileSync(lexUrl, "utf8"));
let filled = 0;
for (const l of lexemes) {
  if (!l.root && review[l.word]) {
    l.root = review[l.word];
    filled++;
  }
}
writeFileSync(lexUrl, JSON.stringify(lexemes) + "\n");

console.log(
  `Answers: ${tally.yes} yes, ${tally.other} other root, ${tally.different} typed root, ${tally.no} no root, ${tally.skipped} skipped. ` +
    `${Object.keys(review).length} words decided in total; filled ${filled} roots in lexemes.json.`,
);
if (problems.length) {
  console.log(`\nNot applied (fix these in the sheet and run again):\n  ${problems.join("\n  ")}`);
  process.exitCode = 1;
}
