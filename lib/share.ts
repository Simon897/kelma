import { MAX_GUESSES, scoreGuess, type LetterState } from "./game";
import { MODE_NAME, type Mode } from "./modes";

const EMOJI: Record<"normal" | "contrast", Record<LetterState, string>> = {
  normal: { correct: "🟩", present: "🟨", absent: "⬜" },
  contrast: { correct: "🟧", present: "🟦", absent: "⬜" },
};

export function shareText(opts: {
  mode: Mode;
  day: number;
  guesses: string[];
  solution: string;
  won: boolean;
  highContrast: boolean;
}): string {
  const set = EMOJI[opts.highContrast ? "contrast" : "normal"];
  const score = opts.won ? `${opts.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const rows = opts.guesses.map((g) => scoreGuess(g, opts.solution).map((s) => set[s]).join(""));
  return [`Kelma ${MODE_NAME[opts.mode]} #${opts.day + 1} ${score}`, ...rows].join("\n");
}
