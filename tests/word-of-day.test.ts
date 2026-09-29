import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allAnswerWords } from "../lib/modes";
import { validateWordOfDay } from "../lib/validate-data";
import { pickWordOfDay, toAnswerForm } from "../lib/word-of-day";

const list = [
  { word: "sbula", gloss: "an ear of corn" },
  { word: "tfettil", gloss: "rubbing" },
  { word: "nigħa", gloss: "moaning" },
];

describe("pickWordOfDay", () => {
  it("changes every day and wraps around", () => {
    const none = new Set<string>();
    expect(pickWordOfDay(list, 1, none)?.word).toBe("tfettil");
    expect(pickWordOfDay(list, 2, none)?.word).toBe("nigħa");
    expect(pickWordOfDay(list, 3, none)?.word).toBe("sbula");
    expect(pickWordOfDay(list, -1, none)?.word).toBe("nigħa");
  });

  it("never shows a Kelma answer: it skips to the next word", () => {
    const answers = new Set(["SBULA"]);
    expect(pickWordOfDay(list, 0, answers)?.word).toBe("tfettil");
    expect(pickWordOfDay(list, 3, answers)?.word).toBe("tfettil");
  });

  it("matches Maltese letters when comparing with answers", () => {
    expect(toAnswerForm("nigħa")).toBe("NIGĦA");
    expect(pickWordOfDay(list, 2, new Set(["NIGĦA"]))?.word).toBe("sbula");
  });

  it("returns null when every word is excluded or the list is empty", () => {
    expect(pickWordOfDay(list, 0, new Set(["SBULA", "TFETTIL", "NIGĦA"]))).toBeNull();
    expect(pickWordOfDay([], 0, new Set())).toBeNull();
  });

  it("with the shipped data, no day in the next 5 years shows an answer from either mode", () => {
    const shipped = JSON.parse(readFileSync(new URL("../data/kelma/word-of-day.json", import.meta.url), "utf8"));
    const answers = allAnswerWords();
    expect(answers.has("SBULA")).toBe(true);
    for (let day = -30; day < 365 * 5; day++) {
      const w = pickWordOfDay(shipped, day, answers);
      expect(w).not.toBeNull();
      expect(answers.has(toAnswerForm(w!.word))).toBe(false);
    }
  });
});

describe("validateWordOfDay", () => {
  it("passes the shipped file", () => {
    const shipped = JSON.parse(readFileSync(new URL("../data/kelma/word-of-day.json", import.meta.url), "utf8"));
    expect(validateWordOfDay(shipped)).toEqual([]);
  });
  it("catches missing meanings and repeats", () => {
    expect(validateWordOfDay([{ word: "x", gloss: "" }]).join()).toMatch(/gloss/);
    expect(validateWordOfDay([{ word: "x", gloss: "a" }, { word: "x", gloss: "b" }]).join()).toMatch(/repeats/);
    expect(validateWordOfDay([])).toHaveLength(1);
  });
});
