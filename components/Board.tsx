"use client";

import { motion } from "framer-motion";
import { MAX_GUESSES, WORD_LENGTH, scoreGuess, tiles } from "@/lib/game";
import type { Dict, Lang } from "@/lib/i18n";
import { Tile, type TileState } from "./Tile";

interface BoardProps {
  guesses: string[];
  current: string[];
  solution: string | null;
  revealRow: number | null;
  shakeKey: number;
  d: Dict;
  lang: Lang;
}

export function Board({ guesses, current, solution, revealRow, shakeKey, d, lang }: BoardProps) {
  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < guesses.length && solution) {
      const letters = tiles(guesses[r]);
      const scores = scoreGuess(guesses[r], solution);
      return { letters, states: scores as TileState[], kind: "done" as const };
    }
    if (r === guesses.length) {
      const letters = [...current, ...Array(WORD_LENGTH - current.length).fill("")];
      return { letters, states: letters.map((l) => (l ? "tbd" : "empty")) as TileState[], kind: "current" as const };
    }
    return { letters: Array(WORD_LENGTH).fill(""), states: Array(WORD_LENGTH).fill("empty") as TileState[], kind: "future" as const };
  });

  return (
    // The wrapper is a size container so the board scales to whatever height is left.
    <div className="flex min-h-0 w-full flex-1 items-center justify-center px-3 py-2 [container-type:size]">
      <div
        role="group"
        aria-label={d.boardAria}
        className="grid aspect-[5/6] grid-rows-6 gap-[5px]"
        style={{
          height: "min(100cqh, 420px, 120cqw)",
          fontSize: "calc(min(100cqh, 420px, 120cqw) / 6 * 0.5)",
        }}
      >
        {rows.map((row, r) => (
          <motion.div
            key={r === guesses.length ? `row-${r}-${shakeKey}` : `row-${r}`}
            className="grid grid-cols-5 gap-[5px]"
            animate={r === guesses.length && shakeKey > 0 ? { x: [0, -8, 8, -6, 6, -3, 0] } : undefined}
            transition={{ duration: 0.4, ease: "linear" }}
          >
            {row.letters.map((letter, i) => (
              <Tile
                key={i}
                letter={letter}
                state={row.states[i]}
                lang={lang}
                index={i}
                reveal={revealRow === r}
                className="h-full w-full"
              />
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
