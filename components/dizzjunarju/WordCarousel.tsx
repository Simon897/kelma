"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { capitalise, type DictWord } from "@/lib/dizzjunarju";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/** Drift speed: a 196px card passes in about 8s. */
const PX_PER_SECOND = 24;
/** After a swipe, the drift waits this long before picking up again (lets momentum finish). */
const RESUME_MS = 3000;
/** A mouse drag let go carries on and slows like a swipe: its speed falls by e every this many ms. */
const GLIDE_MS = 200;
/** The fastest a let-go drag carries on (px/ms), so even a hard flick glides only about a card. */
const GLIDE_MAX_SPEED = 2;

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

/** The width of one full copy of the list: where the second copy starts (0 before layout). */
function loopWidth(el: HTMLElement, count: number) {
  const cards = el.querySelectorAll<HTMLElement>("[data-card]");
  return cards.length > count ? cards[count].offsetLeft - cards[0].offsetLeft : 0;
}

/** Scroll to `to`, wrapped into the first copy of the list so either way goes on for ever. */
function scrollWrapped(el: HTMLElement, count: number, to: number) {
  const loop = loopWidth(el, count);
  el.scrollLeft = loop > 0 ? ((to % loop) + loop) % loop : to;
}

/**
 * A slow, endless drift of drawings, the Maltese word and the English under each. The list is
 * drawn twice so it can wrap without a jump; the second copy is hidden from screen readers.
 * It stops while a finger, the mouse or keyboard focus is on it, and doesn't start on its own for
 * people who prefer reduced motion. With a mouse it can be dragged like a touch screen swipe, and
 * the drag wraps round too. `children` (the category picker) sits above it.
 */
export function WordCarousel({ words, label, children }: { words: DictWord[]; label: string; children?: ReactNode }) {
  const moving = !usePrefersReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  /** a finger, the mouse or keyboard focus is on the carousel */
  const held = useRef(false);
  const resumeAt = useRef(0);
  /** a mouse drag in progress: where it started, the scroll position then, and its latest speed (px/ms) */
  const drag = useRef<{ x: number; scroll: number; lastX: number; lastT: number; v: number } | null>(null);
  /** the glide after a drag is let go (its animation frame), which the drift waits for */
  const glide = useRef(0);
  const stopGlide = () => {
    cancelAnimationFrame(glide.current);
    glide.current = 0;
  };
  useEffect(() => stopGlide, []);
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
      const loop = loopWidth(el, words.length);
      if (held.current || glide.current || now < resumeAt.current || loop <= 0) {
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
      <div className="px-4">{children}</div>
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
        onPointerDown={(e) => {
          held.current = true;
          if (e.pointerType !== "mouse" || e.button !== 0) return;
          stopGlide();
          e.currentTarget.setPointerCapture(e.pointerId);
          const now = performance.now();
          drag.current = { x: e.clientX, scroll: e.currentTarget.scrollLeft, lastX: e.clientX, lastT: now, v: 0 };
        }}
        onMouseDown={(e) => {
          if (e.button === 0) e.preventDefault(); // a drag, not a text selection
        }}
        onPointerMove={(e) => {
          const g = drag.current;
          if (!g) return;
          const now = performance.now();
          if (now > g.lastT) {
            // smoothed, so one jittery event doesn't decide the throw
            g.v = 0.8 * ((g.lastX - e.clientX) / (now - g.lastT)) + 0.2 * g.v;
            g.lastX = e.clientX;
            g.lastT = now;
          }
          scrollWrapped(e.currentTarget, words.length, g.scroll - (e.clientX - g.x));
        }}
        onPointerUp={(e) => {
          const g = drag.current;
          drag.current = null;
          // let go mid-movement (not after holding still): carry on that way, slowing to a stop
          if (g && performance.now() - g.lastT < 80 && Math.abs(g.v) > 0.05) {
            const el = e.currentTarget;
            let v = Math.max(-GLIDE_MAX_SPEED, Math.min(GLIDE_MAX_SPEED, g.v));
            let pos = el.scrollLeft;
            let last = performance.now();
            const step = (now: number) => {
              const dt = Math.min(now - last, 50);
              last = now;
              pos += v * dt;
              v *= Math.exp(-dt / GLIDE_MS);
              scrollWrapped(el, words.length, pos);
              pos = el.scrollLeft;
              glide.current = Math.abs(v) > 0.01 ? requestAnimationFrame(step) : 0;
            };
            glide.current = requestAnimationFrame(step);
          }
          // the mouse is still over it (it carries on when the mouse leaves)
          if (e.pointerType !== "mouse") release(RESUME_MS);
        }}
        onPointerCancel={() => {
          drag.current = null;
          release(RESUME_MS);
        }}
        onWheel={() => {
          resumeAt.current = performance.now() + RESUME_MS;
        }}
        onFocus={() => {
          held.current = true;
        }}
        onBlur={() => release(0)}
        className="relative mt-4 cursor-grab overflow-x-auto pb-3 [scrollbar-width:none] focus-visible:outline-offset-[-3px] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
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
