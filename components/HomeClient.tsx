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

export const primary =
  "btn-block inline-flex min-h-12 items-center justify-center gap-1.5 rounded-tile border-2 border-ink bg-sea px-2 text-limestone-50 hover:bg-sea-deep sm:px-4";

/** Kelma's two modes, side by side. How-to-play lives in each game's help, not on the home page. */
export function HomeButtons({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [done, setDone] = useState<Record<Mode, boolean>>({ normali: false, tqila: false });

  useEffect(() => {
    const day = dayIndex();
    setDone({ normali: isDoneToday("normali", day), tqila: isDoneToday("tqila", day) });
  }, []);

  const modeButton = (mode: Mode, label: string, area: string) => (
    <Link href={href(mode, lang)} className={`${primary} ${area}`}>
      <span className="display-caps text-[clamp(0.95rem,4.8vw,1.125rem)] leading-none">{label}</span>
      {done[mode] && (
        <>
          <TickIcon className="size-5 shrink-0" />
          <span className="sr-only">{` (${d.doneToday})`}</span>
        </>
      )}
    </Link>
  );

  return (
    <nav className="w-full">
      <div className="grid grid-cols-2 gap-3">
        {modeButton("normali", d.modeNormali, "")}
        {modeButton("tqila", d.modeTqila, "")}
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
