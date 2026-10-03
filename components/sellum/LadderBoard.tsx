"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FLIP_STAGGER_MS } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import { tilesOf } from "@/lib/sellum/graph";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { FILL, StateMark, type TileState } from "../Tile";

const EASE = [0.45, 0, 0.2, 1] as const;

export type RowView =
  | { kind: "empty" }
  | { kind: "locked"; word: string }
  | { kind: "active"; draft: string[]; flash: boolean };

interface LadderBoardProps {
  start: string;
  target: string;
  /** Rows 2–4, the ones the player fills. */
  rows: [RowView, RowView, RowView];
  /** The row that was just accepted and flips in, tile by tile: row index 0–2. */
  flip: { row: number; key: number } | null;
  shakeKey: number;
  /** Flip the target row in, one tile at a time, when the ladder is complete. */
  celebrate: boolean;
  d: Dict;
}

/**
 * Sellum's board, in the same tile language as Kelma's: the start word on top, three rows for
 * the player's steps, and the target at the bottom. Letters already in the target's position
 * are green with an underline (the non-colour cue).
 */
export function LadderBoard({ start, target, rows, flip, shakeKey, celebrate, d }: LadderBoardProps) {
  const reduce = usePrefersReducedMotion();
  const targetT = tilesOf(target);
  const rowLabel = (n: number) => d.floorOf(n, 5);
  const label = (i: number, l: string, place: boolean) => `${d.galleryLocked(i + 1, l)}${place ? `, ${d.inPlace}` : ""}`;

  // The target row turns green tile by tile once the ladder is complete.
  const [turned, setTurned] = useState(celebrate ? 5 : 0);
  useEffect(() => {
    if (!celebrate) return setTurned(0);
    if (reduce) return setTurned(5);
    setTurned(0);
    const ids = Array.from({ length: 5 }, (_, i) => window.setTimeout(() => setTurned(i + 1), i * FLIP_STAGGER_MS));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [celebrate, reduce]);

  const tileBox = "relative flex aspect-square items-center justify-center rounded-tile border-2 font-bold uppercase leading-none";

  const staticTile = (l: string, state: TileState, key: string | number, flipKey?: number, ariaLabel?: string, delay = 0) => (
    <motion.div
      key={flipKey !== undefined ? `${key}-${flipKey}` : key}
      role="img"
      aria-label={ariaLabel}
      initial={flipKey !== undefined && !reduce ? { rotateX: -90 } : false}
      animate={{ rotateX: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
      style={{ transformPerspective: 400 }}
      className={`${tileBox} ${FILL[state]}`}
    >
      {l}
      <StateMark state={state} />
    </motion.div>
  );

  const wordRow = (word: string, n: number, flipKey?: number) => {
    const w = tilesOf(word);
    return (
      <div role="group" aria-label={rowLabel(n)} className="grid grid-cols-5 gap-[6px]">
        {w.map((l, i) => {
          const place = l === targetT[i];
          return staticTile(l, place ? "correct" : "tbd", i, flipKey, label(i, l, place), (i * FLIP_STAGGER_MS) / 1000);
        })}
      </div>
    );
  };

  const playerRow = (view: RowView, r: 0 | 1 | 2) => {
    const n = r + 2;
    if (view.kind === "empty") {
      return (
        <div key={n} role="group" aria-label={`${rowLabel(n)}, ${d.galleryClosed}`} className="grid grid-cols-5 gap-[6px]">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} aria-hidden className={`${tileBox} ${FILL.empty}`} />
          ))}
        </div>
      );
    }
    if (view.kind === "locked") {
      return <div key={n}>{wordRow(view.word, n, flip && flip.row === r ? flip.key : undefined)}</div>;
    }
    return (
      <motion.div
        key={`active-${shakeKey}`}
        role="group"
        aria-label={rowLabel(n)}
        animate={shakeKey > 0 && !reduce ? { x: [0, -8, 8, -6, 6, -3, 0] } : undefined}
        transition={{ duration: 0.4, ease: "linear" }}
        className="grid grid-cols-5 gap-[6px]"
      >
        {Array.from({ length: 5 }, (_, i) => {
          const l = view.draft[i] ?? "";
          const state: TileState = !l ? "empty" : view.flash ? "absent" : "tbd";
          return (
            <motion.div
              key={`${i}-${l}`}
              role="img"
              aria-label={l || d.stateEmpty}
              initial={l && !view.flash ? { scale: 1 } : false}
              animate={l && !view.flash && !reduce ? { scale: [1, 1.08, 1] } : undefined}
              transition={{ duration: 0.12, ease: "linear" }}
              className={`${tileBox} ${FILL[state]}`}
            >
              {l}
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  return (
    // A size container, so the board scales to whatever height is left above the keyboard.
    <div className="flex min-h-0 w-full flex-1 items-center justify-center px-3 py-2 [container-type:size]">
      <div
        className="grid grid-rows-5 gap-[6px]"
        style={{
          width: "min(100cqw, 100cqh - 16px, 360px)",
          fontSize: "calc(min(100cqw, 100cqh - 16px, 360px) / 5 * 0.45)",
        }}
      >
        {wordRow(start, 1)}
        {playerRow(rows[0], 0)}
        {playerRow(rows[1], 1)}
        {playerRow(rows[2], 2)}
        {/* the target: always shown; it flips to green when the ladder reaches it */}
        <div role="group" aria-label={rowLabel(5)} className="mt-[10px] grid grid-cols-5 gap-[6px]">
          {targetT.map((l, i) => {
            const done = i < turned;
            return staticTile(l, done ? "correct" : "tbd", `t${i}`, done && celebrate ? 1 : undefined, d.galleryLocked(i + 1, l));
          })}
        </div>
      </div>
    </div>
  );
}
