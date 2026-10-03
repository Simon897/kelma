// Builds data/kelma/word-of-day.json from the general word-tiers sheet.
//
//   node scripts/import-word-of-day.mjs path/to/gabra-word-tiers-general.xlsx
//
// Keeps only rows on the "Words" tab that are final tier 5, have a meaning, and have no flags,
// then fixes their order with a seeded shuffle. The site shows entry (day mod length), so
// re-running this with a new sheet changes the schedule from that day on.
import { writeFileSync } from "node:fs";
import { readSheet } from "./lib/xlsx.mjs";

const SEED = 0x6b656c6d; // "kelm"
const OUT = new URL("../data/kelma/word-of-day.json", import.meta.url);

/* ---------- build ---------- */
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/import-word-of-day.mjs path/to/gabra-word-tiers-general.xlsx");
  process.exit(1);
}

const [header, ...rows] = readSheet(path, "Words");
const col = (name) => {
  const key = Object.keys(header).find((k) => header[k].trim() === name);
  if (!key) throw new Error(`Column "${name}" not found on the Words tab`);
  return key;
};
const [W, M, F, T] = [col("Word"), col("Meaning(s)"), col("Flags"), col("Final tier")];

// A word can be several Ġabra entries (homographs); merge their meanings into one day.
const byWord = new Map();
for (const r of rows) {
  const word = (r[W] ?? "").trim();
  const gloss = (r[M] ?? "").trim();
  if (String(r[T] ?? "").trim() !== "5" || !word || !gloss || (r[F] ?? "").trim()) continue;
  const prev = byWord.get(word);
  if (!prev) byWord.set(word, { word, gloss });
  else if (!prev.gloss.split("; ").includes(gloss)) prev.gloss = `${prev.gloss}; ${gloss}`;
}
const pool = [...byWord.values()];

const rand = mulberry32(SEED);
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}

writeFileSync(OUT, JSON.stringify(pool, null, 1) + "\n");
console.log(`Wrote ${pool.length} words to data/kelma/word-of-day.json (${(pool.length / 365).toFixed(1)} years before repeating).`);
