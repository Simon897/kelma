"use client";

import { useEffect, useState } from "react";
import { dayIndex } from "@/lib/day-index";
import { t, type Lang } from "@/lib/i18n";
import { allAnswerWords } from "@/lib/modes";
import { pickWordOfDay, type WordOfDay as Entry } from "@/lib/word-of-day";

/**
 * Kelma ta' kuljum on the home page. The list (~100 KB) is loaded after mount as its own
 * chunk, so it never slows the buttons down; the date is read after mount like everywhere else.
 */
export function WordOfDay({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [entry, setEntry] = useState<Entry | null>(null);

  useEffect(() => {
    let live = true;
    import("@/data/kelma/word-of-day.json").then((mod) => {
      const list = (mod.default ?? mod) as Entry[];
      if (live) setEntry(pickWordOfDay(list, dayIndex(), allAnswerWords()));
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section aria-labelledby="wotd-title" className="mx-auto w-full max-w-[26rem] text-center">
      <h2 id="wotd-title" className="text-sm font-bold text-ink-soft">
        {d.wordOfDayTitle}
      </h2>
      {/* Space is reserved so nothing jumps when the word arrives. */}
      <div className="min-h-[3.75rem]" aria-live="polite">
        {entry && (
          <>
            <p lang="mt" className="mt-1.5 text-[1.75rem] font-bold leading-tight">
              {entry.word}
            </p>
            <p className="mt-1 text-balance text-base leading-snug">{entry.gloss}</p>
          </>
        )}
      </div>
    </section>
  );
}
