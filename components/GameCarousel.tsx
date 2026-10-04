"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { GAMES, defaultSlide, type GameKey } from "@/lib/carousel";
import { dayIndex, gherqDayIndex, sellumDayIndex } from "@/lib/day-index";
import { isDoneToday } from "@/lib/game-store";
import { coreWords, rootLabel } from "@/lib/gherq/game";
import { getGherqPuzzle } from "@/lib/gherq/puzzles";
import { gherqProgressToday } from "@/lib/gherq/store";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { isSellumDoneToday } from "@/lib/sellum/store";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";
import { MiniCarob } from "./gherq/Art";
import { HomeButtons, primary } from "./HomeClient";
import { TickIcon } from "./Icons";

const NAMES: Record<GameKey, string> = { gherq: "Għerq", kelma: "Kelma", sellum: "Sellum" };
type Progress = "none" | "partial" | "done";

/** Sellum's slide mark: three tiny rows of tiles, one letter changing each row, the last one green. */
function MiniLadder() {
  const rows = ["KELMA", "KALMA", "PALMA"];
  return (
    <div aria-hidden className="mx-auto grid gap-[3px]">
      {rows.map((w, r) => (
        <div key={w} className="flex justify-center gap-[3px]">
          {Array.from(w).map((l, i) => {
            const changed = r > 0 && l !== rows[r - 1][i];
            return (
              <span
                key={i}
                className={`flex size-[15px] items-center justify-center rounded-[2px] border text-[9px] font-bold leading-none ${
                  r === rows.length - 1 ? "border-tile-correct bg-tile-correct text-tile-correct-fg" : changed ? "border-ink bg-limestone-50 text-ink" : "border-ink-soft/60 bg-limestone-50 text-ink"
                }`}
              >
                {l}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Kelma's slide mark: two guesses scored against KELMA, then the solved row. */
function MiniBoard() {
  const answer = "KELMA";
  const rows = ["BAĦAR", "KALMA", "KELMA"];
  const fill = { correct: "border-tile-correct bg-tile-correct text-tile-correct-fg", present: "border-tile-present bg-tile-present text-tile-present-fg", absent: "border-tile-absent bg-tile-absent text-tile-absent-fg" };
  const score = (w: string) => Array.from(w).map((l, i) => (l === answer[i] ? "correct" : answer.includes(l) ? "present" : "absent") as keyof typeof fill);
  return (
    <div aria-hidden className="mx-auto grid gap-[3px]">
      {rows.map((w) => (
        <div key={w} className="flex justify-center gap-[3px]">
          {score(w).map((c, i) => (
            <span key={i} className={`flex size-[15px] items-center justify-center rounded-[2px] border text-[9px] font-bold leading-none ${fill[c]}`}>
              {Array.from(w)[i]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Each slide's picture sits in the same box, so taglines and buttons line up across slides. */
const Mark = ({ children }: { children: ReactNode }) => <div className="flex h-[51px] items-center justify-center">{children}</div>;

/** A half-filled mark: today's game started but not finished (Għerq with at least one star). */
const HalfMark = () => (
  <svg viewBox="0 0 16 16" className="size-4 text-ink" aria-hidden focusable="false">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M8 2a6 6 0 0 0 0 12Z" fill="currentColor" />
  </svg>
);

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square">
    <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

/**
 * One slide per game, Kelma in the middle. Discovery cues: neighbouring slides peek in on both
 * sides, labelled dots with done (and Għerq's started) marks, arrows on desktop, a counter and a
 * one-time nudge on the first visit. Native scroll-snap for swiping; no auto-rotation, ever.
 */
export function GameCarousel({ lang }: { lang: Lang }) {
  const d = t(lang);
  const track = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(1);
  const [progress, setProgress] = useState<Record<GameKey, Progress>>({ gherq: "none", kelma: "none", sellum: "none" });
  const [gherqPreview, setGherqPreview] = useState<string | null>(null);
  const reduced = useRef(true);

  const go = useCallback((i: number, instant = false) => {
    const el = track.current;
    const slide = slides.current[i];
    if (!el || !slide) return;
    el.scrollTo({ left: slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2, behavior: instant || reduced.current ? "auto" : "smooth" });
  }, []);

  // After mount: today's progress, the default slide, Għerq's preview and the first-visit nudge.
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const kDay = dayIndex();
    const gDay = gherqDayIndex();
    const gPuzzle = getGherqPuzzle(gDay);
    const state: Record<GameKey, Progress> = {
      gherq: gherqProgressToday(gDay, gPuzzle ? coreWords(gPuzzle).map((w) => w.word) : null),
      kelma: isDoneToday("normali", kDay) && isDoneToday("tqila", kDay) ? "done" : "none",
      sellum: isSellumDoneToday(sellumDayIndex()) ? "done" : "none",
    };
    setProgress(state);
    // Today's root is previewed only once the player has been to Għerq.
    if (gPuzzle && readJSON<boolean>(KEYS.gherqVisited)) setGherqPreview(rootLabel(gPuzzle.root));
    const start = defaultSlide(GAMES.map((g) => state[g] === "done"));
    setActive(start);
    // Layout already exists here, so scroll now; the frame callback is a backup for late layout
    // (and browsers skip animation frames in hidden tabs, so it can't be the only call).
    go(start, true);
    requestAnimationFrame(() => go(start, true));

    if (!readJSON<boolean>(KEYS.seenCarousel)) {
      writeJSON(KEYS.seenCarousel, true);
      if (!reduced.current && start < GAMES.length - 1) {
        const id = window.setTimeout(() => {
          rail.current?.animate(
            [{ transform: "translateX(0)" }, { transform: "translateX(-40px)" }, { transform: "translateX(0)" }],
            { duration: 700, easing: "cubic-bezier(0.45, 0, 0.2, 1)" },
          );
        }, 1500);
        return () => window.clearTimeout(id);
      }
    }
  }, [go]);

  // Which slide is showing: the one whose centre is nearest the viewport's centre.
  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.current.forEach((s, i) => {
      if (!s) return;
      const dist = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const next = e.key === "ArrowLeft" ? active - 1 : active + 1;
    if (next < 0 || next >= GAMES.length) return;
    e.preventDefault();
    setActive(next);
    go(next);
  };

  const doneTick = (g: GameKey) =>
    progress[g] === "done" && (
      <>
        <TickIcon className="size-5 shrink-0" />
        <span className="sr-only">{` (${d.doneToday})`}</span>
      </>
    );

  const content: Record<GameKey, ReactNode> = {
    gherq: (
      <>
        <Mark>
          <MiniCarob className="h-[48px] w-auto" />
        </Mark>
        <p className="mt-1 text-balance text-base font-medium leading-snug">{d.gherqTagline}</p>
        {gherqPreview && <p className="mt-1 text-sm font-bold">{d.gherqTodayRoot(gherqPreview)}</p>}
        <div className="mt-auto pt-3">
          <Link href={href("gherq", lang)} className={`${primary} w-full`}>
            <span className="display-caps text-[clamp(0.95rem,4.8vw,1.125rem)] leading-none">{d.sellumPlay}</span>
            {doneTick("gherq")}
          </Link>
        </div>
      </>
    ),
    kelma: (
      <>
        <Mark>
          <MiniBoard />
        </Mark>
        <p className="mt-1 text-balance text-base font-medium leading-snug">{d.tagline}</p>
        <div className="mt-auto flex w-full justify-center pt-3">
          <HomeButtons lang={lang} />
        </div>
      </>
    ),
    sellum: (
      <>
        <Mark>
          <MiniLadder />
        </Mark>
        <p className="mt-1 text-balance text-base font-medium leading-snug">{d.sellumTagline}</p>
        <div className="mt-auto pt-3">
          <Link href={href("sellum", lang)} className={`${primary} w-full`}>
            <span className="display-caps text-[clamp(0.95rem,4.8vw,1.125rem)] leading-none">{d.sellumPlay}</span>
            {doneTick("sellum")}
          </Link>
        </div>
      </>
    ),
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={d.carouselLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative w-full max-w-[64rem] outline-offset-4"
    >
      <div className="relative">
        {/* Arrows: desktop only, hidden at each end (no wrap-around). */}
        {active > 0 && (
          <button
            type="button"
            aria-label={d.prevGame}
            onClick={() => go(active - 1)}
            className="btn-block absolute left-3 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-tile border-2 border-ink bg-limestone-50 text-ink hover:bg-limestone-200 md:inline-flex"
          >
            <Chevron dir="left" />
          </button>
        )}
        {active < GAMES.length - 1 && (
          <button
            type="button"
            aria-label={d.nextGame}
            onClick={() => go(active + 1)}
            className="btn-block absolute right-3 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-tile border-2 border-ink bg-limestone-50 text-ink hover:bg-limestone-200 md:inline-flex"
          >
            <Chevron dir="right" />
          </button>
        )}
        <div
          ref={track}
          onScroll={onScroll}
          className="snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Centred slides, so both neighbours peek in at the sides. */}
          <div ref={rail} className="flex w-max gap-3 px-[calc(50vw-min(38vw,10.5rem))] py-2 md:px-[calc(50vw-13rem)] min-[1024px]:px-[calc(32rem-13rem)]">
            {GAMES.map((g, i) => (
              <div
                key={g}
                ref={(el) => {
                  slides.current[i] = el;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={d.gameOf(i + 1, GAMES.length, NAMES[g])}
                className="stone relative flex w-[min(76vw,21rem)] shrink-0 snap-center flex-col rounded-tile border-2 border-ink/25 bg-limestone-50/60 px-3 pb-4 pt-3 sm:px-4 md:w-[26rem]"
              >
                <h2 className="display-caps mb-1.5 text-center text-lg leading-none text-ink">{NAMES[g]}</h2>
                {content[g]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Labelled dots (names visible on desktop), done and started marks, and a counter. */}
      <div className="mt-1 flex items-center justify-center gap-1">
        {GAMES.map((g, i) => (
          <button
            key={g}
            type="button"
            onClick={() => go(i)}
            aria-label={`${NAMES[g]}${progress[g] === "done" ? `, ${d.doneToday}` : progress[g] === "partial" ? `, ${d.startedToday}` : ""}`}
            aria-current={i === active ? "true" : undefined}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-tile px-2 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            <span aria-hidden className={`size-3 rounded-full border-2 ${i === active ? "border-sea bg-sea" : "border-ink-soft bg-transparent"}`} />
            <span aria-hidden className={`hidden md:inline ${i === active ? "text-ink" : ""}`}>
              {NAMES[g]}
            </span>
            {progress[g] === "done" && <TickIcon className="size-4 text-ink" />}
            {progress[g] === "partial" && <HalfMark />}
          </button>
        ))}
        <span aria-hidden className="ml-2 text-xs tabular-nums text-ink-soft">{`${active + 1} / ${GAMES.length}`}</span>
      </div>
    </section>
  );
}
