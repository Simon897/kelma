"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dayIndex } from "@/lib/day-index";
import { isDoneToday } from "@/lib/game-store";
import { t, type Lang } from "@/lib/i18n";
import type { Mode } from "@/lib/modes";
import { href } from "@/lib/routes";
import { KEYS, readJSON } from "@/lib/storage";
import { TickIcon } from "./Icons";

export const primary =
  "btn-block relative inline-flex min-h-12 items-center justify-center gap-1.5 rounded-tile border-2 border-ink bg-sea px-2 text-limestone-50 hover:bg-sea-deep sm:px-4";

/**
 * "Done today" on a play button: a tick badge on its corner, in the tiles' "correct" colour. It sits
 * outside the label, so a long name (DIFFIĊLI) never has to share the button's width with it.
 */
export function DoneBadge({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-tile-correct text-tile-correct-fg">
        <TickIcon className="size-3.5" />
      </span>
      <span className="sr-only">{` (${label})`}</span>
    </>
  );
}

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
      {done[mode] && <DoneBadge label={d.doneToday} />}
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

/** Returning visitors who chose the other language land on it. Never on a first visit. */
export function HomeLangRedirect({ lang }: { lang: Lang }) {
  const router = useRouter();
  useEffect(() => {
    const chosen = readJSON<Lang>(KEYS.lang);
    if (chosen && chosen !== lang && (chosen === "mt" || chosen === "en")) router.replace(href("home", chosen));
  }, [lang, router]);
  return null;
}
