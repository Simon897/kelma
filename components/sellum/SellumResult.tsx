"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import type { SellumState } from "@/lib/sellum/game";
import { displaySellumStreak, type SellumStats } from "@/lib/sellum/stats";
import type { SellumPuzzle } from "@/lib/sellum/validate";
import { GABRA_URL } from "@/lib/site";
import { Countdown } from "../Countdown";
import { ArrowIcon } from "../Icons";

type Gloss = string | { lemma: string; gloss: string };

/** The glosses (~450 KB) load only once the panel is shown, as their own chunk. */
function useGlosses(enabled: boolean) {
  const [map, setMap] = useState<Record<string, Gloss> | null>(null);
  useEffect(() => {
    if (!enabled || map) return;
    let live = true;
    import("@/data/sellum/glosses.json").then((m) => live && setMap((m.default ?? m) as Record<string, Gloss>));
    return () => {
      live = false;
    };
  }, [enabled, map]);
  return map;
}

function WordList({ words, glosses, d }: { words: string[]; glosses: Record<string, Gloss> | null; d: ReturnType<typeof t> }) {
  return (
    <ol className="space-y-1.5">
      {words.map((w, i) => {
        const g = glosses?.[w];
        const text = !g ? "" : typeof g === "string" ? g : `${d.formOf(g.lemma)}: ${g.gloss}`;
        return (
          <li key={`${w}-${i}`} className="grid grid-cols-[4.6rem_1fr] items-baseline gap-2">
            <span lang="mt" className="font-bold tracking-wide">
              {w}
            </span>
            <span className="text-sm leading-snug text-ink-soft">{text}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function SellumResult({
  lang,
  puzzle,
  state,
  ladder,
  altRoute,
  stats,
  day,
  finished,
  newDay,
  onElapsed,
  shareButton,
}: {
  lang: Lang;
  puzzle: SellumPuzzle;
  state: SellumState;
  ladder: string[];
  altRoute: string[] | null;
  stats: SellumStats;
  day: number;
  finished: boolean;
  newDay: boolean;
  onElapsed: () => void;
  shareButton: ReactNode;
}) {
  const d = t(lang);
  const glosses = useGlosses(finished);
  const won = state.status === "won";
  const winPct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const maxBucket = Math.max(1, ...stats.lives);
  const bucketLabels = ["3", "2", "1", d.livesLost];

  return (
    <div className="space-y-5">
      {finished && (
        <section className="stone rounded-tile border-2 border-ink bg-limestone-100 px-4 py-3 shadow-block-sm">
          {won ? (
            <h3 className="mb-2 text-sm font-bold text-ink-soft">{d.yourLadder}</h3>
          ) : (
            <h3 className="sr-only">{d.sellumLost}</h3>
          )}
          <WordList words={won ? ladder : puzzle.example} glosses={glosses} d={d} />
          <p className="mt-3 border-t border-limestone-300 pt-2 font-bold">{d.routesCount(puzzle.routes)}</p>
          {won && altRoute && (
            <div className="mt-2">
              <h3 className="mb-1.5 text-sm font-bold text-ink-soft">{d.otherRoute}</h3>
              <WordList words={altRoute} glosses={glosses} d={d} />
            </div>
          )}
          <p className="mt-3 border-t border-limestone-300 pt-2 text-xs text-ink-soft">
            {`${d.meaningFrom} `}
            <a href={GABRA_URL} target="_blank" rel="noopener" className="font-semibold text-ink underline underline-offset-2">
              {d.credit}
            </a>
            {" · CC BY 4.0"}
          </p>
        </section>
      )}

      <div>
        {finished && <h3 className="mb-2 text-sm font-bold">{d.statsFor("Sellum")}</h3>}
        {stats.played === 0 ? (
          <div className="rounded-tile border-2 border-dashed border-limestone-400 px-4 py-5 text-center">
            <p className="font-bold">{d.emptyStats}</p>
            <p className="mt-1 text-sm text-ink-soft">{d.emptyStatsBody}</p>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-4 gap-2 text-center">
              {(
                [
                  [d.played, stats.played],
                  [d.winPct, winPct],
                  [d.streak, displaySellumStreak(stats, day)],
                  [d.maxStreak, stats.maxStreak],
                ] as [string, number][]
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse justify-end">
                  <dt className="text-xs leading-tight text-ink-soft">{label}</dt>
                  <dd className="text-3xl font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <h4 className="mb-2 mt-5 text-sm font-bold">{d.livesDist}</h4>
            <ol className="space-y-1">
              {stats.lives.map((n, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-10 font-bold">{bucketLabels[i]}</span>
                  <span className="flex-1">
                    <span
                      className={`flex h-6 min-w-7 items-center justify-end rounded-tile px-2 font-bold tabular-nums ${
                        i < 3 ? "bg-tile-correct text-tile-correct-fg" : "bg-tile-absent text-tile-absent-fg"
                      }`}
                      style={{ width: `${Math.max(8, (n / maxBucket) * 100)}%` }}
                    >
                      {n}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {finished && (
        <>
          <div className="flex items-center justify-between gap-3 border-t-2 border-limestone-300 pt-4">
            <div>
              <p className="text-xs font-semibold text-ink-soft">{newDay ? d.newWordReady : d.nextWordIn}</p>
              {newDay ? (
                <button type="button" onClick={() => window.location.reload()} className="mt-1 font-bold text-sea-deep underline underline-offset-2">
                  {d.playNew}
                </button>
              ) : (
                <Countdown onElapsed={onElapsed} className="text-2xl font-bold" />
              )}
            </div>
            {shareButton}
          </div>
          <Link href={href("home", lang)} className="flex min-h-11 items-center justify-between rounded-tile border-2 border-ink px-4 py-2 font-bold hover:bg-limestone-200">
            {d.playKelma}
            <ArrowIcon className="size-5" />
          </Link>
        </>
      )}
    </div>
  );
}
