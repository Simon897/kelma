import { describe, expect, it } from "vitest";
import { EPOCH, dayIndex, formatMaltaDate, maltaDateParts, msUntilNextDay, nextMaltaMidnight } from "../lib/day-index";
import normali from "../data/kelma/normali.json";
import tqila from "../data/kelma/tqila.json";
import { MODES, getEntry } from "../lib/modes";

const at = (iso: string) => new Date(iso);
const idx = (iso: string) => dayIndex(at(iso));

describe("dayIndex (Europe/Malta)", () => {
  it("is 0 on the epoch in Malta", () => {
    expect(idx(`${EPOCH}T12:00:00+02:00`)).toBe(0);
    expect(idx(`${EPOCH}T00:00:00+02:00`)).toBe(0);
  });

  it("rolls over at Malta midnight in summer (UTC+2), not UTC midnight", () => {
    // 00:00 Malta on 15 July = 22:00 UTC on 14 July
    expect(idx("2026-07-14T22:00:00Z") - idx("2026-07-14T21:59:59Z")).toBe(1);
    expect(maltaDateParts(at("2026-07-14T22:00:00Z"))).toEqual({ year: 2026, month: 7, day: 15 });
    // UTC midnight is 02:00 in Malta: nothing changes there
    expect(idx("2026-07-15T00:00:00Z")).toBe(idx("2026-07-14T23:59:59Z"));
  });

  it("rolls over at Malta midnight in winter (UTC+1)", () => {
    expect(idx("2026-12-14T23:00:00Z") - idx("2026-12-14T22:59:59Z")).toBe(1);
    expect(idx("2026-12-15T00:00:00Z")).toBe(idx("2026-12-14T23:59:59Z"));
  });

  it("advances by exactly 1 across the March daylight-saving change", () => {
    // Clocks go forward on Sunday 29 March 2026 (a 23-hour day)
    const days = ["2026-03-28T12:00:00+01:00", "2026-03-29T12:00:00+02:00", "2026-03-30T12:00:00+02:00"].map(idx);
    expect(days[1] - days[0]).toBe(1);
    expect(days[2] - days[1]).toBe(1);
    expect(idx("2026-03-28T23:00:00Z") - idx("2026-03-28T22:59:59Z")).toBe(1);
    expect(idx("2026-03-29T21:59:59Z")).toBe(idx("2026-03-28T23:00:00Z"));
    expect(idx("2026-03-29T22:00:00Z") - idx("2026-03-29T21:59:59Z")).toBe(1);
  });

  it("advances by exactly 1 across the October daylight-saving change", () => {
    // Clocks go back on Sunday 25 October 2026 (a 25-hour day)
    const days = ["2026-10-24T12:00:00+02:00", "2026-10-25T12:00:00+01:00", "2026-10-26T12:00:00+01:00"].map(idx);
    expect(days[1] - days[0]).toBe(1);
    expect(days[2] - days[1]).toBe(1);
    expect(idx("2026-10-24T22:00:00Z") - idx("2026-10-24T21:59:59Z")).toBe(1);
    expect(idx("2026-10-25T22:59:59Z")).toBe(idx("2026-10-24T22:00:00Z"));
    expect(idx("2026-10-25T23:00:00Z") - idx("2026-10-25T22:59:59Z")).toBe(1);
  });

  it("consecutive days always differ by exactly 1 over two years", () => {
    let prev = dayIndex(new Date(Date.UTC(2026, 0, 1, 11)));
    for (let i = 1; i < 730; i++) {
      const cur = dayIndex(new Date(Date.UTC(2026, 0, 1 + i, 11)));
      expect(cur - prev).toBe(1);
      prev = cur;
    }
  });

  it("is negative before the epoch, and no puzzle is served", () => {
    const d = idx("2026-01-01T12:00:00Z");
    expect(d).toBeLessThan(0);
    for (const m of MODES) expect(getEntry(m, d)).toBeNull();
    expect(getEntry("normali", -1)).toBeNull();
  });

  it("serves nothing after the data runs out, and never wraps", () => {
    const length = { normali: normali.length, tqila: tqila.length };
    for (const m of MODES) {
      expect(getEntry(m, 0)).not.toBeNull();
      expect(getEntry(m, length[m] - 1)).not.toBeNull();
      expect(getEntry(m, length[m])).toBeNull();
      expect(getEntry(m, 100_000)).toBeNull();
    }
  });
});

describe("next Malta midnight", () => {
  it("counts down to Malta midnight in summer and winter", () => {
    expect(nextMaltaMidnight(at("2026-07-14T20:00:00Z")).toISOString()).toBe("2026-07-14T22:00:00.000Z");
    expect(nextMaltaMidnight(at("2026-12-14T20:00:00Z")).toISOString()).toBe("2026-12-14T23:00:00.000Z");
    expect(msUntilNextDay(at("2026-12-14T22:59:00Z"))).toBe(60_000);
  });

  it("handles both daylight-saving nights", () => {
    expect(nextMaltaMidnight(at("2026-03-28T20:00:00Z")).toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(nextMaltaMidnight(at("2026-03-29T06:00:00Z")).toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(nextMaltaMidnight(at("2026-10-24T20:00:00Z")).toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(nextMaltaMidnight(at("2026-10-25T06:00:00Z")).toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});

describe("formatMaltaDate", () => {
  it("uses hand-written Maltese names", () => {
    expect(formatMaltaDate("mt", at("2026-09-29T10:00:00Z"))).toBe("It-Tlieta, 29 ta' Settembru 2026");
    expect(formatMaltaDate("en", at("2026-09-29T10:00:00Z"))).toBe("Tuesday, 29 September 2026");
    expect(formatMaltaDate("mt", at("2026-06-05T10:00:00Z"))).toBe("Il-Ġimgħa, 5 ta' Ġunju 2026");
    expect(formatMaltaDate("mt", at("2026-12-20T10:00:00Z"))).toBe("Il-Ħadd, 20 ta' Diċembru 2026");
  });

  it("uses the Malta date, not UTC", () => {
    // 23:30Z on 30 Sep is 01:30 on 1 Oct in Malta
    expect(formatMaltaDate("en", at("2026-09-30T23:30:00Z"))).toBe("Thursday, 1 October 2026");
  });
});
