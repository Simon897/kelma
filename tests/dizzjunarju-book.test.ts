import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import formRows from "../data/dizzjunarju/forms.json";
import rows from "../data/dizzjunarju/words.json";
import sheet from "../data/source/word-sheet.json";
import { ALPHABET, attachForms, buildEntries, FORM_LABEL, letters, MAX_LINES, normalise, paginate, searchExact, wantsRelated, wrapMeaning, type WordRow } from "../lib/dizzjunarju-book";

const words = rows as WordRow[];
const ents = buildEntries(words);
attachForms(ents, formRows as string[]);
// Every character 8px wide: enough to exercise the page breaks without a browser.
const measure = (s: string) => s.length * 8;

describe("dizzjunarju book: the word list", () => {
  it("has well-formed rows", () => {
    expect(words.length).toBeGreaterThan(10000);
    const labels = new Set(["", "n.", "n.m.", "n.f.", "n.pl.", "v.", "aġġ.", "avv.", "num.", "pron.", "prep.", "konġ.", "interj."]);
    for (const [w, label, gloss, root, tier, hn] of words) {
      expect(w.trim(), w).toBe(w);
      expect(w).not.toBe("");
      expect(gloss.trim(), w).not.toBe("");
      expect(labels.has(label), `${w}: ${label}`).toBe(true);
      expect(root === "" || /^[a-zċġħż'-]+$/.test(root), `${w}: ${root}`).toBe(true);
      expect([1, 2, 3, 4, 5]).toContain(tier);
      expect(Number.isInteger(hn) && hn >= 0, w).toBe(true);
      expect(letters(w).length, w).toBeGreaterThan(0);
    }
  });

  it("only has words from clean sheet rows (no flags, a meaning), plus archaic ones, marked", () => {
    const rowsOf = sheet as { word: string; gloss: string; flags: string[] }[];
    const clean = new Set(rowsOf.filter((l) => !l.flags.length && l.gloss.trim()).map((l) => l.word));
    const old = new Set(rowsOf.filter((l) => l.flags.length === 1 && l.flags[0] === "archaic" && l.gloss.trim()).map((l) => l.word));
    for (const r of words) {
      const w = r[0].toLocaleUpperCase("mt");
      if (r[7] === 1) {
        expect(old.has(w), r[0]).toBe(true);
        expect(r[4], `${r[0]}: an archaic word is tier 5`).toBe(5);
      } else expect(clean.has(w), r[0]).toBe(true);
    }
    expect(words.filter((r) => r[7] === 1).length).toBe(old.size);
    expect(ents.find((e) => e.w === "ġagħal")?.archaic).toBe(true);
    expect(ents.find((e) => e.w === "ktieb")?.archaic).toBe(false);
  });

  it("has no English-only spellings and none of the words left out by hand", () => {
    const all = new Set(words.map((r) => r[0].toLowerCase()));
    for (const w of ["july", "positive", "merchandising", "barcode", "incoterms", "upstream", "downstream", "timeshare", "netting", "dumping", "forfaiting", "beige", "april", "żvizzera", "mediterran", "stigma"]) expect(all.has(w), w).toBe(false);
    // c without a dot and y are not Maltese letters
    for (const [w] of words) expect(/[cy]/i.test(w), w).toBe(false);
  });

  it("numbers words spelt the same 1, 2, 3 and leaves the rest unnumbered", () => {
    const by = new Map<string, number[]>();
    for (const [w, , , , , hn] of words) by.set(w.toLowerCase(), [...(by.get(w.toLowerCase()) ?? []), hn]);
    for (const [w, ns] of by) expect([...ns].sort(), w).toEqual(ns.length === 1 ? [0] : ns.map((_, k) => k + 1));
    expect(ents.filter((e) => e.w === "dar").map((e) => [e.hn, e.pos])).toEqual([
      [1, "n.f."],
      [2, "v."],
      [3, "v."],
    ]);
  });

  it("has search vectors built from this exact list", () => {
    const url = new URL("../public/dizzjunarju-search/embeddings.bin", import.meta.url);
    expect(existsSync(url)).toBe(true);
    const buf = readFileSync(url);
    const senses = words.reduce((n, r) => n + Math.min(6, r[2].split(";").filter((s) => s.trim()).length), 0);
    expect(buf.readUInt32LE(0)).toBe(words.length);
    expect(buf.readUInt32LE(4)).toBe(senses);
    expect(buf.length).toBe(8 + senses * 2 + senses * 384);
    // each meaning points at its entry, in order
    let k = 0;
    words.forEach((r, i) => {
      const n = Math.min(6, r[2].split(";").filter((s) => s.trim()).length);
      for (let j = 0; j < n; j++) expect(buf.readUInt16LE(8 + (k + j) * 2)).toBe(i);
      k += n;
    });
  });
});

describe("dizzjunarju book: alphabetical order", () => {
  it("splits words into Maltese letters", () => {
    expect(letters("għajn")).toEqual(["għ", "a", "j", "n"]);
    expect(letters("bieb")).toEqual(["b", "ie", "b"]);
    expect(letters("ta'")).toEqual(["t", "a"]);
    expect(letters("il-")).toEqual(["i", "l"]);
    expect(letters("università")).toEqual(["u", "n", "i", "v", "e", "r", "s", "i", "t", "a"]);
    expect(normalise("Għażiż")).toBe("ghaziz");
  });

  it("sorts by the Maltese alphabet: ċ after b, ġ before g, għ after g, ħ after h, ie after i, ż before z", () => {
    const order = ents.map((e) => e.letter).filter((l, i, a) => l !== a[i - 1]);
    expect(order).toEqual(ALPHABET.filter((l) => order.includes(l)));
    for (let i = 1; i < ents.length; i++) expect(ents[i - 1].key <= ents[i].key, `${ents[i - 1].w} before ${ents[i].w}`).toBe(true);
    const at = (w: string) => ents.findIndex((e) => e.w === w);
    expect(at("ċavetta")).toBeGreaterThan(at("bżar"));
    expect(at("ġobon")).toBeLessThan(at("gallarija"));
    expect(at("għajn")).toBeGreaterThan(at("gżira"));
    expect(at("ħobż")).toBeGreaterThan(at("hemm"));
    expect(at("żarbun")).toBeLessThan(at("zalzett"));
  });
});

describe("dizzjunarju book: pages", () => {
  const size = { lineWidth: 440, rowsHeight: 660, perView: 2 as const };
  const layout = paginate(ents, size, measure);

  it("puts every entry on exactly one page, in order, and never overfills a page", () => {
    const seen: number[] = [];
    layout.pages.forEach((p, idx) => {
      let used = 0;
      for (const r of p.rows) {
        used += (r.kind === "opener" ? 100 : r.h) + 10;
        if (r.kind === "entry") {
          seen.push(r.i);
          expect(layout.wordPage[r.i]).toBe(idx);
          expect(r.lines.length).toBeLessThanOrEqual(MAX_LINES);
          for (const line of r.lines) expect(measure(line)).toBeLessThanOrEqual(size.lineWidth);
        }
      }
      expect(used, `page ${idx}`).toBeLessThanOrEqual(size.rowsHeight);
    });
    expect(seen).toEqual(ents.map((_, i) => i));
  });

  it("opens with the front page, makes whole spreads, and opens each letter once", () => {
    expect(layout.pages[0].kind).toBe("front");
    expect(layout.pages.length % 2).toBe(0);
    // the end page is the last right-hand page, and there is only one
    expect(layout.pages.at(-1)!.kind).toBe("end");
    expect(layout.pages.filter((p) => p.kind === "end")).toHaveLength(1);
    expect(layout.pageLetter.at(-1)).toBe("z");
    expect(layout.pageLetter[0]).toBe(null);
    const openers = layout.pages.flatMap((p) => p.rows.filter((r) => r.kind === "opener").map((r) => (r.kind === "opener" ? r.letter : "")));
    expect(openers).toEqual([...new Set(ents.map((e) => e.letter))]);
    for (const l of openers) expect(layout.pages[layout.letterPage[l]].rows.some((r) => r.kind === "opener" && r.letter === l)).toBe(true);
  });

  it("lays out one page at a time without padding to a spread", () => {
    const one = paginate(ents, { lineWidth: 300, rowsHeight: 460, perView: 1 }, measure);
    expect(one.pages.at(-1)!.kind).toBe("end");
    expect(one.pages.at(-2)!.kind).toBe("dict");
    expect(one.pages.length).toBeGreaterThan(layout.pages.length);
    expect(one.wordPage).toHaveLength(ents.length);
  });

  it("wraps a long meaning and marks one that had to be cut", () => {
    expect(wrapMeaning("short", 440, measure)).toEqual({ lines: ["short"], full: "" });
    const two = wrapMeaning("x".repeat(40) + " " + "y".repeat(40), 440, measure);
    expect(two.lines).toHaveLength(2);
    expect(two.full).toBe("");
    const long = Array(40).fill("meaning").join("; ");
    const cut = wrapMeaning(long, 440, measure);
    expect(cut.lines).toHaveLength(MAX_LINES);
    expect(cut.lines[MAX_LINES - 1].endsWith("…")).toBe(true);
    expect(cut.full).toBe(long);
  });
});

describe("dizzjunarju book: search", () => {
  const top = (q: string) => searchExact(ents, q).hits.map((i) => ents[i].w);

  it("finds a Maltese word, with or without Maltese letters", () => {
    expect(top("kelb")[0]).toBe("kelb");
    expect(top("hobz")[0]).toBe("ħobż");
    expect(top("GĦAJN")[0]).toBe("għajn");
    expect(searchExact(ents, "kelb").isMaltese).toBe(true);
  });

  it("puts the word that means the query before words that merely start with it", () => {
    expect(top("dog")[0]).toBe("kelb");
    expect(top("to buy").slice(0, 2).sort()).toEqual(["xara", "xtara"]);
    expect(top("happy")).toContain("ferħan");
    expect(top("cat")[0]).toBe("qattus");
  });

  it("returns nothing for nonsense or an empty query", () => {
    expect(top("wxyzq")).toEqual([]);
    expect(top("   ")).toEqual([]);
  });

  it("asks for related words only for English queries of three letters or more", () => {
    expect(wantsRelated(searchExact(ents, "physician"))).toBe(true);
    expect(wantsRelated(searchExact(ents, "the room where you cook"))).toBe(true);
    expect(wantsRelated(searchExact(ents, "kelb"))).toBe(false);
    expect(wantsRelated(searchExact(ents, "ħobż"))).toBe(false);
    expect(wantsRelated(searchExact(ents, "ab"))).toBe(false);
    // the start of a Maltese word or form is Maltese too; an English word that some Maltese word starts with is not
    expect(wantsRelated(searchExact(ents, "bebbuxi"))).toBe(false);
    expect(wantsRelated(searchExact(ents, "happy"))).toBe(true);
    expect(wantsRelated(searchExact(ents, "dog"))).toBe(true);
    expect(wantsRelated(searchExact(ents, "man"))).toBe(true);
  });
});

describe("dizzjunarju book: other forms of a word", () => {
  const entry = (w: string, pos?: string) => ents.find((e) => e.w === w && (!pos || e.pos === pos))!;
  const top = (q: string) => searchExact(ents, q).hits.map((i) => ents[i].w);

  it("has one line of forms per row, none repeating the headword", () => {
    expect(formRows).toHaveLength(words.length);
    words.forEach((r, i) => {
      const forms = (formRows as string[])[i];
      expect(typeof forms, r[0]).toBe("string");
      if (forms) expect(forms.split(" "), r[0]).not.toContain(r[0].toLocaleLowerCase("mt"));
    });
  });

  it("shows forms only under nouns and adjectives, with known labels, and every shown form is searchable", () => {
    for (const e of ents) {
      if (!e.forms.length) continue;
      expect(e.pos.startsWith("n.") || e.pos === "aġġ.", `${e.w} ${e.pos}`).toBe(true);
      for (const [kind, forms] of e.forms) {
        expect(FORM_LABEL[kind], `${e.w}: ${kind}`).toBeTruthy();
        for (const f of forms.split(", ")) expect(e.fw, `${e.w}: ${f}`).toContain(f);
      }
    }
  });

  it("prints one plural for a noun, and feminine, plural and comparative for an adjective", () => {
    expect(entry("ktieb").forms).toEqual([["pl", "kotba"]]);
    expect(entry("triq").forms).toEqual([["pl", "toroq"]]);
    expect(entry("ħuta").forms).toEqual([["pl", "ħutiet"]]);
    expect(entry("kbir").forms).toEqual([
      ["f", "kbira"],
      ["pl", "kbar"],
      ["comp", "akbar"],
    ]);
    expect(entry("kiteb", "v.").forms).toEqual([]);
    for (const e of ents) {
      if (e.w === "bebbux") continue; // its forms are added by hand
      const allowed = e.pos === "aġġ." ? ["f", "pl", "comp"] : ["pl"];
      for (const [kind, forms] of e.forms) {
        expect(allowed, `${e.w}: ${kind}`).toContain(kind);
        expect(forms.includes(","), `${e.w}: ${forms}`).toBe(false);
      }
    }
  });

  it("prints nothing from Ġabra under a collective, only forms added by hand", () => {
    expect(entry("bajd").forms).toEqual([]);
    expect(entry("ħobż").forms).toEqual([]);
    expect(entry("bebbux").forms).toEqual([["sing", "bebbuxu, bebbuxa"]]);
    // still searchable
    expect(top("bajda")).toContain("bajd"); // abjad (white) comes first: bajda is its feminine too
    expect(top("ħobża")[0]).toBe("ħobż");
    expect(top("bebbuxiet")[0]).toBe("bebbux");
    expect(top("tifla")[0]).toBe("tifel");
  });

  it("has none of the duals built by rule, shown or searchable", () => {
    for (const e of ents) expect(e.forms.some(([kind]) => kind === "dual"), e.w).toBe(false);
    const all = new Set((formRows as string[]).flatMap((f) => f.split(" ")));
    for (const f of ["badtejn", "wardtajn", "żebbuġtejn", "qmejltejn", "ħsaratejn", "saħħtejn"]) expect(all.has(f), f).toBe(false);
  });

  it("finds an entry by any of its forms, and says which form matched", () => {
    expect(top("bebbuxu")[0]).toBe("bebbux");
    expect(top("bebbuxa")[0]).toBe("bebbux");
    expect(top("kotba")[0]).toBe("ktieb");
    expect(top("jikteb")[0]).toBe("kiteb");
    expect(top("hut")[0]).toBe("ħuta");
    const r = searchExact(ents, "kotba");
    expect(r.via[r.hits[0]]).toBe("kotba");
    expect(r.isMaltese).toBe(true);
    // a headword still beats a form spelt the same
    expect(searchExact(ents, "ktieb").via).toEqual({});
  });

  it("gives an entry with forms an extra line on the page", () => {
    const layout = paginate(ents, { lineWidth: 440, rowsHeight: 660, perView: 2 }, measure);
    const row = (w: string) => layout.pages.flatMap((p) => p.rows).find((r) => r.kind === "entry" && ents[r.i] === entry(w))!;
    const a = row("ktieb");
    const b = row("kiteb");
    expect(a.kind === "entry" && b.kind === "entry" && a.lines.length === 1 && b.lines.length === 1).toBe(true);
    if (a.kind === "entry" && b.kind === "entry") expect(a.h - b.h).toBe(19);
  });
});
