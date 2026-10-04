"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { averageStars, byLengthThenAlpha, displayGherqStreak, isBonus, type GherqPuzzle, type GherqStats, type GherqWord } from "@/lib/gherq/game";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { GABRA_URL } from "@/lib/site";
import { Countdown } from "../Countdown";
import { ArrowIcon } from "../Icons";
import { PointsBadge, RootTiles, Stars } from "./Parts";

const POS_ORDER = ["VERB", "NOUN", "ADJ"];

export function GherqResult({
  lang,
  puzzle,
  found,
  stars,
  earned,
  total,
  bonus = 0,
  stats,
  day,
  finished,
  newDay,
  onElapsed,
  onGiveUp,
  shareButton,
}: {
  lang: Lang;
  puzzle: GherqPuzzle;
  found: ReadonlySet<string>;
  stars: number;
  earned: number;
  total: number;
  /** Points from bonus words found, shown on top of the total. */
  bonus?: number;
  stats: GherqStats;
  day: number;
  finished: boolean;
  newDay: boolean;
  onElapsed: () => void;
  onGiveUp: () => void;
  shareButton: ReactNode;
}) {
  const d = t(lang);
  const [confirm, setConfirm] = useState(false);
  const posLabel: Record<string, string> = { VERB: d.posVerb, NOUN: d.posNoun, ADJ: d.posAdj };
  const sorted = (ws: GherqWord[]) => [...ws].sort((a, b) => byLengthThenAlpha(a.word, b.word));
  const groups = [
    ...POS_ORDER.map((pos) => ({ key: pos, title: posLabel[pos], bonus: false, words: sorted(puzzle.words.filter((w) => w.pos === pos && !isBonus(w))) })),
    // Bonus words last: never "missed", since no star needs them.
    { key: "bonus", title: d.bonusTitle, bonus: true, words: sorted(puzzle.words.filter(isBonus)) },
  ].filter((g) => g.words.length);
  const maxBucket = Math.max(1, ...stats.stars);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Stars stars={stars} d={d} />
        <p className="text-sm font-semibold">
          {d.pointsOf(earned, total)}
          {bonus > 0 && <span className="ml-1 text-star">{d.bonusPointsOf(bonus)}</span>}
        </p>
      </div>

      {finished && (
        <section className="stone rounded-tile border-2 border-ink bg-limestone-100 px-4 py-3 shadow-block-sm">
          <RootTiles root={puzzle.root} size="sm" />
          {groups.map((g) => (
            <div key={g.key} className="mt-3">
              <h3 className="mb-1 text-sm font-bold text-ink-soft">{g.title}</h3>
              <ul className="space-y-1.5">
                {g.words.map((w) => {
                  const got = found.has(w.word);
                  const missed = !got && !g.bonus;
                  return (
                    <li key={w.word} className={`flex items-start justify-between gap-2 ${got ? "" : "text-ink-soft"}`}>
                      <span className="min-w-0">
                        <span lang="mt" className={`font-bold tracking-wide ${got ? "text-ink" : missed ? "text-ink-soft line-through decoration-1" : "text-ink-soft"}`}>
                          {w.word}
                        </span>
                        {missed && <span className="ml-1.5 rounded-tile border border-ink-soft px-1 text-xs font-semibold">{d.missed}</span>}
                        <span className="block text-sm leading-snug">{w.gloss}</span>
                      </span>
                      <PointsBadge points={w.points} d={d} muted={!got} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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
        <h3 className="mb-2 text-sm font-bold">{d.statsFor("Għerq")}</h3>
        {stats.played === 0 ? (
          <div className="rounded-tile border-2 border-dashed border-limestone-400 px-4 py-5 text-center">
            <p className="font-bold">{d.emptyStats}</p>
            <p className="mt-1 text-sm text-ink-soft">{d.gherqEmptyStatsBody}</p>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-4 gap-2 text-center">
              {(
                [
                  [d.played, String(stats.played)],
                  [d.streak, String(displayGherqStreak(stats, day))],
                  [d.maxStreak, String(stats.maxStreak)],
                  [d.avgStars, averageStars(stats).toFixed(1)],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse justify-end">
                  <dt className="text-xs leading-tight text-ink-soft">{label}</dt>
                  <dd className="text-3xl font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <h4 className="mb-2 mt-5 text-sm font-bold">{d.starsDist}</h4>
            <ol className="space-y-1">
              {stats.stars.map((n, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-12 font-bold" aria-label={d.starsOf(i + 1)}>
                    <span aria-hidden>{"★".repeat(i + 1)}</span>
                  </span>
                  <span className="flex-1">
                    <span
                      className="flex h-6 min-w-7 items-center justify-end rounded-tile bg-tile-absent px-2 font-bold tabular-nums text-tile-absent-fg"
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

      {finished ? (
        <>
          <div className="flex items-center justify-between gap-3 border-t-2 border-limestone-300 pt-4">
            <div>
              <p className="text-xs font-semibold text-ink-soft">{newDay ? d.gherqNewRootReady : d.nextRootIn}</p>
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
          <div className="grid gap-2">
            <Link href={href("normali", lang)} className="flex min-h-11 items-center justify-between rounded-tile border-2 border-ink px-4 py-2 font-bold hover:bg-limestone-200">
              {d.playKelma}
              <ArrowIcon className="size-5" />
            </Link>
            <Link href={href("sellum", lang)} className="flex min-h-11 items-center justify-between rounded-tile border-2 border-ink px-4 py-2 font-bold hover:bg-limestone-200">
              {d.playSellum}
              <ArrowIcon className="size-5" />
            </Link>
          </div>
        </>
      ) : (
        <div className="border-t-2 border-limestone-300 pt-4">
          {confirm ? (
            <div className="space-y-3">
              <p className="text-sm">{d.giveUpConfirm}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onGiveUp} className="btn-block inline-flex min-h-11 items-center rounded-tile border-2 border-ink bg-ink px-4 font-bold text-limestone-50">
                  {d.giveUpYes}
                </button>
                <button type="button" onClick={() => setConfirm(false)} className="inline-flex min-h-11 items-center rounded-tile border-2 border-ink px-4 font-bold hover:bg-limestone-200">
                  {d.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="inline-flex min-h-11 items-center rounded-tile border-2 border-ink px-4 font-bold hover:bg-limestone-200">
              {d.giveUp}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
