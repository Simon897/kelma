// Builds data/kelma/word-of-day.json from the general word-tiers sheet.
//
//   node scripts/import-word-of-day.mjs path/to/gabra-word-tiers-general.xlsx
//
// Keeps only rows on the "Words" tab that are final tier 5, have a meaning, and have no flags,
// then fixes their order with a seeded shuffle. The site shows entry (day mod length), so
// re-running this with a new sheet changes the schedule from that day on.
// No dependencies: a minimal .xlsx (zip + XML) reader lives below.
import { readFileSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const SEED = 0x6b656c6d; // "kelm"
const OUT = new URL("../data/kelma/word-of-day.json", import.meta.url);

/* ---------- minimal zip reader ---------- */
function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Not a zip/xlsx file");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files.set(name, method === 8 ? inflateRawSync(raw) : raw);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/* ---------- minimal xlsx reader ---------- */
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
const texts = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");

function readSheet(path, sheetName) {
  const files = unzip(readFileSync(path));
  const str = (n) => files.get(n)?.toString("utf8") ?? "";
  const shared = [...str("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const sheetTag = [...str("xl/workbook.xml").matchAll(/<sheet\s[^>]*>/g)]
    .map((m) => m[0])
    .find((tag) => tag.includes(`name="${sheetName}"`));
  if (!sheetTag) throw new Error(`No "${sheetName}" tab in ${path}`);
  const rid = sheetTag.match(/r:id="([^"]+)"/)[1];
  const rel = [...str("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\s[^>]*>/g)]
    .map((m) => m[0])
    .find((tag) => tag.includes(`Id="${rid}"`));
  const target = rel.match(/Target="([^"]+)"/)[1].replace(/^\/?(xl\/)?/, "xl/");
  const rows = [];
  for (const r of str(target).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = {};
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, col, attrs, inner = ""] = c;
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (/t="s"/.test(attrs)) row[col] = shared[Number(v)];
      else if (/t="inlineStr"/.test(attrs)) row[col] = texts(inner);
      else if (v !== undefined) row[col] = decode(v);
    }
    rows.push(row);
  }
  return rows;
}

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
