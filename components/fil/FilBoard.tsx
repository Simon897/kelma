"use client";

import { useRef } from "react";
import type { Dict } from "@/lib/i18n";
import { COLS, ROWS, type FilPuzzle } from "@/lib/fil/puzzles";
import type { FilState } from "@/lib/fil/game";

/** Each tile is a 100×100 square in the lines' drawing, so the lines meet the tile centres at any size. */
const U = 100;
const centre = (c: number) => [(c % COLS) * U + U / 2, Math.floor(c / COLS) * U + U / 2];
/** Every found word is the same green, line and tiles alike. */
const FOUND_FILL = "bg-tile-correct text-tile-correct-fg";
const FOUND_STROKE = "var(--color-tile-correct)";
const linePath = (path: number[]) => path.map((c, i) => `${i ? "L" : "M"}${centre(c).join(" ")}`).join(" ");


export interface BoardHandlers {
  onDown: (tile: number, e: React.PointerEvent) => void;
  onMove: (tile: number) => void;
  onUp: () => void;
  onKeyTap: (tile: number) => void;
}

/**
 * The 6×8 grid. Pointer input (mouse, pen and touch) is read from the board's geometry, so a drag
 * keeps working when the finger leaves a tile, and only the inner part of a tile counts while
 * dragging, which makes diagonals easy. Tiles are buttons, so the keyboard can tap them too.
 */
export function FilBoard({
  puzzle,
  state,
  sel,
  locked,
  shake,
  d,
  handlers,
}: {
  puzzle: FilPuzzle;
  state: FilState;
  sel: number[];
  locked: Set<number>;
  shake: { tiles: number[]; key: number } | null;
  d: Dict;
  handlers: BoardHandlers;
}) {
  const board = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const tileAt = (x: number, y: number, inner: boolean): number | null => {
    const r = board.current?.getBoundingClientRect();
    if (!r) return null;
    const cw = r.width / COLS, ch = r.height / ROWS;
    const col = Math.floor((x - r.left) / cw), row = Math.floor((y - r.top) / ch);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    if (inner && Math.hypot(x - (r.left + (col + 0.5) * cw), y - (r.top + (row + 0.5) * ch)) > Math.min(cw, ch) * 0.42) return null;
    return row * COLS + col;
  };

  const found = new Set(state.found);
  const owner = new Map<number, string>();
  for (const w of puzzle.words) if (found.has(w.word)) w.path.forEach((c) => owner.set(c, FOUND_FILL));
  // A hint outlines one unfound word's tiles, without their order.
  const hinted = new Set(state.hint && !found.has(state.hint) ? (puzzle.words.find((w) => w.word === state.hint)?.path ?? []) : []);
  const selected = new Set(sel);

  return (
    <div
      ref={board}
      data-fil-board
      className="relative mx-auto aspect-[6/8] w-full max-w-[min(100%,24rem,calc((100svh-19rem)*0.75))] min-w-[16rem] touch-none select-none"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const t = tileAt(e.clientX, e.clientY, false);
        if (t === null || locked.has(t)) return;
        e.preventDefault();
        dragging.current = true;
        last.current = { x: e.clientX, y: e.clientY };
        try {
          board.current?.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic events have no pointer to capture */
        }
        handlers.onDown(t, e);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        // A fast swipe can jump past tiles between two events: walk the straight line between them,
        // so every tile the finger crossed is visited in order.
        const from = last.current ?? { x: e.clientX, y: e.clientY };
        const r = board.current?.getBoundingClientRect();
        const step = r ? r.width / COLS / 5 : 8;
        const n = Math.max(1, Math.ceil(Math.hypot(e.clientX - from.x, e.clientY - from.y) / step));
        for (let k = 1; k <= n; k++) {
          const t = tileAt(from.x + ((e.clientX - from.x) * k) / n, from.y + ((e.clientY - from.y) * k) / n, true);
          if (t !== null) handlers.onMove(t);
        }
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => {
        if (!dragging.current) return;
        dragging.current = false;
        last.current = null;
        handlers.onUp();
      }}
      onPointerCancel={() => {
        if (!dragging.current) return;
        dragging.current = false;
        last.current = null;
        handlers.onUp();
      }}
    >
      <svg viewBox={`0 0 ${COLS * U} ${ROWS * U}`} className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={U * 0.3}>
          {puzzle.words.filter((w) => found.has(w.word)).map((w) => (
            <path key={w.word} d={linePath(w.path)} stroke={FOUND_STROKE} />
          ))}
          {sel.length > 1 && <path d={linePath(sel)} stroke="var(--color-sea)" />}
        </g>
      </svg>
      <div role="grid" aria-label={d.filWordsTitle} className="relative grid size-full grid-cols-6 grid-rows-8">
        {Array.from({ length: ROWS }, (_, r) => (
          <div role="row" key={r} className="contents">
            {puzzle.grid.slice(r * COLS, r * COLS + COLS).map((letter, k) => {
              const i = r * COLS + k;
              const own = owner.get(i);
              const isSel = selected.has(i);
              const shaking = shake?.tiles.includes(i);
              const tone = own ?? (isSel ? "bg-sea text-limestone-50" : "text-ink");
              const ring = hinted.has(i) ? "outline-[3px] outline-dashed outline-offset-[-3px] outline-ochre" : "";
              return (
                <button
                  key={shaking ? `${i}-${shake!.key}` : i}
                  type="button"
                  role="gridcell"
                  tabIndex={locked.has(i) ? -1 : 0}
                  aria-label={d.filTileAria(letter, r + 1, k + 1)}
                  aria-selected={isSel}
                  aria-disabled={locked.has(i) || undefined}
                  onClick={(e) => {
                    // Mouse and touch go through the pointer handlers; this is the keyboard's tap.
                    if (e.detail === 0) handlers.onKeyTap(i);
                  }}
                  className="flex items-center justify-center p-[10%] focus-visible:outline-none [&:focus-visible>span]:outline-[3px] [&:focus-visible>span]:outline-sea"
                >
                  <span
                    className={`flex size-full items-center justify-center rounded-full text-[clamp(1.05rem,5.4vw,1.5rem)] font-extrabold leading-none transition-colors duration-200 ${tone} ${ring} ${shaking ? "fil-shake" : ""}`}
                  >
                    {letter}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
