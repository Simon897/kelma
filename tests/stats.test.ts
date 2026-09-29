import { beforeEach, describe, expect, it, vi } from "vitest";
import * as analytics from "../lib/analytics";
import { completeGame, isDoneToday, loadState, loadStats, saveState } from "../lib/game-store";
import { displayStreak, emptyStats, recordGame } from "../lib/stats";

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  keys() {
    return [...this.m.keys()];
  }
}

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("window", { localStorage: storage });
});

describe("recordGame", () => {
  it("builds streaks from consecutive wins and resets on a loss", () => {
    let s = emptyStats();
    s = recordGame(s, 0, true, 3).stats;
    s = recordGame(s, 1, true, 4).stats;
    expect(s.currentStreak).toBe(2);
    s = recordGame(s, 2, false, 6).stats;
    expect(s.currentStreak).toBe(0);
    expect(s.maxStreak).toBe(2);
    s = recordGame(s, 4, true, 1).stats;
    expect(s.currentStreak).toBe(1);
    expect(s.distribution).toEqual([1, 0, 1, 1, 0, 0]);
    expect(s.played).toBe(4);
    expect(s.won).toBe(3);
  });

  it("is idempotent per day", () => {
    const a = recordGame(emptyStats(), 5, true, 2);
    const b = recordGame(a.stats, 5, true, 2);
    expect(b.recorded).toBe(false);
    expect(b.stats.played).toBe(1);
  });

  it("shows the streak as broken after a missed day", () => {
    const s = recordGame(emptyStats(), 3, true, 2).stats;
    expect(displayStreak(s, 4)).toBe(1);
    expect(displayStreak(s, 5)).toBe(0);
  });
});

describe("per-mode independence", () => {
  it("finishing Normali leaves Tqila's state and stats untouched", () => {
    saveState("tqila", { day: 1, guesses: ["KAMRA"], status: "playing" });
    completeGame("tqila", 0, "KWIET", true, 2);
    const tqilaStats = JSON.stringify(loadStats("tqila"));

    saveState("normali", { day: 1, guesses: ["SKOLA", "KAMRA"], status: "won" });
    completeGame("normali", 1, "KAMRA", true, 2);

    expect(JSON.stringify(loadStats("tqila"))).toBe(tqilaStats);
    expect(loadStats("normali").played).toBe(1);
    expect(loadStats("normali").currentStreak).toBe(1);
    expect(loadState("tqila", 1)).toEqual({ day: 1, guesses: ["KAMRA"], status: "playing" });
    expect(isDoneToday("normali", 1)).toBe(true);
    expect(isDoneToday("tqila", 1)).toBe(false);
    expect(storage.keys().sort()).toEqual([
      "kelma:normali:state",
      "kelma:normali:stats",
      "kelma:tqila:state",
      "kelma:tqila:stats",
    ]);
  });

  it("fires game_end exactly once per game, even after a reload", () => {
    const spy = vi.spyOn(analytics, "track");
    completeGame("normali", 2, "MEJDA", false, 6);
    completeGame("normali", 2, "MEJDA", false, 6); // the page reloads after finishing
    completeGame("tqila", 2, "ĦSIEB", true, 3); // other mode is its own game
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith("game_end", { mode: "normali", day: 2, word: "MEJDA", won: false, guesses: 6 });
    spy.mockRestore();
  });

  it("does not restore a saved game from another day", () => {
    saveState("normali", { day: 1, guesses: ["SKOLA"], status: "playing" });
    expect(loadState("normali", 2).guesses).toEqual([]);
  });

  it("survives storage that throws", () => {
    const blocked = () => {
      throw new Error("blocked");
    };
    vi.stubGlobal("window", { localStorage: { getItem: blocked, setItem: blocked } });
    expect(loadStats("normali").played).toBe(0);
    expect(() => completeGame("normali", 0, "SKOLA", true, 1)).not.toThrow();
  });
});
