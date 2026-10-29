"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORY_KEYS, categoryWords, type CategoryKey } from "@/lib/dizzjunarju";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { GABRA_URL } from "@/lib/site";
import { CatLogo } from "../CatLogo";
import { ArrowIcon } from "../Icons";
import { LangToggle } from "../LangToggle";
import { WordCarousel } from "./WordCarousel";

/** Dizzjunarju: Maltese words for everyday things, a category at a time. */
export function DizzjunarjuPage({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [category, setCategory] = useState<CategoryKey>(CATEGORY_KEYS[0]);
  const words = useMemo(() => categoryWords(category), [category]);
  const name = d.dictCategory[category];

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
        <div className="px-4">
          <h1 lang="mt" className="display-caps text-4xl">
            {d.dictTitle}
          </h1>
          <p className="mt-3 max-w-[60ch] text-pretty text-lg leading-relaxed">{d.dictIntro}</p>
        </div>

        <section aria-labelledby="dict-categories" className="mt-8">
          <h2 id="dict-categories" className="sr-only">
            {d.dictCategories}
          </h2>
          <WordCarousel words={words} label={d.dictCarousel(name)} d={d}>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="dict-categories">
              {CATEGORY_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={key === category}
                  onClick={() => setCategory(key)}
                  className={`inline-flex h-11 items-center rounded-tile border-2 border-ink px-4 font-bold shadow-block-sm active:translate-y-px ${
                    key === category ? "bg-ink text-limestone-50" : "bg-limestone-50 text-ink hover:bg-limestone-200"
                  }`}
                >
                  {d.dictCategory[key]}
                </button>
              ))}
            </div>
          </WordCarousel>
        </section>

        <footer className="mt-10 border-t-2 border-ink/15 px-4 pt-4 text-sm leading-relaxed text-ink-soft">
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
