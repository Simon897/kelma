"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { capitalise, type DictWord } from "@/lib/dizzjunarju";
import type { Dict } from "@/lib/i18n";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/** Drift speed: a 196px card passes in about 8s. */
const PX_PER_SECOND = 24;
/** After a swipe, the drift waits this long before picking up again (lets momentum finish). */
const RESUME_MS = 3000;

const PauseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <rect x="6" y="5" width="4" height="14" />
    <rect x="14" y="5" width="4" height="14" />
  </svg>
);
const PlayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M7 4.5v15l12-7.5Z" />
  </svg>
);

function Card({ word, eager, hidden }: { word: DictWord; eager: boolean; hidden?: boolean }) {
  return (
    <li className="flex w-[180px] shrink-0 flex-col gap-2 md:w-[300px]" aria-hidden={hidden || undefined} data-card>
      {/* the words beneath say what it is, so the drawing itself is decorative */}
      <img
        src={word.src}
        alt=""
        width={240}
        height={300}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="block h-[225px] w-[180px] select-none rounded-tile shadow-block-sm md:h-[375px] md:w-[300px]"
      />
      <span className="flex flex-col">
        <span lang="mt" className="text-lg font-bold leading-6 text-ink">
          {capitalise(word.mt)}
          {word.alts.map((a) => (
            <span key={a} className="font-normal">{` / ${a}`}</span>
          ))}
        </span>
        <span lang="en" className="text-sm leading-5 text-ink-soft">
          {capitalise(word.en)}
        </span>
      </span>
    </li>
  );
}

/**
 * A slow, endless drift of drawings, the Maltese word and the English under each. The list is
 * drawn twice so it can wrap without a jump; the second copy is hidden from screen readers.
 * It stops while a finger, the mouse or keyboard focus is on it, can be stopped for good with the
 * button, and doesn't start on its own for people who prefer reduced motion. `children` (the
 * category picker) shares the row with that button.
 */
export function WordCarousel({ words, label, d, children }: { words: DictWord[]; label: string; d: Dict; children?: ReactNode }) {
  const reduce = usePrefersReducedMotion();
  const [choice, setChoice] = useState<"moving" | "stopped" | null>(null);
  const moving = choice ? choice === "moving" : !reduce;
  const box = useRef<HTMLDivElement>(null);
  /** a finger, the mouse or keyboard focus is on the carousel */
  const held = useRef(false);
  const resumeAt = useRef(0);
  const release = (wait: number) => {
    held.current = false;
    resumeAt.current = performance.now() + wait;
  };

  // A new category starts from the beginning.
  useEffect(() => {
    if (box.current) box.current.scrollLeft = 0;
  }, [words]);

  useEffect(() => {
    const el = box.current;
    if (!moving || !el) return;
    // Our own position as a float: browsers round scrollLeft, which would stall a slow drift.
    let pos = el.scrollLeft;
    let last = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const cards = el.querySelectorAll<HTMLElement>("[data-card]");
      // one full copy of the list: where the second copy starts
      const loop = cards.length > words.length ? cards[words.length].offsetLeft - cards[0].offsetLeft : 0;
      if (held.current || now < resumeAt.current || loop <= 0) {
        pos = el.scrollLeft;
      } else {
        if (Math.abs(el.scrollLeft - pos) > 2) pos = el.scrollLeft; // moved by hand meanwhile
        pos += (PX_PER_SECOND * dt) / 1000;
        if (pos >= loop) pos -= loop;
        el.scrollLeft = pos;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [moving, words]);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 px-4">
        {children}
        <button
          type="button"
          onClick={() => setChoice(moving ? "stopped" : "moving")}
          aria-label={moving ? d.dictPause : d.dictPlay}
          title={moving ? d.dictPause : d.dictPlay}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-tile border-2 border-ink bg-limestone-50 text-ink shadow-block-sm hover:bg-limestone-200 active:translate-y-px"
        >
          {moving ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
        </button>
      </div>
      <div
        ref={box}
        role="region"
        aria-label={label}
        tabIndex={0}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") held.current = true;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") release(0);
        }}
        onPointerDown={() => {
          held.current = true;
        }}
        onPointerUp={(e) => {
          // the mouse is still over it (it carries on when the mouse leaves)
          if (e.pointerType !== "mouse") release(RESUME_MS);
        }}
        onPointerCancel={() => release(RESUME_MS)}
        onWheel={() => {
          resumeAt.current = performance.now() + RESUME_MS;
        }}
        onFocus={() => {
          held.current = true;
        }}
        onBlur={() => release(0)}
        className="relative mt-4 overflow-x-auto pb-3 [scrollbar-width:none] focus-visible:outline-offset-[-3px] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-max gap-4 px-4 md:gap-6">
          {words.map((w, i) => (
            <Card key={w.key} word={w} eager={i < 3} />
          ))}
          {words.map((w) => (
            <Card key={`${w.key}-again`} word={w} eager={false} hidden />
          ))}
        </ul>
      </div>
    </div>
  );
}
