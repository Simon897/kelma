import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as analytics from "../lib/analytics";
import {
  bonusPoints,
  classifyEntry,
  clueOrder,
  hintLetter,
  coreWords,
  displayGherqStreak,
  earnedPoints,
  emptyGherqStats,
  gherqShareText,
  nextHint,
  nextStarIn,
  pointsForTier,
  recordStars,
  starThresholds,
  starsFor,
  totalPoints,
  type GherqPuzzle,
  type Lexicon,
} from "../lib/gherq/game";
import { gherqProgressToday, saveGherqState, trackGherqOnce } from "../lib/gherq/store";
import { isSimpleRoot, validateGherq } from "../lib/gherq/validate";

const read = (p: string) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

/** K-T-B with an alternative spelling, a merged homograph and a 3-point rarity. */
const KTB: GherqPuzzle = {
  day: 0,
  root: ["K", "T", "B"],
  words: [
    { word: "KITEB", alts: [], pos: "VERB", gloss: "to write", points: 1 },
    { word: "KTIEB", alts: [], pos: "NOUN", gloss: "book", points: 1 },
    { word: "KITBA", alts: [], pos: "NOUN", gloss: "writing", points: 1 },
    { word: "KTIB", alts: [], pos: "NOUN", gloss: "the act of writing", points: 2 },
    { word: "KITTIEB", alts: ["KITTIEBA"], pos: "NOUN", gloss: "writer; scribe", points: 2 },
    { word: "NKITEB", alts: [], pos: "VERB", gloss: "to be written", points: 2 },
    { word: "KTEJJEB", alts: [], pos: "NOUN", gloss: "booklet", points: 3 },
    { word: "KITTIEBI", alts: [], pos: "ADJ", gloss: "of writers", points: 3 },
  ],
};
// BARRA belongs to two roots; KTIEB-like spellings map to k-t-b; SKOLA has no root.
const LEX: Lexicon = {
  KITEB: "k-t-b", KTIEB: "k-t-b", KITBA: "k-t-b", KTIB: "k-t-b", KITTIEB: "k-t-b", KITTIEBA: "k-t-b",
  NKITEB: "k-t-b", KTEJJEB: "k-t-b", KITTIEBI: "k-t-b", KITTEB: "k-t-b",
  SKOLA: null, BAĦAR: "b-ħ-r", BARRA: ["b-r-j", "b-r-r"],
};

describe("entry classification (rules table)", () => {
  const none = new Set<string>();
  it("accepts a word from today's root", () => {
    expect(classifyEntry("KTIEB", KTB, none, LEX)).toEqual({ kind: "ok", word: "KTIEB" });
  });
  it("an alternative spelling finds the same word, and only once", () => {
    expect(classifyEntry("KITTIEBA", KTB, none, LEX)).toEqual({ kind: "ok", word: "KITTIEB" });
    expect(classifyEntry("KITTIEBA", KTB, new Set(["KITTIEB"]), LEX)).toEqual({ kind: "repeat", word: "KITTIEB" });
    expect(classifyEntry("KITTIEB", KTB, new Set(["KITTIEB"]), LEX).kind).toBe("repeat");
  });
  it("a real word from another root is 'not from this root', a non-word is 'not in the list'", () => {
    expect(classifyEntry("BAĦAR", KTB, none, LEX).kind).toBe("wrong-root");
    expect(classifyEntry("SKOLA", KTB, none, LEX).kind).toBe("wrong-root");
    expect(classifyEntry("KTXYZ", KTB, none, LEX).kind).toBe("not-word");
  });
  it("multi-root spellings match on any of their roots", () => {
    const BRR: GherqPuzzle = { ...KTB, root: ["B", "R", "R"], words: [{ word: "BARRA", alts: [], pos: "ADV", gloss: "outside", points: 1 }] };
    expect(classifyEntry("BARRA", BRR, none, LEX).kind).toBe("ok");
    // a spelling the lexicon gives today's root, but which isn't in the puzzle, doesn't count
    expect(classifyEntry("KITTEB", KTB, none, LEX).kind).toBe("excluded");
  });
  it("fewer than 2 letters is a shake with no toast", () => {
    expect(classifyEntry("K", KTB, none, LEX).kind).toBe("short");
  });
  it("before the lexicon loads, puzzle words still work and anything else waits", () => {
    expect(classifyEntry("KTIEB", KTB, none, null).kind).toBe("ok");
    expect(classifyEntry("BAĦAR", KTB, none, null).kind).toBe("pending");
    expect(classifyEntry("KTXYZ", KTB, none, null).kind).toBe("pending");
  });
});

