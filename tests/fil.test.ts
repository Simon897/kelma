import { describe, expect, it } from "vitest";
import { FIL_EPOCH, filWeekIndex } from "../lib/day-index";
import { WORDS_PER_HINT, apply, canHint, isSolved, judge, lockedTiles, newFilState, sanitise, takeHint, touchTile, type FilState } from "../lib/fil/game";
import { COLS, PUZZLES, ROWS, releasedPuzzles } from "../lib/fil/puzzles";
import { checkPuzzle } from "../scripts/lib/fil-grid.mjs";
import { validateFil } from "../scripts/validate-fil.mjs";

const p = PUZZLES.find((x) => x.id === "familja")!;
const none = new Set<number>();
/** Find words in order, as the game does. */
const play = (s: FilState, ...words: string[]) =>
  words.reduce((acc, w) => {
    const x = p.words.find((y) => y.word === w)!;
    return apply(acc, judge(p, acc, x.path));
  }, s);
const withCredit = (n: number): FilState => ({ ...newFilState(), credit: n });

describe("fil puzzles", () => {
  it("all pass the grid rules: 48 tiles each used once, no crossings, one route per word", () => {
    expect(validateFil(PUZZLES)).toEqual([]);
    for (const x of PUZZLES) expect(x.grid).toHaveLength(COLS * ROWS);
  });

  it("keeps the words the puzzles were first made with", () => {
    expect(p.theme.mt).toBe("Il-familja");
    expect(p.words.map((w) => w.word).sort()).toEqual(["KUNJAT", "NANNU", "NEPUTI", "OMM", "RAĠEL", "TARBIJA", "ZIJA", "ZIJU", "ĠENITURI"].sort());
  });

  it("catches a broken layout, including a word crossing itself", () => {
    expect(checkPuzzle({ ...p, grid: [...p.grid].reverse() }).length).toBeGreaterThan(0);
    // two steps on the two diagonals of one square
    const cross = { id: "x", grid: Array(48).fill("A"), words: [{ word: "AA", path: [6, 13] }, { word: "AA", path: [7, 12] }] };
    expect(checkPuzzle(cross).some((e) => e.includes("crosses"))).toBe(true);
    const self = { id: "y", grid: Array(48).fill("A"), words: [{ word: "AAAA", path: [0, 7, 1, 6] }] };
    expect(checkPuzzle(self).some((e) => e.includes("crosses AAAA"))).toBe(true);
  });

  it("releases one puzzle a week, every Sunday at midnight Malta time", () => {
    expect(new Date(`${FIL_EPOCH}T12:00:00Z`).getUTCDay()).toBe(0); // the epoch is a Sunday
    expect(filWeekIndex(new Date(`${FIL_EPOCH}T00:30:00+01:00`))).toBe(0);
    expect(filWeekIndex(new Date("2026-11-21T23:30:00+01:00"))).toBe(0); // the Saturday night after
    expect(filWeekIndex(new Date("2026-11-22T00:10:00+01:00"))).toBe(1); // next Sunday, just after midnight in Malta
    expect(filWeekIndex(new Date("2026-11-21T23:10:00Z"))).toBe(1); // the same moment in UTC
    expect(filWeekIndex(new Date("2026-11-14T22:00:00Z"))).toBe(-1); // before launch
    expect(releasedPuzzles(-1)).toEqual([]);
    expect(releasedPuzzles(1).map((x) => x.week)).toEqual([1, 2]);
  });
});

describe("fil input", () => {
  it("adds neighbours, steps back onto the tile before, and ignores far tiles while dragging", () => {
    expect(touchTile([], 0, none, false)).toEqual([0]);
    expect(touchTile([0], 7, none, false)).toEqual([0, 7]);
    expect(touchTile([0, 7], 0, none, false)).toEqual([0]);
    expect(touchTile([0, 7], 30, none, false)).toEqual([0, 7]);
  });

  it("taps: the last tile again confirms, an earlier one cuts back, a far one starts again", () => {
    expect(touchTile([0, 1, 2], 2, none, true)).toBe("submit");
    expect(touchTile([0, 1, 2], 0, none, true)).toEqual([0]);
    expect(touchTile([0, 1], 40, none, true)).toEqual([40]);
  });

  it("never picks a tile of a found word", () => {
    const s = play(newFilState(), p.words[0].word);
    expect(touchTile([], p.words[0].path[0], lockedTiles(p, s), true)).toEqual([]);
  });
});

describe("fil words", () => {
  it("counts a theme word only on its own tiles, once", () => {
    const w = p.words[0];
    expect(judge(p, newFilState(), w.path)).toEqual({ kind: "theme", word: w.word });
    expect(judge(p, play(newFilState(), w.word), w.path).kind).toBe("already");
  });

  it("turns short traces and non-words away, and counts other real words towards a hint", () => {
    expect(judge(p, newFilState(), [0, 1]).kind).toBe("short");
    const path = p.words[0].path;
    const word = path.map((c) => p.grid[c]).join("");
    const fake = { ...p, words: p.words.slice(1), bonus: [word] };
    const v = judge(fake, newFilState(), path);
    expect(v).toEqual({ kind: "bonus", word });
    const s = apply(newFilState(), v);
    expect(s.credit).toBe(1);
    expect(judge(fake, s, path).kind).toBe("already");
  });

  it("is solved with every word", () => {
    expect(isSolved(p, play(newFilState(), ...p.words.map((w) => w.word)))).toBe(true);
  });
});

describe("fil hints", () => {
  it("needs three bonus words and outlines one unfound word", () => {
    expect(canHint(p, withCredit(WORDS_PER_HINT - 1))).toBe(false);
    const s = takeHint(p, withCredit(3), () => 0.5);
    expect(p.words.map((w) => w.word)).toContain(s.hint);
    expect(s.credit).toBe(0);
    expect(s.hintsUsed).toBe(1);
  });

  it("waits for the outlined word before the next hint, and never outlines a found word", () => {
    const one = takeHint(p, withCredit(6), () => 0);
    expect(canHint(p, one)).toBe(false);
    const found = play(one, one.hint!);
    expect(found.hint).toBeNull();
    expect(canHint(p, found)).toBe(true);
    expect(takeHint(p, found, () => 0).hint).not.toBe(one.hint);
  });
});

describe("fil saving", () => {
  it("drops anything in a saved state that doesn't fit the puzzle", () => {
    const s = sanitise(p, { found: ["OMM", "NOPE", "OMM"], bonus: ["ZZZZ"], credit: -2, hint: "NOPE", hintsUsed: 2 });
    expect(s).toEqual({ found: ["OMM"], bonus: [], credit: 0, hint: null, hintsUsed: 2 });
    expect(sanitise(p, "junk")).toEqual(newFilState());
  });
});

