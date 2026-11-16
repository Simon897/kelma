/**
 * The Dizzjunarju book: entries in Maltese alphabetical order, laid out on pages, and the
 * instant part of the search. No DOM in here; the component passes in a text-measuring function.
 *
 * Data: data/dizzjunarju/words.json, built by scripts/build-dizzjunarju.mjs.
 */

/** A kind of form shown under an entry, with the forms of that kind: ["pl", "kotba"]. */
export type ShownForms = [kind: string, forms: string];

/**
 * One row of words.json: [word, label, meaning, root, tier, number among same-spelt words (0 = none)],
 * then, for a noun or adjective that has them, its other forms to show, then 1 for an archaic word.
 */
export type WordRow = [string, string, string, string, number, number, ShownForms[]?, number?];

/** Printed after the part of speech of a word no longer in everyday use. */
export const ARCHAIC_LABEL = "ark.";

/** How each kind of form is labelled in an entry (Maltese abbreviations, like the part-of-speech labels). */
export const FORM_LABEL: Record<string, string> = { sing: "sing.", coll: "koll.", f: "f.", m: "m.", pl: "pl.", dual: "dual", comp: "komp." };

export interface Entry {
  w: string;
  /** part-of-speech label as printed: "n.m.", "v.", "aġġ." or "" */
  pos: string;
  gloss: string;
  root: string;
  tier: number;
  /** 1, 2, 3 for words spelt the same; 0 otherwise */
  hn: number;
  /** first letter of the Maltese alphabet ("għ" and "ie" are letters) */
  letter: string;
  /** sort key: one character per letter, in alphabet order */
  key: string;
  /** the word reduced to a-z, for matching what the reader types */
  n: string;
  /** each meaning, lower case, without brackets or a leading "to", "a", "an", "the" */
  ss: string[];
  /** row in words.json (the search vectors are indexed by it) */
  ri: number;
  /** other forms printed under the headword: plural, feminine, one of a collective... */
  forms: ShownForms[];
  /** no longer in everyday use: labelled "ark." */
  archaic: boolean;
  /** every other form of the word, reduced to a-z like `n`; empty until forms.json has loaded */
  fn: string[];
  /** the same forms as written, in step with `fn` */
  fw: string[];
}

/** The Maltese alphabet, in order. */
export const ALPHABET = ["a", "b", "ċ", "d", "e", "f", "ġ", "g", "għ", "h", "ħ", "i", "ie", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "ż", "z"];

const plainVowels = (s: string) => s.replace(/à/g, "a").replace(/è/g, "e").replace(/ì/g, "i").replace(/ò/g, "o").replace(/ù/g, "u");

/** "Għajn" -> "ghajn": lets a reader type without Maltese letters. */
export function normalise(s: string): string {
  return plainVowels(String(s || "").toLowerCase())
    .replace(/ċ/g, "c")
    .replace(/ġ/g, "g")
    .replace(/ħ/g, "h")
    .replace(/ż/g, "z")
    .replace(/[^a-z]/g, "");
}

/** A word as letters of the Maltese alphabet: "għajn" -> għ, a, j, n. Apostrophes and hyphens are skipped. */
export function letters(word: string): string[] {
  const w = plainVowels(word.toLowerCase()).replace(/[^a-zċġħż]/g, "");
  const out: string[] = [];
  for (let i = 0; i < w.length; ) {
    const two = w.slice(i, i + 2);
    if (two === "għ" || two === "ie") {
      out.push(two);
      i += 2;
    } else {
      out.push(w[i]);
      i += 1;
    }
  }
  return out;
}

/** All entries, sorted as a Maltese dictionary sorts them. */
export function buildEntries(rows: WordRow[]): Entry[] {
  const ents = rows.map((r, ri): Entry => {
    const t = letters(r[0]);
    return {
      w: r[0],
      pos: r[1],
      gloss: r[2],
      root: r[3],
      tier: r[4],
      hn: r[5],
      letter: t[0] ?? "a",
      key: t.map((x) => String.fromCharCode(65 + Math.max(0, ALPHABET.indexOf(x)))).join(""),
      n: normalise(r[0]),
      ss: r[2]
        .toLowerCase()
        .replace(/\([^)]*\)/g, "")
        .split(";")
        .map((x) => x.replace(/\s+/g, " ").trim().replace(/^(to|a|an|the) /, ""))
        .filter(Boolean),
      ri,
      forms: r[6] ?? [],
      archaic: r[7] === 1,
      fn: [],
      fw: [],
    };
  });
  ents.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.w < b.w ? -1 : a.w > b.w ? 1 : a.hn - b.hn));
  return ents;
}

/* ---------- pages ---------- */