describe("points and stars", () => {
  it("points come from the tier", () => {
    expect([1, 2, 3, 4, 5, null].map(pointsForTier)).toEqual([1, 1, 2, 3, 3, 3]);
  });
  it("thresholds round up: a 9-point puzzle needs 3 points for two stars", () => {
    expect(starThresholds(9)).toEqual([3, 5, 7, 9]);
    expect(starsFor(2, 9, 2)).toBe(1);
    expect(starsFor(3, 9, 2)).toBe(2);
  });
  it("the first word gives one star, every core word gives five", () => {
    expect(totalPoints(KTB)).toBe(9); // the two 3-point bonus words don't count
    expect(starsFor(0, 9, 0)).toBe(0);
    expect(starsFor(1, 9, 1)).toBe(1);
    const core = new Set(coreWords(KTB).map((w) => w.word));
    expect(starsFor(earnedPoints(KTB, core), 9, core.size)).toBe(5);
  });
  it("bonus words add points on top but never move the stars", () => {
    const some = new Set(["KITEB", "KTEJJEB", "KITTIEBI"]);
    expect(earnedPoints(KTB, some)).toBe(1);
    expect(bonusPoints(KTB, some)).toBe(6);
    expect(starsFor(earnedPoints(KTB, some), 9, some.size)).toBe(1);
  });
  it("says how far the next star is", () => {
    expect(nextStarIn(1, 9, 1)).toBe(2); // 25% of 9 rounds up to 3
    expect(nextStarIn(9, 9, 6)).toBeNull();
  });
});

describe("clues and hints", () => {
  it("reveals the lowest-point unfound word first", () => {
    expect(nextHint(KTB, new Set(), [])?.word).toBe("KITBA"); // 1 point, then shortest, then A–Z
    expect(nextHint(KTB, new Set(["KITBA"]), [])?.word).toBe("KITEB");
    expect(nextHint(KTB, new Set(["KTIEB"]), ["KITBA", "KITEB"])?.word).toBe("KTIB"); // 1-pointers used up
  });
  it("lists every core word as a clue, easiest and shortest first", () => {
    expect(clueOrder(KTB).map((w) => w.word)).toEqual(["KITBA", "KITEB", "KTIEB", "KTIB", "NKITEB", "KITTIEB"]);
  });
  it("a hint reveals the first letter that isn't a root letter, in its place", () => {
    const ħrġ = ["Ħ", "R", "Ġ"];
    expect(hintLetter("ĦAREĠ", ħrġ)).toEqual({ index: 1, letter: "A" });
    expect(hintLetter("ĦRUĠ", ħrġ)).toEqual({ index: 2, letter: "U" });
    expect(hintLetter("STĦARREĠ", ħrġ)).toEqual({ index: 0, letter: "S" }); // a prefix comes first
    expect(hintLetter("ĦARREĠ", ħrġ)).toEqual({ index: 1, letter: "A" }); // a doubled radical is still the root
    expect(hintLetter("GĦERQ", ["GĦ", "R", "Q"])).toEqual({ index: 2, letter: "E" }); // GĦ is two tiles, both root
    expect(hintLetter("ĦRĠ", ħrġ)).toEqual({ index: 0, letter: "Ħ" }); // only root letters: the first
  });
  it("never hints a bonus word", () => {
    const core = coreWords(KTB).map((w) => w.word);
    expect(nextHint(KTB, new Set(core), [])).toBeNull();
  });
});

describe("streak and stats", () => {
  it("a day with at least one star extends the streak; stars only move up within a day", () => {
    let s = emptyGherqStats();
    s = recordStars(s, 0, 1);
    s = recordStars(s, 0, 3);
    s = recordStars(s, 1, 2);
    expect(s.played).toBe(2);
    expect(s.stars).toEqual([0, 1, 1, 0, 0]);
    expect(s.currentStreak).toBe(2);
    expect(recordStars(s, 1, 0)).toBe(s);
    s = recordStars(s, 3, 1);
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(2);
    expect(displayGherqStreak(s, 5)).toBe(0);
  });
});

describe("share text", () => {
  it("never includes the found words, and leaves out the hint line at 0 hints", () => {
    const text = gherqShareText({ day: 11, root: ["K", "T", "B"], stars: 4, found: 7, total: 9, hints: 1, lang: "mt" });
    expect(text).toBe("Għerq #12 · K-T-B\n★★★★☆ 7/9 kliem\n1 ħjiel");
    for (const w of KTB.words) expect(text).not.toContain(w.word);
    expect(gherqShareText({ day: 0, root: ["GĦ", "R", "S"], stars: 2, found: 3, total: 9, hints: 0, lang: "en" })).toBe("Għerq #1 · GĦ-R-S\n★★☆☆☆ 3/9 words");
    expect(gherqShareText({ day: 0, root: ["K", "T", "B"], stars: 5, found: 6, total: 6, bonus: 1, hints: 0, lang: "en" })).toBe("Għerq #1 · K-T-B\n★★★★★ 6/6 words +1 bonus");
  });
});

