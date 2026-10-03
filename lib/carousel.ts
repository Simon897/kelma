/** Home-page carousel rules, kept pure so they can be tested. */

export type GameKey = "kelma" | "sellum";
export const GAMES: GameKey[] = ["kelma", "sellum"];

/** Land on the first game not finished today; if all are finished, the first slide. */
export function defaultSlide(doneToday: boolean[]): number {
  const i = doneToday.findIndex((done) => !done);
  return i < 0 ? 0 : i;
}

/** "Ġdid!" shows for the first 14 days of a game (day 0..13 from its epoch), then goes by itself. */
export const NEW_BADGE_DAYS = 14;
export function isNewGame(daysSinceLaunch: number): boolean {
  return daysSinceLaunch >= 0 && daysSinceLaunch < NEW_BADGE_DAYS;
}
