"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dayIndex, formatMaltaDate } from "@/lib/day-index";
import { isDoneToday } from "@/lib/game-store";
import { t, type Lang } from "@/lib/i18n";
import type { Mode } from "@/lib/modes";
import { href } from "@/lib/routes";
import { KEYS, readJSON } from "@/lib/storage";
import { TickIcon } from "./Icons";

const primary =
  "btn-block inline-flex min-h-12 items-center justify-center gap-1.5 rounded-tile border-2 border-ink bg-sea px-4 text-limestone-50 hover:bg-sea-deep";
const secondary =
  "btn-block inline-flex min-h-12 items-center justify-center rounded-tile border-2 border-ink bg-limestone-50 px-3 font-bold text-ink hover:bg-limestone-200";

/**
 * The three buttons. Normali and Tqila are primary; Kif taħdem? is secondary.
 * One row when they fit (measured: ~31rem including done ticks); otherwise Normali + Tqila on top, Kif taħdem? below.
 */
export function HomeButtons({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [done, setDone] = useState<Record<Mode, boolean>>({ normali: false, tqila: false });

  useEffect(() => {
    const day = dayIndex();
    setDone({ normali: isDoneToday("normali", day), tqila: isDoneToday("tqila", day) });
  }, []);

  const modeButton = (mode: Mode, label: string, area: string) => (
    <Link href={href(mode, lang)} className={`${primary} ${area}`}>
      <span className="display-caps text-lg leading-none">{label}</span>
      {done[mode] && (
        <>
          <TickIcon className="size-5 shrink-0" />
          <span className="sr-only">{` (${d.doneToday})`}</span>
        </>
      )}
    </Link>
  );

  return (
    <nav className="@container w-full max-w-[34rem]">
      <div className="grid grid-cols-2 gap-3 [grid-template-areas:'n_t'_'h_h'] @[31rem]:grid-cols-[1fr_auto_1fr] @[31rem]:[grid-template-areas:'n_h_t']">
        {modeButton("normali", d.modeNormali, "[grid-area:n]")}
        <Link href={href("how", lang)} className={`${secondary} [grid-area:h]`}>
          {d.howLink}
        </Link>
        {modeButton("tqila", d.modeTqila, "[grid-area:t]")}
      </div>
    </nav>
  );
}

/** Today's date in Malta, in the page's language. Rendered after mount; space is reserved. */
export function HomeDate({ lang }: { lang: Lang }) {
  const [text, setText] = useState("");
  useEffect(() => setText(formatMaltaDate(lang)), [lang]);
  return (
    <p className="min-h-6 text-base font-semibold text-ink-soft" suppressHydrationWarning>
      {text}
    </p>
  );
}

/** Returning visitors who chose the other language land on it. Never on a first visit. */
export function HomeLangRedirect({ lang }: { lang: Lang }) {
  const router = useRouter();
  useEffect(() => {
    const chosen = readJSON<Lang>(KEYS.lang);
    if (chosen && chosen !== lang && (chosen === "mt" || chosen === "en")) router.replace(href("home", chosen));
  }, [lang, router]);
  return null;
}
