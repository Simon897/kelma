// Builds data/sellum/glosses.json: every valid 5-tile word -> its Ġabra meaning.
//
//   node scripts/build-sellum-glosses.mjs path/to/Kelma-word-tiers.xlsx
//
// A dictionary word maps to its gloss (string). An inflected form with no gloss of its own maps
// to { lemma, gloss } from its headword, shown as "forma ta' X". Words with neither are left out.
// Sources, in order: data/source/answer-candidates.json, the Kelma sheet's "Answer candidates"
// tab (Word, Meaning), then its "Guess-only words" tab (Word, Headword(s), Meaning).
import { readFileSync, writeFileSync } from "node:fs";
import { readSheet } from "./lib/xlsx.mjs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/build-sellum-glosses.mjs path/to/Kelma-word-tiers.xlsx");
  process.exit(1);
}

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const valid = new Set(read("data/kelma/valid-guesses.json"));
const upper = (w) => w.trim().toLocaleUpperCase("mt");

function table(tab) {
  const [header, ...rows] = readSheet(path, tab);
  const col = (name) => Object.keys(header).find((k) => header[k].trim() === name);
  return { rows, col };
}

const out = new Map();
for (const c of read("data/source/answer-candidates.json")) {
  if (valid.has(c.word) && c.gloss) out.set(c.word, c.gloss);
}

{
  const { rows, col } = table("Answer candidates");
  const [W, M] = [col("Word"), col("Meaning")];
  for (const r of rows) {
    const w = upper(r[W] ?? "");
    if (valid.has(w) && !out.has(w) && (r[M] ?? "").trim()) out.set(w, r[M].trim());
  }
}

let forms = 0;
{
  const { rows, col } = table("Guess-only words");
  const [W, H, M] = [col("Word"), col("Headword(s)"), col("Meaning")];
  for (const r of rows) {
    const w = upper(r[W] ?? "");
    const lemma = (r[H] ?? "").split(/[,;|]/)[0].trim();
    const gloss = (r[M] ?? "").trim();
    if (!valid.has(w) || out.has(w) || !gloss) continue;
    if (!lemma || upper(lemma) === w) out.set(w, gloss);
    else {
      out.set(w, { lemma: upper(lemma), gloss });
      forms++;
    }
  }
}

const sorted = Object.fromEntries([...out].sort(([a], [b]) => a.localeCompare(b, "mt")));
writeFileSync(new URL("../data/sellum/glosses.json", import.meta.url), JSON.stringify(sorted) + "\n");
console.log(`Wrote ${out.size} of ${valid.size} words to data/sellum/glosses.json (${forms} as "form of" entries).`);
