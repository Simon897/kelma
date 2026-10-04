/** Home-page carousel rules, kept pure so they can be tested. */

export type GameKey = "gherq" | "kelma" | "sellum";
/** Għerq · Kelma · Sellum, so Kelma sits in the middle. */
export const GAMES: GameKey[] = ["gherq", "kelma", "sellum"];
export const HOME_SLIDE = GAMES.indexOf("kelma");

/**
 * Where the carousel opens: on Kelma (the middle) unless it's finished today; then the first
 * game not finished today; if everything is finished, back on Kelma.
 */
export function defaultSlide(doneToday: boolean[], home = HOME_SLIDE): number {
  if (!doneToday[home]) return home;
  const i = doneToday.findIndex((done) => !done);
  return i < 0 ? home : i;
}
