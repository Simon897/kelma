import normali from "../data/kelma/normali.json";
import tqila from "../data/kelma/tqila.json";
import type { AnswerEntry } from "./validate-data";

export type Mode = "normali" | "tqila";
export const MODES: Mode[] = ["normali", "tqila"];

// Lists are independent: never assume equal length or shared words.
const ANSWERS: Record<Mode, AnswerEntry[]> = {
  normali: normali as AnswerEntry[],
  tqila: tqila as AnswerEntry[],
};

/** Today's entry for a mode, or null before the epoch / after the data runs out. Never wraps. */
export function getEntry(mode: Mode, day: number): AnswerEntry | null {
  if (!Number.isInteger(day) || day < 0) return null;
  return ANSWERS[mode].find((e) => e.day === day) ?? null;
}

export function otherMode(mode: Mode): Mode {
  return mode === "normali" ? "tqila" : "normali";
}

/** Name used in the share title and the header: always the Maltese mode name. */
export const MODE_NAME: Record<Mode, string> = { normali: "Normali", tqila: "Diffiċli" };

/** Every answer word in both modes, across all days. */
export function allAnswerWords(): Set<string> {
  return new Set(MODES.flatMap((m) => ANSWERS[m].map((e) => e.word)));
}
