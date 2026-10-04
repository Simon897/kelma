"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { GherqWord } from "@/lib/gherq/game";
import { tiles } from "@/lib/gherq/game";
import type { Dict } from "@/lib/i18n";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

const EASE = [0.45, 0, 0.2, 1] as const;

/** Today's root as stone tiles joined by hyphens: K-T-B. A digraph radical (GĦ) is one tile. */
export function RootTiles({ root, size = "md", onSoil = false }: { root: string[]; size?: "sm" | "md"; onSoil?: boolean }) {
  const box = size === "sm" ? "h-7 min-w-7 px-1 text-sm" : "h-10 min-w-10 px-1.5 text-xl";
  return (
    <div role="img" aria-label={root.join("-")} className={`flex items-center justify-center gap-1 ${onSoil ? "mx-auto w-fit rounded-tile bg-soil px-2 py-1" : ""}`}>
      {root.map((r, i) => (
        <span key={i} aria-hidden className="flex items-center gap-1">
          {i > 0 && <span className={`font-bold ${onSoil ? "text-limestone-50" : "text-ink"}`}>-</span>}
          <span className={`stone inline-flex items-center justify-center rounded-tile border-2 border-ink bg-limestone-50 font-bold leading-none text-ink shadow-block-sm ${box}`}>{r}</span>
        </span>
      ))}
    </div>
  );
}

function Star({ filled, pop, reduce }: { filled: boolean; pop: boolean; reduce: boolean }) {
  return (
    <motion.span
      className="relative inline-flex size-[26px]"
      initial={false}
      animate={pop && !reduce ? { scale: [0, 1.25, 1] } : { scale: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden focusable="false">
        <path
          d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.5L12 16.9l-5.8 3.3 1.4-6.5-4.9-4.4 6.5-.7Z"
          fill={filled ? "var(--color-star)" : "transparent"}
          stroke={filled ? "var(--color-star)" : "var(--color-ink-soft)"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {/* a small festa-gold sparkle when a star is earned */}
      {pop && !reduce && (
        <motion.svg
          viewBox="0 0 40 40"
          className="pointer-events-none absolute -inset-2"
          aria-hidden
          initial={{ opacity: 1, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <path key={a} d="M20 4v6" stroke="var(--color-ochre)" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${a} 20 20)`} />
          ))}
        </motion.svg>
      )}
    </motion.span>
  );
}

/** Five star outlines that fill as they're earned; the newest pops in. */
export function Stars({ stars, d }: { stars: number; d: Dict }) {
  const reduce = usePrefersReducedMotion();
  const prev = useRef(stars);
  const [popAt, setPopAt] = useState<number | null>(null);
  useEffect(() => {
    if (stars > prev.current) setPopAt(stars - 1);
    prev.current = stars;
  }, [stars]);
  return (
    <div className="flex items-center gap-[3px]">
      <span className="sr-only">{d.starsOf(stars)}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={`${i}-${popAt === i ? "pop" : ""}`} filled={i < stars} pop={popAt === i} reduce={reduce} />
      ))}
    </div>
  );
}

/** The entry row: grows tile by tile, and tiles shrink after 8 letters so long words fit at 375px. */
export function EntryRow({ letters, shakeKey, placeholder }: { letters: string[]; shakeKey: number; placeholder: string }) {
  const reduce = usePrefersReducedMotion();
  const n = letters.length;
  const size = n <= 8 ? 40 : Math.max(20, Math.floor((340 - (n - 1) * 3) / n));
  return (
    <motion.div
      key={shakeKey}
      animate={shakeKey > 0 && !reduce ? { x: [0, -8, 8, -6, 6, -3, 0] } : undefined}
      transition={{ duration: 0.4, ease: "linear" }}
      className="flex h-[48px] items-center justify-center gap-[3px]"
      role="group"
      aria-label={letters.join("") || placeholder}
    >
      {n === 0 ? (
        <span className="text-sm text-ink-soft">{placeholder}</span>
      ) : (
        letters.map((l, i) => (
          <motion.span
            key={`${i}-${l}`}
            aria-hidden
            initial={reduce ? false : { scale: 1 }}
            animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
            transition={{ duration: 0.12, ease: "linear" }}
            style={{ width: size, height: Math.min(44, Math.max(size + 4, 30)), fontSize: Math.max(12, size * 0.5) }}
            className="flex items-center justify-center rounded-tile border-2 border-ink-soft bg-limestone-50 font-bold uppercase leading-none text-ink"
          >
            {l}
          </motion.span>
        ))
      )}
    </motion.div>
  );
}

/** Points badge: the number, plus a text equivalent for screen readers. */
export function PointsBadge({ points, d, muted = false }: { points: number; d: Dict; muted?: boolean }) {
  return (
    <span
      className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-tile px-1 text-xs font-bold tabular-nums ${
        muted ? "border border-ink-soft text-ink-soft" : points === 3 ? "bg-star text-limestone-50" : "bg-ink text-limestone-50"
      }`}
    >
      <span aria-hidden>{`+${points}`}</span>
      <span className="sr-only">{d.pointsAria(points)}</span>
    </span>
  );
}

/** A found word as a small dictionary entry: word in display caps, gloss beneath, points badge. */
export function FoundCard({ word, d, fresh = false }: { word: GherqWord; d: Dict; fresh?: boolean }) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.li
      initial={fresh && !reduce ? { opacity: 0, x: -16 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay: fresh ? 0.35 : 0 }}
      className="stone flex items-start justify-between gap-2 rounded-tile border-2 border-ink/80 bg-limestone-50 px-3 py-2"
    >
      <span className="min-w-0">
        <span lang="mt" className="display-caps block text-base leading-tight">
          {word.word}
        </span>
        <span className="block text-sm leading-snug text-ink-soft">{word.gloss}</span>
      </span>
      <PointsBadge points={word.points} d={d} />
    </motion.li>
  );
}

/**
 * A clue: the meaning of a word not found yet, with a box per letter (as in Kelma, GĦ is two).
 * A hint fills in one box: the first letter that isn't one of the root's.
 */
export function ClueCard({ word, d, reveal }: { word: GherqWord; d: Dict; reveal: { index: number; letter: string } | null }) {
  const n = tiles(word.word).length;
  return (
    <li className="flex items-start justify-between gap-2 rounded-tile border-2 border-dashed border-ink-soft px-3 py-2">
      <span className="min-w-0">
        <span role="img" aria-label={d.clueAria(n, reveal && { position: reveal.index + 1, letter: reveal.letter })} className="flex flex-wrap gap-[3px] py-0.5">
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={`flex size-[22px] items-center justify-center rounded-[2px] border text-xs font-bold leading-none ${
                i === reveal?.index ? "border-ink bg-limestone-50 text-ink" : "border-ink-soft/70 bg-limestone-50/40"
              }`}
            >
              {i === reveal?.index ? reveal.letter : ""}
            </span>
          ))}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-ink">{word.gloss}</span>
      </span>
      <PointsBadge points={word.points} d={d} muted />
    </li>
  );
}
