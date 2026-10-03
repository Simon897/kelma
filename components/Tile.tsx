"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useState } from "react";
import { FLIP_MS, FLIP_STAGGER_MS, type LetterState } from "@/lib/game";
import { t, type Dict, type Lang } from "@/lib/i18n";

export type TileState = LetterState | "empty" | "tbd";

export const FILL: Record<TileState, string> = {
  empty: "bg-limestone-50 border-limestone-300 text-ink",
  tbd: "bg-limestone-50 border-ink-soft text-ink",
  correct: "bg-tile-correct border-tile-correct text-tile-correct-fg",
  present: "bg-tile-present border-tile-present text-tile-present-fg",
  absent: "bg-tile-absent border-tile-absent text-tile-absent-fg",
};

export function stateLabel(state: TileState, d: Dict): string {
  return {
    correct: d.stateCorrect,
    present: d.statePresent,
    absent: d.stateAbsent,
    empty: d.stateEmpty,
    tbd: "",
  }[state];
}

/**
 * Non-colour cue so the three states never rely on hue alone:
 * a notch in the corner for "present", a bar along the bottom for "correct".
 */
export function StateMark({ state, small = false }: { state: TileState; small?: boolean }) {
  if (state === "present") {
    return (
      <span
        aria-hidden
        className={`absolute right-0 top-0 border-l-transparent border-t-current opacity-80 ${
          small ? "border-l-[7px] border-t-[7px]" : "border-l-[0.32em] border-t-[0.32em]"
        }`}
      />
    );
  }
  if (state === "correct") {
    return (
      <span
        aria-hidden
        className={`absolute left-[18%] right-[18%] bg-current opacity-80 ${small ? "bottom-[3px] h-[2px]" : "bottom-[0.14em] h-[0.08em]"}`}
      />
    );
  }
  return null;
}

interface TileProps {
  letter?: string;
  state: TileState;
  lang: Lang;
  /** Flip in when this tile's turn in the reveal comes. */
  reveal?: boolean;
  index?: number;
  className?: string;
}

const EASE = [0.45, 0, 0.2, 1] as const;

export function Tile({ letter = "", state, lang, reveal = false, index = 0, className = "" }: TileProps) {
  // During a reveal, a tile shows as typed ("tbd") until its staggered turn, then flips in with its colour.
  const d = t(lang);
  const [turned, setTurned] = useState(!reveal);
  useLayoutEffect(() => {
    if (!reveal) {
      setTurned(true);
      return;
    }
    setTurned(false);
    const id = window.setTimeout(() => setTurned(true), index * FLIP_STAGGER_MS);
    return () => window.clearTimeout(id);
  }, [reveal, index]);

  const shown: TileState = reveal && !turned ? "tbd" : state;
  const label = letter ? `${letter}, ${stateLabel(shown === "tbd" ? "empty" : shown, d)}` : stateLabel("empty", d);
  const ariaLabel = shown === "tbd" ? letter : label;

  return (
    <motion.div
      key={reveal && turned ? "flipped" : `${letter}-${shown}`}
      role="img"
      aria-label={ariaLabel}
      initial={
        reveal && turned ? { rotateX: -90 } : shown === "tbd" && letter ? { scale: 1 } : false
      }
      animate={
        reveal && turned
          ? { rotateX: 0, transition: { duration: FLIP_MS / 1000, ease: EASE } }
          : shown === "tbd" && letter && !reveal
            ? { scale: [1, 1.08, 1], transition: { duration: 0.12, ease: "linear" } }
            : undefined
      }
      className={`relative flex select-none items-center justify-center rounded-tile border-2 font-bold uppercase leading-none ${FILL[shown]} ${className}`}
      style={{ transformPerspective: 400 }}
    >
      {letter}
      <StateMark state={shown} />
    </motion.div>
  );
}
