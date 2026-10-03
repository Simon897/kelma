import { MAX_LIVES } from "./game.ts";

/**
 * Clipboard share text. Shows the puzzle (start → target) and lives, never the player's
 * own words, which would spoil the ladder for anyone who hasn't played.
 */
export function sellumShareText(opts: { day: number; start: string; target: string; livesLeft: number }): string {
  const left = Math.max(0, Math.min(MAX_LIVES, opts.livesLeft));
  const icons = "🟩".repeat(left) + "⬜".repeat(MAX_LIVES - left);
  return [`Sellum #${opts.day + 1} 🪜`, `${opts.start} → ${opts.target}`, `${icons} (lives: ${left}/${MAX_LIVES})`].join("\n");
}