export type PageRow =
  | { kind: "opener"; letter: string }
  | { kind: "entry"; i: number; lines: string[]; /** the whole meaning, when the lines had to cut it */ full: string; h: number };

export interface Page {
  /** "end" is the last page of the book: a picture, no entries */
  kind: "front" | "dict" | "blank" | "end";
  rows: PageRow[];
  /** guide word in the page's top corner */
  guide: string;
  num: string;
}

export interface Layout {
  pages: Page[];
  /** entry index -> page index */
  wordPage: number[];
  /** letter -> page its section opens on */
  letterPage: Record<string, number>;
  /** page index -> letter of its first entry */
  pageLetter: (string | null)[];
}

export interface PageSize {
  /** width a line of meaning can take, px */
  lineWidth: number;
  /** height available for rows on a page, px */
  rowsHeight: number;
  /** 2 for an open book (the last page is padded to a full spread), 1 for one page at a time */
  perView: 1 | 2;
}

export const HEAD_H = 24; // the headword line
export const FORMS_H = 19; // the line of other forms, where an entry has one
export const LINE_H = 21; // one line of meaning
export const ROW_GAP = 10;
export const OPENER_H = 100; // the big letter that opens a section
export const MAX_LINES = 3;
/** A section never opens in the last part of a page: it needs room for itself and a few entries. */
const OPENER_ROOM = 275;

