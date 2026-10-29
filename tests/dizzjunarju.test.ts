import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import list from "../data/words/herbs-spices.json";
import { capitalise, categoryWords } from "../lib/dizzjunarju";

const svgs = readdirSync(new URL("../public/hwawar/", import.meta.url)).filter((f) => f.endsWith(".svg"));

describe("dizzjunarju: herbs and spices", () => {
  const shown = categoryWords("herbs-spices");

  it("shows only checked words, each with a Maltese word", () => {
    const checked = list.words.filter((w) => w.checked);
    expect(shown.map((w) => w.key)).toEqual(checked.map((w) => w.key));
    for (const w of shown) expect(w.mt.trim()).not.toBe("");
    expect(shown).toHaveLength(33);
    expect(shown.find((w) => w.key === "lemon-verbena")).toBeUndefined();
  });

  it("has a drawing for every word shown, and no drawing for anything hidden", () => {
    for (const w of shown) expect(existsSync(new URL(`../public/hwawar/${w.key}.svg`, import.meta.url)), w.key).toBe(true);
    expect(svgs.sort()).toEqual(shown.map((w) => `${w.key}.svg`).sort());
  });

  it("keys are unique and match the English name", () => {
    const keys = list.words.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const w of list.words) expect(w.key).toBe(w.en.replace(/ /g, "-"));
  });

  it("keeps the editor's choices", () => {
    const mt = Object.fromEntries(shown.map((w) => [w.key, [w.mt, ...w.alts].join(" / ")]));
    expect(mt).toMatchObject({
      marjoram: "merqtux",
      chamomile: "gamumilla",
      capers: "kappar",
      oregano: "rieġnu",
      chives: "kurrat irqieq",
      "black-pepper": "bżar / bżar iswed",
      aniseed: "ħlewwa",
      fenugreek: "fienu",
    });
  });

  it("capitalises Maltese letters", () => {
    expect(capitalise("ħabaq")).toBe("Ħabaq");
    expect(capitalise("ġulġlien")).toBe("Ġulġlien");
    expect(capitalise("żagħfran")).toBe("Żagħfran");
  });
});
