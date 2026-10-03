import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as analytics from "../lib/analytics";
import { defaultSlide, isNewGame } from "../lib/carousel";
import { daysSince, sellumDayIndex, SELLUM_EPOCH } from "../lib/day-index";
import { COSTS_LIFE, ladderWords, newState, submitWord, type LadderContext, type SellumState } from "../lib/sellum/game";
import { buildGraph, countShortestRoutes, diffCount, distancesFrom, shortestRoutes } from "../lib/sellum/graph";
import { sellumShareText } from "../lib/sellum/share";
import { recordSellum, emptySellumStats } from "../lib/sellum/stats";
import { completeSellum, loadSellumState, saveSellumState } from "../lib/sellum/store";
import { validateSellum, type SellumPuzzle } from "../lib/sellum/validate";

/*
 * A tiny graph with exactly three shortest routes from AAAAA to BBBBA:
 *   AAAAA → BAAAA → BBAAA → BBBAA → BBBBA
 *   AAAAA → ABAAA → BBAAA → BBBAA → BBBBA
 *   AAAAA → BAAAA → BABAA → BBBAA → BBBBA
 * plus real words that are dead ends (AAAAC, CAAAA) and one inflected-looking decoy (BAAAC).
 */
const WORDS = ["AAAAA", "BAAAA", "ABAAA", "BBAAA", "BABAA", "BBBAA", "BBBBA", "AAAAC", "CAAAA", "BAAAC"];
const graph = buildGraph(WORDS);
const toTarget = distancesFrom(graph, "BBBBA");
const ctx: LadderContext = { start: "AAAAA", target: "BBBBA", toTarget, isWord: (w) => graph.has(w) };

describe("one-letter difference", () => {
  it("counts changed tiles", () => {
    expect(diffCount("KAMRA", "KAMRA")).toBe(0);
    expect(diffCount("KAMRA", "ŻAMRA")).toBe(1);
    expect(diffCount("KAMRA", "KARMA")).toBe(2);
  });
  it("treats GĦ and IE as two tiles each", () => {
    expect(diffCount("GĦAJN", "GĦAJB")).toBe(1);
    expect(diffCount("ĦSIEB", "ĦSIER")).toBe(1);
    expect(diffCount("GĦAJN", "GĦAQN")).toBe(1);
    expect(diffCount("GĦAJN", "GĦAJ")).toBe(-1);
  });
});

describe("distance map and routes", () => {
  it("measures shortest distances back from the target", () => {
    expect(toTarget.get("AAAAA")).toBe(4);
    expect(toTarget.get("BBAAA")).toBe(2);
    expect(toTarget.get("AAAAC")).toBeUndefined(); // 5 away: past the depth limit
  });
  it("counts and lists every shortest route", () => {
    expect(countShortestRoutes(graph, "AAAAA", toTarget)).toBe(3);
    expect(shortestRoutes(graph, "AAAAA", toTarget)).toHaveLength(3);
    expect(countShortestRoutes(graph, "AAAAA", toTarget, (w) => w !== "ABAAA")).toBe(2);
  });
});

