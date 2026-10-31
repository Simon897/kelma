"use client";

import Link from "next/link";
import { CATEGORY_KEYS, categoryWords } from "@/lib/dizzjunarju";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { GABRA_URL } from "@/lib/site";
import { CatLogo } from "../CatLogo";
import { ArrowIcon } from "../Icons";
import { LangToggle } from "../LangToggle";
import { WordCarousel } from "./WordCarousel";

/** Dizzjunarju: Maltese words for everyday things, one row per category. */
export function DizzjunarjuPage({ lang }: { lang: Lang }) {
  const d = t(lang);

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex h-16 max-w-[60rem] items-center justify-between px-4">
        <Link href={href("home", lang)} aria-label={d.homeAria} className="inline-flex min-h-11 items-center gap-2">
          <CatLogo className="size-10" />
          <span className="display-caps text-xl">Kelma</span>
        </Link>
        <LangToggle lang={lang} page="dizzjunarju" />
      </header>

      <main className="mx-auto max-w-[60rem] pb-16 pt-4">
        <div className="flex flex-col items-center px-4 text-center">
          <h1 lang="mt" className="display-caps text-4xl">
            {d.dictTitle}
          </h1>
          {d.dictIntro.map((p) => (
            <p key={p} className="mt-3 max-w-[60ch] text-pretty text-lg leading-relaxed">
              {p}
            </p>
          ))}
          <hr className="mt-8 w-24 border-t-2 border-ink/15" />
        </div>

        {CATEGORY_KEYS.map((key, i) => (
          <section key={key} aria-labelledby={`dict-${key}`} className="mt-8">
            <h2 id={`dict-${key}`} className="display-caps px-4 text-2xl">
              {d.dictCategory[key]}
            </h2>
            <WordCarousel words={categoryWords(key)} label={d.dictCarousel(d.dictCategory[key])} first={i === 0} />
          </section>
        ))}

        <footer className="mt-10 flex flex-col items-center border-t-2 border-ink/15 px-4 pt-4 text-center text-sm leading-relaxed text-ink-soft">
          <p className="max-w-[60ch]">{d.dictSourceBody}</p>
          <a href={GABRA_URL} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 font-bold text-sea-deep underline underline-offset-2">
            {d.howSourceLink}
            <ArrowIcon className="size-4" />
          </a>
        </footer>
      </main>
    </div>
  );
}
