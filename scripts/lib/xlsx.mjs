// Minimal .xlsx reader (zip + XML), no dependencies. Shared by the data import scripts.
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

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

export function readSheet(path, sheetName) {
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
