import type { GameKey } from "./carousel";
import { dayIndex, gherqDayIndex, sellumDayIndex } from "./day-index";
import { filProgressThisWeek } from "./fil/store";
import { isDoneToday } from "./game-store";
import { coreWords } from "./gherq/game";
import { getGherqPuzzle } from "./gherq/puzzles";
import { gherqProgressToday } from "./gherq/store";
import { isSellumDoneToday } from "./sellum/store";

export type Progress = "none" | "partial" | "done";

/** Fired when Malta's midnight passes on the home page, so everything re-reads today's progress. */
export const NEW_DAY_EVENT = "kelma:new-day";

/**
 * Today's progress in each game (browser only: reads localStorage). Kelma counts as done when both
 * modes are; Għerq is "partial" once a word is found and "done" with every core word or a reveal.
 * Fil is weekly: this week's puzzle, "partial" once a word is found and "done" when solved.
 */
export function gamesToday(): Record<GameKey, Progress> {
  const kDay = dayIndex();
  const gDay = gherqDayIndex();
  const gPuzzle = getGherqPuzzle(gDay);
  return {
    gherq: gherqProgressToday(gDay, gPuzzle ? coreWords(gPuzzle).map((w) => w.word) : null),
    kelma: isDoneToday("normali", kDay) && isDoneToday("tqila", kDay) ? "done" : "none",
    sellum: isSellumDoneToday(sellumDayIndex()) ? "done" : "none",
    fil: filProgressThisWeek(),
  };
}

export const allDone = (p: Record<GameKey, Progress>) => Object.values(p).every((v) => v === "done");
