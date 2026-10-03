"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { GAMES, defaultSlide, isNewGame, type GameKey } from "@/lib/carousel";
import { dayIndex, sellumDayIndex } from "@/lib/day-index";
import { isDoneToday } from "@/lib/game-store";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { isSellumDoneToday } from "@/lib/sellum/store";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";
import { HomeButtons, primary, secondary } from "./HomeClient";
import { TickIcon } from "./Icons";

const NAMES: Record<GameKey, string> = { kelma: "Kelma", sellum: "Sellum" };

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

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square">
    <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

/**
 * One slide per game. Discovery cues: the next slide peeks in (both neighbours on desktop),
 * labelled dots with done ticks, arrows on desktop, a counter, a one-time nudge on the first
 * visit, and a "Ġdid!" badge for a new game's first 14 days. Native scroll-snap for swiping;
 * no auto-rotation, ever.
 */
export function GameCarousel({ lang }: { lang: Lang }) {
  const d = t(lang);
  const track = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<Record<GameKey, boolean>>({ kelma: false, sellum: false });
  const [sellumNew, setSellumNew] = useState(false);
  const reduced = useRef(true);

  const go = useCallback((i: number, instant = false) => {
    const el = track.current;
    const slide = slides.current[i];
    if (!el || !slide) return;
    const centred = window.matchMedia("(min-width: 768px)").matches;
    const left = centred ? slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2 : slide.offsetLeft - 16;
    el.scrollTo({ left, behavior: instant || reduced.current ? "auto" : "smooth" });
  }, []);

  // After mount: today's progress, the default slide, the badge, and the first-visit nudge.
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const kDay = dayIndex();
    const sDay = sellumDayIndex();
    const state = {
      kelma: isDoneToday("normali", kDay) && isDoneToday("tqila", kDay),
      sellum: isSellumDoneToday(sDay),
    };
    setDone(state);
    setSellumNew(isNewGame(sDay));
    const start = defaultSlide(GAMES.map((g) => state[g]));
    setActive(start);
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

  const badge = (
    <span className="rounded-tile bg-ochre px-1.5 py-0.5 font-sans text-xs font-bold normal-case leading-4 tracking-normal text-ink [font-stretch:100%] [font-variation-settings:normal]">{d.newBadge}</span>
  );

  const content: Record<GameKey, ReactNode> = {
    kelma: (
      <>
        <p className="text-balance text-base font-medium leading-snug">{d.tagline}</p>
        <div className="mt-3 flex w-full justify-center">
          <HomeButtons lang={lang} />
        </div>
      </>
    ),
    sellum: (
      <>
        <MiniLadder />
        <p className="mt-1 text-balance text-base font-medium leading-snug">{d.sellumTagline}</p>
        <div className="mt-3 grid w-full grid-cols-2 gap-3">
          <Link href={href("sellum", lang)} className={primary}>
            <span className="display-caps text-[clamp(0.95rem,4.8vw,1.125rem)] leading-none">{d.sellumPlay}</span>
            {done.sellum && (
              <>
                <TickIcon className="size-5 shrink-0" />
                <span className="sr-only">{` (${d.doneToday})`}</span>
              </>
            )}
          </Link>
          <Link href={href("sellumHow", lang)} className={secondary}>
            {d.howLink}
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
          className="snap-x snap-mandatory scroll-px-4 overflow-x-auto overscroll-x-contain md:scroll-px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div ref={rail} className="flex w-max gap-3 px-4 py-2 md:px-[calc(50vw-13rem)] min-[1024px]:px-[calc(32rem-13rem)]">
            {GAMES.map((g, i) => (
              <div
                key={g}
                ref={(el) => {
                  slides.current[i] = el;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={d.gameOf(i + 1, GAMES.length, NAMES[g])}
                className="stone relative flex w-[min(80vw,21rem)] shrink-0 snap-start flex-col rounded-tile border-2 border-ink/25 bg-limestone-50/60 px-3 pb-4 pt-3 sm:px-4 md:w-[26rem] md:snap-center"
              >
                <h2 className="display-caps mb-1.5 flex items-center justify-center gap-2 text-lg leading-none text-ink">
                  {NAMES[g]}
                  {g === "sellum" && sellumNew && badge}
                </h2>
                {content[g]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Labelled dots (names visible on desktop), done ticks, and a counter. */}
      <div className="mt-1 flex items-center justify-center gap-1">
        {GAMES.map((g, i) => (
          <button
            key={g}
            type="button"
            onClick={() => go(i)}
            aria-label={`${NAMES[g]}${done[g] ? `, ${d.doneToday}` : ""}${g === "sellum" && sellumNew ? `, ${d.newBadge}` : ""}`}
            aria-current={i === active ? "true" : undefined}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-tile px-2 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            <span
              aria-hidden
              className={`size-3 rounded-full border-2 ${i === active ? "border-sea bg-sea" : "border-ink-soft bg-transparent"}`}
            />
            <span aria-hidden className={`hidden md:inline ${i === active ? "text-ink" : ""}`}>
              {NAMES[g]}
            </span>
            {done[g] && <TickIcon className="size-4 text-ink" />}
            {g === "sellum" && sellumNew && (
              <span aria-hidden className="size-2 rounded-full bg-ochre md:hidden" />
            )}
          </button>
        ))}
        <span aria-hidden className="ml-2 text-xs tabular-nums text-ink-soft">{`${active + 1} / ${GAMES.length}`}</span>
      </div>
    </section>
  );
}