describe("root shape", () => {
  it("allows plain three-letter roots, including a W or J at the start and doubled letters", () => {
    for (const r of ["k-t-b", "ħ-m-r", "għ-r-q", "ħ-q-q", "w-q-f", "j-b-s"]) expect(isSimpleRoot(r.split("-"))).toBe(true);
  });
  it("rejects weak middle or final radicals and roots that aren't three letters", () => {
    for (const r of ["d-w-m", "ħ-j-n", "b-n-j", "ħ-l-w", "q-r-'", "x-n-d-r", "b-ż-b-ż"]) expect(isSimpleRoot(r.split("-"))).toBe(false);
  });
  it("rejects a puzzle on a weak root", () => {
    const errors = validateGherq([{ ...KTB, root: ["D", "W", "M"] }], LEX).join("\n");
    expect(errors).toMatch(/plain three-letter roots/);
  });
});

describe("puzzle validator", () => {
  it("passes a good puzzle and the shipped data", () => {
    expect(validateGherq([KTB], LEX)).toEqual([]);
    expect(validateGherq(read("data/gherq/puzzles.json"), read("data/gherq/lexicon.json"))).toEqual([]);
  });
  it("rejects word counts, points, duplicates, wrong roots and day gaps", () => {
    const join = (p: Partial<GherqPuzzle>[]) => validateGherq(p as GherqPuzzle[], LEX).join("\n");
    expect(join([{ ...KTB, words: KTB.words.slice(0, 5) }])).toMatch(/5 core words, needs 6–20/);
    expect(join([{ ...KTB, words: KTB.words.map((w) => ({ ...w, points: 2 as const })) }])).toMatch(/one-point/);
    expect(join([{ ...KTB, words: [...KTB.words.slice(0, 7), { ...KTB.words[7], points: 4 as 1 }] }])).toMatch(/points 4/);
    expect(join([{ ...KTB, words: [...KTB.words, { word: "KITTIEBA", alts: [], pos: "NOUN", gloss: "x", points: 2 }] }])).toMatch(/appears twice/);
    expect(join([{ ...KTB, words: [...KTB.words, { word: "BAĦAR", alts: [], pos: "NOUN", gloss: "sea", points: 1 }] }])).toMatch(/root k-t-b/);
    expect(join([KTB, { ...KTB, day: 2 }])).toMatch(/no repeats or gaps/);
    expect(join([KTB, { ...KTB, day: 1 }])).toMatch(/root repeats within 365/);
  });
});

describe("storage: progress and once-a-day analytics", () => {
  class Mem {
    m = new Map<string, string>();
    getItem(k: string) {
      return this.m.get(k) ?? null;
    }
    setItem(k: string, v: string) {
      this.m.set(k, v);
    }
  }
  beforeEach(() => vi.stubGlobal("window", { localStorage: new Mem() }));

  it("reports none / partial / done for the home-page dot", () => {
    const core = coreWords(KTB).map((w) => w.word);
    expect(gherqProgressToday(0, core)).toBe("none");
    saveGherqState({ day: 0, found: ["KTIEB"], hints: 0, revealed: false, hinted: [] });
    expect(gherqProgressToday(0, core)).toBe("partial");
    saveGherqState({ day: 0, found: core, hints: 0, revealed: false, hinted: [] });
    expect(gherqProgressToday(0, core)).toBe("done"); // every core word, no bonus needed
    saveGherqState({ day: 0, found: ["KTIEB"], hints: 0, revealed: true, hinted: [] });
    expect(gherqProgressToday(0, core)).toBe("done");
    expect(gherqProgressToday(1, core)).toBe("none");
  });

  it("sends game_end exactly once per day", () => {
    const spy = vi.spyOn(analytics, "track");
    const props = { day: 3, stars: 2, found: 4, total: 9, hints: 1, revealed: false };
    expect(trackGherqOnce(props)).toBe(true);
    expect(trackGherqOnce({ ...props, stars: 5 })).toBe(false);
    expect(trackGherqOnce({ ...props, day: 4 })).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith("game_end", { game: "gherq", ...props });
    spy.mockRestore();
  });
});
