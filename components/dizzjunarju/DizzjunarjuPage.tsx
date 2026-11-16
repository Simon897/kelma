"use client";

import Link from "next/link";
import { preload } from "react-dom";
import { plexSerif } from "@/lib/fonts-serif";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { GABRA_URL } from "@/lib/site";
import { CatLogo } from "../CatLogo";
import { ArrowIcon } from "../Icons";
import { LangToggle } from "../LangToggle";
import { COVER_ART, DictionaryBook } from "./DictionaryBook";

/**
 * Dizzjunarju: the whole word list as a book you can leaf through and search.
 *
 * The page used to show Maltese words for everyday things, one carousel per category (herbs,
 * fruit, the house, animals, fish). That content is kept, just not shown: the lists are in
 * data/words/, the drawings in public/{hwawar,frott-u-haxix,id-dar,annimali,hut}/, the code in
 * lib/dizzjunarju.ts and ./WordCarousel.tsx, and the strings are dictIntro, dictCategory,
 * dictCarousel and dictSourceBody. To bring it back, render a <WordCarousel> per CATEGORY_KEYS
 * entry, as this file did before the book (see its git history).
 */
export function DizzjunarjuPage({ lang }: { lang: Lang }) {
  const d = t(lang);
  // The closed cover is the first thing on the page: fetch its art straight away.
  preload(COVER_ART, { as: "image" });

  return (
    <div className={`min-h-svh ${plexSerif.variable}`}>
      {/* Under 900px the book shows one page at a time (DictionaryBook's SINGLE_BELOW): the header is
          shorter and the title is for screen readers only, so the book fits the screen without scrolling. */}
      <header className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-4 min-[900px]:h-16">
        <Link href={href("home", lang)} aria-label={d.homeAria} className="inline-flex min-h-11 items-center gap-2">
          <CatLogo className="size-10" />
          <span className="display-caps logo-caps text-xl">Kelma</span>
        </Link>
        <LangToggle lang={lang} page="dizzjunarju" />
      </header>

      <main className="mx-auto max-w-[1320px] pb-10 pt-1 min-[900px]:pt-4">
        <div className="flex flex-col items-center px-4 text-center min-[900px]:pb-5">
          <h1 lang="mt" className="display-caps text-4xl max-[899px]:sr-only">
            {d.dictTitle}
          </h1>
          <p className="mt-2 font-medium text-ink-soft max-[899px]:hidden">{d.dictSubtitle}</p>
        </div>

        <DictionaryBook d={d} />

        <footer className="mt-6 flex flex-col items-center px-4 text-center text-sm leading-relaxed text-ink-soft">
          <p className="max-w-[60ch]">{d.dictCredit}</p>
          <a href={GABRA_URL} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 font-bold text-sea-deep underline underline-offset-2">
            {d.howSourceLink}
            <ArrowIcon className="size-4" />
          </a>
        </footer>
      </main>
    </div>
  );
}
