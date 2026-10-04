/**
 * Safe localStorage. Quietly does nothing during server rendering, in private
 * browsing, or when storage is full or blocked.
 * Keys are permanent once launched: renaming one wipes every player's streak.
 */
export const KEYS = {
  state: (mode: "normali" | "tqila") => `kelma:${mode}:state`,
  stats: (mode: "normali" | "tqila") => `kelma:${mode}:stats`,
  lang: "kelma:lang",
  settings: "kelma:settings",
  seenHelp: "kelma:seen-help",
  sellumState: "kelma:sellum:state",
  sellumStats: "kelma:sellum:stats",
  seenCarousel: "kelma:seen-carousel",
  gherqState: "kelma:gherq:state",
  gherqStats: "kelma:gherq:stats",
  /** Day whose game_end analytics event has been sent (once per day). */
  gherqTracked: "kelma:gherq:tracked",
  /** Set on the first visit to Għerq: the home slide then previews today's root. */
  gherqVisited: "kelma:gherq:visited",
} as const;

export function readJSON<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or full: ignore */
  }
}
