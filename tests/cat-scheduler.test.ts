import { describe, expect, it } from "vitest";
import {
  IDLES,
  IDLE_MAX_MS,
  IDLE_MIN_MS,
  createIdleScheduler,
  pickIdle,
  type IdleDef,
  type IdleName,
} from "../lib/gherq/cat-scheduler";

/** A fake clock: timers fire only when the test advances time. */
function fakeTimers() {
  let now = 0;
  let next = 1;
  const pending = new Map<number, { at: number; fn: () => void }>();
  return {
    timers: {
      set: (fn: () => void, ms: number) => {
        const id = next++;
        pending.set(id, { at: now + ms, fn });
        return id;
      },
      clear: (id: unknown) => void pending.delete(id as number),
    },
    /** Delay of the one pending timer (there is at most one). */
    pendingDelay: () => {
      const all = [...pending.values()];
      return all.length ? all[0].at - now : null;
    },
    count: () => pending.size,
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const due = [...pending.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        pending.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = end;
    },
  };
}

/** A seeded random number generator, so the runs are repeatable. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

function setup(idles: IdleDef[] = IDLES.awake, random = seeded(7)) {
  const clock = fakeTimers();
  const played: IdleName[] = [];
  let ends = 0;
  const s = createIdleScheduler({ idles: () => idles, onIdle: (i) => played.push(i.name), onEnd: () => ends++, random, timers: clock.timers });
  return { s, clock, played, ends: () => ends };
}

describe("cat idle scheduler", () => {
  it("waits a random 6–12s between idles", () => {
    const { s, clock } = setup();
    s.start();
    const delays: number[] = [];
    for (let i = 0; i < 200; i++) {
      const d = clock.pendingDelay()!;
      delays.push(d);
      clock.advance(d); // the idle starts
      clock.advance(clock.pendingDelay()!); // and finishes
    }
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(IDLE_MIN_MS);
    expect(Math.max(...delays)).toBeLessThanOrEqual(IDLE_MAX_MS);
    // genuinely random, not one fixed gap
    expect(new Set(delays.map((d) => Math.round(d / 500))).size).toBeGreaterThan(5);
  });

  it("plays one idle at a time and never the same one twice in a row", () => {
    const { s, clock, played } = setup();
    s.start();
    clock.advance(10 * 60_000);
    expect(played.length).toBeGreaterThan(30);
    for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1]);
    expect(clock.count()).toBeLessThanOrEqual(1);
  });

  it("picks rare idles about one time in ten", () => {
    const random = seeded(42);
    let rare = 0;
    let last: IdleName | null = null;
    for (let i = 0; i < 5000; i++) {
      const idle: IdleDef = pickIdle(IDLES.awake, last, random)!;
      if (idle.rare) rare++;
      last = idle.name;
    }
    // ~10% of picks, a little more because a rare idle is never followed by itself
    expect(rare / 5000).toBeGreaterThan(0.06);
    expect(rare / 5000).toBeLessThan(0.14);
  });

  it("keeps idles between 0.6s and 2.5s", () => {
    for (const list of Object.values(IDLES)) for (const i of list) expect(i.ms >= 600 && i.ms <= 2500).toBe(true);
  });

  it("lets a reaction interrupt a running idle, then waits a full interval", () => {
    const { s, clock, played, ends } = setup();
    s.start();
    clock.advance(clock.pendingDelay()!);
    expect(played).toHaveLength(1);
    expect(s.busy).toBe(true);
    s.react(700);
    expect(ends()).toBe(1); // the idle was cut short, back to base
    clock.advance(700);
    expect(ends()).toBe(2); // the reaction finished
    const wait = clock.pendingDelay()!;
    expect(wait).toBeGreaterThanOrEqual(IDLE_MIN_MS);
    expect(played).toHaveLength(1);
  });

  it("pauses while hidden or off-screen and resumes after", () => {
    const { s, clock, played } = setup();
    s.start();
    s.setPaused("hidden", true);
    expect(clock.count()).toBe(0);
    clock.advance(60_000);
    expect(played).toHaveLength(0);
    s.setPaused("offscreen", true);
    s.setPaused("hidden", false);
    clock.advance(60_000);
    expect(played).toHaveLength(0); // still off-screen
    s.setPaused("offscreen", false);
    clock.advance(IDLE_MAX_MS);
    expect(played).toHaveLength(1);
  });

  it("stops a running idle when the tab is hidden", () => {
    const { s, clock, ends } = setup();
    s.start();
    clock.advance(clock.pendingDelay()!);
    s.setPaused("hidden", true);
    expect(ends()).toBe(1);
    expect(clock.count()).toBe(0);
  });

  it("does nothing until started, and nothing after stop", () => {
    const { s, clock, played } = setup();
    clock.advance(60_000);
    expect(played).toHaveLength(0);
    s.start();
    s.stop();
    clock.advance(60_000);
    expect(played).toHaveLength(0);
  });

  it("only has the idles the pose allows", () => {
    const { s, clock, played } = setup(IDLES.drowsy);
    s.start();
    clock.advance(5 * 60_000);
    expect(new Set(played)).toEqual(new Set(["earTwitch"]));
    // the only idle it has keeps coming back (occasional ear twitches)
    expect(played.length).toBeGreaterThan(10);
  });
});