describe("entry rules and lives", () => {
  let s: SellumState;
  beforeEach(() => {
    s = newState(0);
  });

  it("accepts every word on any shortest route", () => {
    for (const route of shortestRoutes(graph, "AAAAA", toTarget)) {
      let st = newState(0);
      for (const w of route.slice(1, 4)) {
        const r = submitWord(st, w, ctx);
        expect(r.result).toBe("ok");
        st = r.state;
      }
      expect(st.status).toBe("won");
      expect(st.lives).toBe(3);
    }
  });

  it("changing 0 or 2+ letters is a slip: shake, no life lost", () => {
    for (const w of ["AAAAA", "BBAAA", "AAAA"]) {
      const r = submitWord(s, w, ctx);
      expect(r.result).toBe("shape");
      expect(r.state.lives).toBe(3);
    }
  });

  it("reusing a word is a slip: no life lost", () => {
    s = submitWord(s, "BAAAA", ctx).state;
    const r = submitWord(s, "AAAAA", ctx); // one letter from BAAAA, but it's the start
    expect(r.result).toBe("used");
    expect(r.state.lives).toBe(3);
  });

  it("a word not in the list costs a life", () => {
    const r = submitWord(s, "AAAAZ", ctx);
    expect(r.result).toBe("not-word");
    expect(r.state.lives).toBe(2);
    expect(r.state.words).toEqual([]);
  });

  it("a real word that's a dead end costs a life and isn't placed", () => {
    const r = submitWord(s, "AAAAC", ctx);
    expect(r.result).toBe("dead-end");
    expect(r.state.lives).toBe(2);
    expect(r.state.words).toEqual([]);
    // BAAAC is one letter from BAAAA but 4 from the target at step 2: also a dead end
    const r2 = submitWord(submitWord(s, "BAAAA", ctx).state, "BAAAC", ctx);
    expect(r2.result).toBe("dead-end");
  });

  it("matches the rules table: only not-word and dead-end cost a life", () => {
    expect(COSTS_LIFE).toEqual({ shape: false, used: false, "not-word": true, "dead-end": true, ok: false });
  });

  it("three lost lives end the game", () => {
    for (const w of ["AAAAZ", "AAAAC", "CAAAA"]) s = submitWord(s, w, ctx).state;
    expect(s.lives).toBe(0);
    expect(s.status).toBe("lost");
    expect(submitWord(s, "BAAAA", ctx).state).toBe(s); // nothing more is accepted
  });

  it("completes the final step to the target automatically", () => {
    for (const w of ["BAAAA", "BBAAA", "BBBAA"]) s = submitWord(s, w, ctx).state;
    expect(s.status).toBe("won");
    expect(s.words).toEqual(["BAAAA", "BBAAA", "BBBAA"]);
    expect(ladderWords(s, ctx)).toEqual(["AAAAA", "BAAAA", "BBAAA", "BBBAA", "BBBBA"]);
  });
});

describe("puzzle validator", () => {
  const good: SellumPuzzle = { day: 0, start: "AAAAA", target: "BBBBA", routes: 3, example: ["AAAAA", "BAAAA", "BBAAA", "BBBAA", "BBBBA"] };
  const check = (p: Partial<SellumPuzzle>[]) => validateSellum(p as SellumPuzzle[], WORDS).join("\n");

  it("passes a good puzzle and the shipped data", () => {
    expect(check([good])).toBe("");
    const read = (f: string) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
    expect(validateSellum(read("sellum/puzzles.json"), read("kelma/valid-guesses.json"))).toEqual([]);
  });
  it("rejects words outside the list and the wrong distance", () => {
    expect(check([{ ...good, target: "ZZZZZ" }])).toMatch(/not in the word list/);
    expect(check([{ ...good, target: "BBBAA", example: [] }])).toMatch(/not exactly 4/);
  });
  it("rejects an illegal example route", () => {
    expect(check([{ ...good, example: ["AAAAA", "AAAAC", "BBAAA", "BBBAA", "BBBBA"] }])).toMatch(/not a legal route/);
    expect(check([{ ...good, example: ["AAAAA", "BBAAA", "BBBAA", "BBBBA"] }])).toMatch(/not a legal route/);
  });
  it("rejects too few routes, a wrong route count, and repeated or skipped days", () => {
    const tiny = buildGraph(["AAAAA", "BAAAA", "BBAAA", "BBBAA", "BBBBA"]);
    expect(validateSellum([{ ...good, routes: 1, example: good.example }], [], tiny).join()).toMatch(/at least 3/);
    expect(check([{ ...good, routes: 5 }])).toMatch(/there are 3/);
    expect(check([good, { ...good, day: 0 }])).toMatch(/no repeats or gaps/);
    expect(check([good, { ...good, day: 2 }])).toMatch(/no repeats or gaps/);
  });
});

