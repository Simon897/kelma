import type { Lexicon } from "./game";

/**
 * lexicon.json (~170 KB) is loaded after first paint, as its own chunk. Until it arrives the
 * game treats unknown words as "check again shortly" (classifyEntry's "pending"), never as
 * "not a word": puzzle words are still recognised straight away from the puzzle itself.
 */
let promise: Promise<Lexicon> | null = null;
export function loadLexicon(): Promise<Lexicon> {
  promise ??= import("../../data/gherq/lexicon.json").then((m) => (m.default ?? m) as Lexicon);
  return promise;
}
