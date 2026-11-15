// Builds the vectors behind the Dizzjunarju's "related words" search.
//
//   npm install --no-save @huggingface/transformers     (once; it is not a dependency of the site)
//   node scripts/build-dizzjunarju-embeddings.mjs
//
// Reads data/dizzjunarju/words.json and writes public/dizzjunarju-search/embeddings.bin: one 384-number
// vector for each meaning of each entry ("house; home" is two meanings, up to 6 per entry), from the
// model all-MiniLM-L6-v2. The browser loads the same model (lib/dizzjunarju-related.ts) to turn what
// the reader types into a vector, and looks for the closest meanings.
//
// File layout, little-endian: u32 entries, u32 meanings, u16 entry index for each meaning, then
// 384 signed bytes per meaning (the unit vector times 127). Entry indexes are rows of words.json,
// so rebuild this whenever words.json changes; the page refuses a file whose counts don't match.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

export const MODEL = "Xenova/all-MiniLM-L6-v2";
const DIM = 384;
const MAX_SENSES = 6;

let pipeline;
try {
  ({ pipeline } = await import("@huggingface/transformers"));
} catch {
  console.error("Missing @huggingface/transformers. Run: npm install --no-save @huggingface/transformers");
  process.exit(1);
}

const words = JSON.parse(readFileSync(new URL("../data/dizzjunarju/words.json", import.meta.url), "utf8"));
const senses = [];
const owner = [];
words.forEach((e, i) => {
  for (const s of e[2].split(";").map((x) => x.trim()).filter(Boolean).slice(0, MAX_SENSES)) {
    senses.push(s);
    owner.push(i);
  }
});

const embed = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
const out = Buffer.alloc(8 + owner.length * 2 + senses.length * DIM);
out.writeUInt32LE(words.length, 0);
out.writeUInt32LE(senses.length, 4);
owner.forEach((o, i) => out.writeUInt16LE(o, 8 + i * 2));
const base = 8 + owner.length * 2;
for (let i = 0; i < senses.length; i += 64) {
  const r = await embed(senses.slice(i, i + 64), { pooling: "mean", normalize: true });
  for (let j = 0; j < r.data.length; j++) out.writeInt8(Math.max(-127, Math.min(127, Math.round(r.data[j] * 127))), base + i * DIM + j);
  if (i % 3200 === 0) console.log(`${i} / ${senses.length}`);
}

mkdirSync(new URL("../public/dizzjunarju-search/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/dizzjunarju-search/embeddings.bin", import.meta.url), out);
console.log(`Wrote public/dizzjunarju-search/embeddings.bin: ${words.length} entries, ${senses.length} meanings, ${(out.length / 1e6).toFixed(1)} MB.`);
