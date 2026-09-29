import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateData, type AnswerEntry } from "../lib/validate-data";

const read = (f: string) => JSON.parse(readFileSync(new URL(`../data/kelma/${f}`, import.meta.url), "utf8"));
const guesses = ["SKOLA", "KAMRA", "ĦSIEB", "BAĦAR"];
const e = (day: number, word: string): AnswerEntry => ({ day, word, gloss: "x" });

describe("validateData", () => {
  it("passes the shipped data", () => {
    expect(validateData({ normali: read("normali.json"), tqila: read("tqila.json") }, read("valid-guesses.json"))).toEqual([]);
  });

  it("passes a good list", () => {
    expect(validateData({ a: [e(0, "SKOLA"), e(1, "ĦSIEB")] }, guesses)).toEqual([]);
  });

  it("fails when an answer is missing from the guess list", () => {
    expect(validateData({ a: [e(0, "SKOLA"), e(1, "TIFEL")] }, guesses).join()).toMatch(/TIFEL.*missing from valid-guesses/);
  });

  it("fails when a word isn't exactly 5 characters", () => {
    expect(validateData({ a: [e(0, "SKOL")] }, [...guesses, "SKOL"]).join()).toMatch(/4 characters/);
    expect(validateData({ a: [e(0, "BAĦARA")] }, [...guesses, "BAĦARA"]).join()).toMatch(/6 characters/);
  });

  it("fails when a day repeats or is skipped", () => {
    expect(validateData({ a: [e(0, "SKOLA"), e(0, "KAMRA")] }, guesses).join()).toMatch(/day 0 repeats/);
    expect(validateData({ a: [e(0, "SKOLA"), e(2, "KAMRA")] }, guesses).join()).toMatch(/gap/);
    expect(validateData({ a: [e(1, "SKOLA")] }, guesses).join()).toMatch(/gap/);
  });

  it("fails on a missing gloss or a leaked difficulty tier", () => {
    expect(validateData({ a: [{ day: 0, word: "SKOLA", gloss: "" }] }, guesses).join()).toMatch(/gloss/);
    expect(validateData({ a: [{ ...e(0, "SKOLA"), tier: 5 } as AnswerEntry] }, guesses).join()).toMatch(/tier/);
  });

  it("fails on a plain C, which Maltese doesn't have", () => {
    expect(validateData({ a: [e(0, "CAMRA")] }, ["CAMRA"]).join()).toMatch(/outside the uppercase Maltese alphabet/);
  });
});