/** Breaks a meaning into lines no wider than `width`; past MAX_LINES the last line ends in "…". */
export function wrapMeaning(gloss: string, width: number, measure: (s: string) => number): { lines: string[]; full: string } {
  if (measure(gloss) <= width) return { lines: [gloss], full: "" };
  const out: string[] = [];
  let line = "";
  for (const word of gloss.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > width) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  if (out.length <= MAX_LINES) return { lines: out, full: "" };
  const trim = (s: string) => s.replace(/[\s;,.:(]+$/, "");
  let last = `${out[MAX_LINES - 1]} ${out[MAX_LINES]}`;
  while (last && measure(`${trim(last)}…`) > width) {
    const k = last.lastIndexOf(" ");
    last = k > 0 ? last.slice(0, k) : last.slice(0, -1);
  }
  return { lines: [...out.slice(0, MAX_LINES - 1), `${trim(last)}…`], full: gloss };
}

/** Lays the entries out on pages. Page 0 is the front page ("how to read an entry"); the last is the end page. */
export function paginate(ents: Entry[], size: PageSize, measure: (s: string) => number): Layout {
  const pages: Page[] = [{ kind: "front", rows: [], guide: "", num: "" }];
  const wordPage: number[] = [];
  const letterPage: Record<string, number> = {};
  let cur: Page | null = null;
  let used = size.rowsHeight;
  let last: string | null = null;
  const newPage = () => {
    cur = { kind: "dict", rows: [], guide: "", num: "" };
    pages.push(cur);
    used = 0;
  };
  ents.forEach((e, i) => {
    if (e.letter !== last) {
      if (size.rowsHeight - used < OPENER_ROOM) newPage();
      cur!.rows.push({ kind: "opener", letter: e.letter });
      used += OPENER_H + ROW_GAP;
      last = e.letter;
      letterPage[e.letter] = pages.length - 1;
    }
    const wr = wrapMeaning(e.gloss, size.lineWidth, measure);
    const h = HEAD_H + (e.forms.length ? FORMS_H : 0) + LINE_H * wr.lines.length;
    if (used + h + ROW_GAP > size.rowsHeight) newPage();
    cur!.rows.push({ kind: "entry", i, lines: wr.lines, full: wr.full, h });
    used += h + ROW_GAP;
    wordPage[i] = pages.length - 1;
  });
  // The book always closes on its end page. In an open book that is the last right-hand page, with a
  // blank one before it if the entries stop on a right-hand page.
  if (size.perView === 2 && pages.length % 2 === 0) pages.push({ kind: "blank", rows: [], guide: "", num: "" });
  pages.push({ kind: "end", rows: [], guide: "", num: "" });
  let letter: string | null = null;
  const pageLetter = pages.map((p, idx) => {
    const es = p.rows.filter((r): r is Extract<PageRow, { kind: "entry" }> => r.kind === "entry");
    if (p.kind === "dict") {
      p.num = String(idx);
      // An open book puts the first word top-left and the last word top-right.
      const lastWord = size.perView === 2 && idx % 2 === 1;
      p.guide = es.length ? ents[(lastWord ? es[es.length - 1] : es[0]).i].w : "";
    }
    // Pages after the last entry stay under the last letter, so its tab stays lit to the end.
    if (es.length) letter = ents[es[0].i].letter;
    return letter;
  });
  return { pages, wordPage, letterPage, pageLetter };
}

/* ---------- search: the instant part ---------- */

export interface ExactResult {
  /** what was typed, lower case and trimmed */
  raw: string;
  /** best matches first, as entry indexes */
  hits: number[];
  /** the query is itself a Maltese headword, or a form of one */
  isMaltese: boolean;
  /** the best hit matched as a Maltese word (or the start of one), not through its English meaning */
  malteseTop: boolean;
  /** for a hit found through another form of the word: entry index -> the form that matched ("kotba" for ktieb) */
  via: Record<number, string>;
}

/**
 * Maltese headwords and English meanings at once. A reader typing "dog" wants kelb before
 * dogmatiku, so a meaning that is exactly the query outranks a headword that merely starts with it.
 * Between equals, the more common word (lower tier) comes first.
 *
 * Other forms count too, once forms.json has loaded: "kotba" finds ktieb, "bebbuxu" finds bebbux,
 * "jikteb" finds kiteb. A form typed in full ranks just under the headword itself.
 */
export function searchExact(ents: Entry[], query: string, limit = 5): ExactResult {
  const raw = String(query || "").toLowerCase().replace(/\s+/g, " ").trim();
  const nq = normalise(raw);
  if (!nq) return { raw, hits: [], isMaltese: false, malteseTop: false, via: {} };
  const eq = raw.replace(/^(to|a|an|the) /, "");
  const words = (s: string) => s.split(" ").length;
  const wholeWord = (s: string) => {
    const k = s.indexOf(eq);
    return k >= 0 && !/[a-z]/.test(s.charAt(k - 1)) && !/[a-z]/.test(s.charAt(k + eq.length));
  };
  const scored: [score: number, entry: number, maltese: boolean][] = [];
  const via: Record<number, string> = {};
  let isMaltese = false;
  ents.forEach((e, i) => {
    let sc = 0;
    if (e.n === nq) {
      sc = 200;
      isMaltese = true;
    } else if (e.n.startsWith(nq)) sc = 90 - 2 * (e.n.length - nq.length);
    else if (nq.length > 2 && e.n.includes(nq)) sc = 25;
    if (sc < 150) {
      // another form of the word: typed in full, or (from four letters) its beginning
      let best = 0;
      let found = "";
      for (let k = 0; k < e.fn.length; k++) {
        const f = e.fn[k];
        const v = f === nq ? 150 : nq.length > 3 && f.startsWith(nq) ? 70 - 2 * (f.length - nq.length) : 0;
        if (v > best) {
          best = v;
          found = e.fw[k];
        }
      }
      if (best > sc) {
        sc = best;
        via[i] = found;
        if (best === 150) isMaltese = true;
      }
    }
    let maltese = sc > 0;
    if (eq.length > 1) {
      e.ss.forEach((s, k) => {
        let v = 0;
        if (s === eq) v = 100 - 4 * k;
        else if (wholeWord(s)) v = 62 - 4 * k - 2 * Math.max(0, words(s) - words(eq));
        else if (eq.length > 2 && ` ${s}`.includes(` ${eq}`)) v = 30 - 4 * k;
        if (v > sc) {
          sc = v;
          maltese = false;
          delete via[i];
        }
      });
    }
    if (sc > 0) scored.push([sc - 1.5 * e.tier, i, maltese]);
  });
  scored.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return { raw, hits: scored.slice(0, limit).map((x) => x[1]), isMaltese, malteseTop: scored.length > 0 && scored[0][2], via };
}

/**
 * Related-meaning search only makes sense for English: the model doesn't know Maltese. So not when
 * the query is a Maltese word, or its best match is the start of one ("bebbuxi", on the way to bebbuxiet).
 */
export function wantsRelated(r: ExactResult): boolean {
  return r.raw.length >= 3 && !r.isMaltese && !r.malteseTop && !/[ċġħż]/.test(r.raw);
}

/** Gives each entry its searchable forms. `rows` is forms.json: one space-separated string per row of words.json. */
export function attachForms(ents: Entry[], rows: string[]): void {
  for (const e of ents) {
    e.fw = rows[e.ri] ? rows[e.ri].split(" ") : [];
    e.fn = e.fw.map(normalise);
  }
}

let formsPromise: Promise<void> | null = null;
/** forms.json (~390 KB) loads after the entries; until then only headwords and meanings are searched. */
export function loadForms(ents: Entry[]): Promise<void> {
  formsPromise ??= import("../data/dizzjunarju/forms.json").then((m) => attachForms(ents, (m.default ?? m) as string[]));
  return formsPromise;
}

let promise: Promise<Entry[]> | null = null;
/** words.json (~600 KB) loads as its own chunk, after first paint. */
export function loadEntries(): Promise<Entry[]> {
  promise ??= import("../data/dizzjunarju/words.json").then((m) => buildEntries((m.default ?? m) as WordRow[]));
  return promise;
}