describe("share text", () => {
  it("shows the puzzle and lives but never the player's words", () => {
    const played = ["BAAAA", "BBAAA", "BBBAA"];
    const text = sellumShareText({ day: 11, start: "AAAAA", target: "BBBBA", livesLeft: 2 });
    expect(text).toBe("Sellum #12 🪜\nAAAAA → BBBBA\n🟩🟩⬜ (lives: 2/3)");
    for (const w of played) expect(text).not.toContain(w);
    expect(sellumShareText({ day: 0, start: "A", target: "B", livesLeft: 0 })).toContain("⬜⬜⬜ (lives: 0/3)");
  });
});

describe("stats and storage", () => {
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

  it("buckets wins by lives left, and losses separately", () => {
    let st = emptySellumStats();
    st = recordSellum(st, 0, true, 3).stats;
    st = recordSellum(st, 1, true, 1).stats;
    st = recordSellum(st, 2, false, 0).stats;
    expect(st.lives).toEqual([1, 0, 1, 1]);
    expect(st.maxStreak).toBe(2);
    expect(st.currentStreak).toBe(0);
  });

  it("restores a game mid-way and fires game_end exactly once", () => {
    const mid: SellumState = { day: 4, words: ["BAAAA"], lives: 2, status: "playing" };
    saveSellumState(mid);
    expect(loadSellumState(4)).toEqual(mid);
    expect(loadSellumState(5)).toEqual(newState(5));
    const spy = vi.spyOn(analytics, "track");
    const done: SellumState = { day: 4, words: ["BAAAA", "BBAAA", "BBBAA"], lives: 2, status: "won" };
    completeSellum(done);
    completeSellum(done); // reload after finishing
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("game_end", { game: "sellum", day: 4, won: true, livesLeft: 2, steps: 4 });
    spy.mockRestore();
  });
});

describe("home carousel", () => {
  it("lands on the first game not finished today", () => {
    expect(defaultSlide([false, false])).toBe(0);
    expect(defaultSlide([true, false])).toBe(1);
    expect(defaultSlide([false, true])).toBe(0);
    expect(defaultSlide([true, true])).toBe(0);
  });
  it("shows the Ġdid badge for exactly the first 14 days", () => {
    expect(isNewGame(-1)).toBe(false);
    expect(isNewGame(0)).toBe(true);
    expect(isNewGame(13)).toBe(true);
    expect(isNewGame(14)).toBe(false);
  });
  it("counts Sellum's days from its own epoch", () => {
    expect(sellumDayIndex(new Date(`${SELLUM_EPOCH}T12:00:00+02:00`))).toBe(0);
    expect(daysSince(SELLUM_EPOCH, new Date(`${SELLUM_EPOCH}T23:30:00Z`))).toBe(1); // 01:30 in Malta
  });
});

describe("how-to-play example", () => {
  it("is a legal ladder that never gives away a scheduled puzzle", async () => {
    const { EXAMPLE_LADDER } = await import("../lib/sellum/example");
    const valid = JSON.parse(readFileSync(new URL("../data/kelma/valid-guesses.json", import.meta.url), "utf8"));
    const g = buildGraph(valid);
    const toT = distancesFrom(g, EXAMPLE_LADDER[4]);
    EXAMPLE_LADDER.forEach((w, i) => {
      expect(g.has(w)).toBe(true);
      expect(toT.get(w)).toBe(4 - i);
    });
    const puzzles: SellumPuzzle[] = JSON.parse(readFileSync(new URL("../data/sellum/puzzles.json", import.meta.url), "utf8"));
    const scheduled = new Set(puzzles.flatMap((p) => [p.start, p.target]));
    for (const w of EXAMPLE_LADDER) expect(scheduled.has(w)).toBe(false);
  });
});
