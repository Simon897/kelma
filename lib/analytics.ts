/**
 * Analytics seam. The provider is still to be chosen (cookieless, EU-friendly).
 * Until then this is a no-op. `game_end` must fire exactly once per finished
 * game: the caller only fires it when stats.recordGame() actually records.
 */
export type AnalyticsEvent = {
  game_end: { mode: "normali" | "tqila"; day: number; word: string; won: boolean; guesses: number };
};

export function track<E extends keyof AnalyticsEvent>(event: E, props: AnalyticsEvent[E]): void {
  if (process.env.NODE_ENV === "development") console.debug("[track]", event, props);
}
