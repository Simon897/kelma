/**
 * The single source of "which day is it" for the whole site.
 *
 * Everything is computed from the calendar date in Europe/Malta, never from
 * the browser's local zone or raw UTC. Day arithmetic works on date parts
 * (Date.UTC of y/m/d), so daylight-saving changes can't produce an off-by-one.
 */

/**
 * Day 0. FROZEN once players have streaks: changing it shifts every saved
 * game and breaks every streak.
 * TODO(launch): provisional — confirm the real launch date before going live.
 */
export const EPOCH = "2026-09-29";

export const TIME_ZONE = "Europe/Malta";

const MS_PER_DAY = 86_400_000;

export interface DateParts {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
}

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

function zonedParts(instant: Date) {
  const out: Record<string, number> = {};
  for (const p of partsFormatter.formatToParts(instant)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

/** The calendar date in Malta at a given instant. */
export function maltaDateParts(instant: Date): DateParts {
  const { year, month, day } = zonedParts(instant);
  return { year, month, day };
}

function parseIsoDate(iso: string): DateParts {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function dayNumber({ year, month, day }: DateParts): number {
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/**
 * Sellum's own day 0 (Sellum #1). Same freezing rule as EPOCH.
 * TODO(launch): provisional — set to Sellum's real launch date.
 */
export const SELLUM_EPOCH = "2026-09-30";

const EPOCH_DAY = dayNumber(parseIsoDate(EPOCH));

/** Days since an ISO date, in Malta time. Negative before it. */
export function daysSince(epoch: string, instant: Date = new Date()): number {
  return dayNumber(maltaDateParts(instant)) - dayNumber(parseIsoDate(epoch));
}

/** Days since EPOCH in Malta time. Negative before launch. */
export function dayIndex(instant: Date = new Date()): number {
  return dayNumber(maltaDateParts(instant)) - EPOCH_DAY;
}

/** Sellum's day index (Sellum #N = index + 1). */
export function sellumDayIndex(instant: Date = new Date()): number {
  return daysSince(SELLUM_EPOCH, instant);
}

/** Offset of Malta from UTC at an instant, in minutes (60 or 120). */
function maltaOffsetMinutes(instant: Date): number {
  const p = zonedParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60_000);
}

/** The instant of the next midnight in Malta after `instant`. */
export function nextMaltaMidnight(instant: Date = new Date()): Date {
  const { year, month, day } = maltaDateParts(instant);
  const midnightAsUtc = Date.UTC(year, month - 1, day + 1);
  // Guess with the current offset, then correct with the offset at the guess
  // (they differ only on the two daylight-saving nights).
  let guess = midnightAsUtc - maltaOffsetMinutes(instant) * 60_000;
  guess = midnightAsUtc - maltaOffsetMinutes(new Date(guess)) * 60_000;
  return new Date(guess);
}

export function msUntilNextDay(instant: Date = new Date()): number {
  return nextMaltaMidnight(instant).getTime() - instant.getTime();
}

/* ------------------------------------------------------------------ */
/* Dates for display. Maltese names are hand-written: Intl's `mt` data  */
/* is not dependable (Ġunju, Diċembru).                                 */
/* ------------------------------------------------------------------ */

// REVIEW: native-speaker check of day and month names.
const MT_DAYS = ["Il-Ħadd", "It-Tnejn", "It-Tlieta", "L-Erbgħa", "Il-Ħamis", "Il-Ġimgħa", "Is-Sibt"];
const MT_MONTHS = [
  "Jannar", "Frar", "Marzu", "April", "Mejju", "Ġunju",
  "Lulju", "Awwissu", "Settembru", "Ottubru", "Novembru", "Diċembru",
];
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatMaltaDate(lang: "mt" | "en", instant: Date = new Date()): string {
  const parts = maltaDateParts(instant);
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  if (lang === "mt") {
    return `${MT_DAYS[weekday]}, ${parts.day} ta' ${MT_MONTHS[parts.month - 1]} ${parts.year}`;
  }
  return `${EN_DAYS[weekday]}, ${parts.day} ${EN_MONTHS[parts.month - 1]} ${parts.year}`;
}
