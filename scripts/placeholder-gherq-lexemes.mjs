// Writes data/source/word-sheet.json from the general word-tiers sheet: each word's tier and flags,
// in the lexeme shape [{ word, alts, root, pos, gloss, tier, flags }]. scripts/import-gabra.mjs merges it into the full Ġabra list.
//
//   node scripts/placeholder-gherq-lexemes.mjs path/to/gabra-word-tiers-general.xlsx
//
// Limits of this stand-in: it only has words with frequency data (so ~170 usable roots rather
// than ~490), and the sheet has no alternative spellings, so `alts` is always empty.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readSheet } from "./lib/xlsx.mjs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/placeholder-gherq-lexemes.mjs path/to/gabra-word-tiers-general.xlsx");
  process.exit(1);
}

const [header, ...rows] = readSheet(path, "Words");
const col = (name) => Object.keys(header).find((k) => header[k].trim() === name);
const [W, P, M, R, F, T] = ["Word", "Part of speech", "Meaning(s)", "Root", "Flags", "Final tier"].map(col);

const out = rows
  .filter((r) => (r[W] ?? "").trim())
  .map((r) => {
    const tier = String(r[T] ?? "").trim();
    return {
      word: r[W].trim().toLocaleUpperCase("mt"),
      alts: [],
      root: (r[R] ?? "").trim().toLocaleLowerCase("mt") || null,
      pos: (r[P] ?? "").trim() || null,
      gloss: (r[M] ?? "").trim(),
      tier: /^[1-5]$/.test(tier) ? Number(tier) : null,
      flags: (r[F] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    };
  });

// Roots approved in the review sheet (scripts/apply-root-review.mjs) fill gaps in the sheet.
const reviewUrl = new URL("../data/source/root-review.json", import.meta.url);
const review = existsSync(reviewUrl) ? JSON.parse(readFileSync(reviewUrl, "utf8")) : {};
for (const l of out) if (!l.root && review[l.word]) l.root = review[l.word];

writeFileSync(new URL("../data/source/word-sheet.json", import.meta.url), JSON.stringify(out) + "\n");
console.log(`Wrote ${out.length} sheet words to data/source/word-sheet.json.`);
