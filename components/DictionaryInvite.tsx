"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type FormEvent } from "react";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { asset } from "@/lib/site";

/** Daisy looking over the top of the book, smiling, paws hooked over its edge. 459×480, transparent. */
const DAISY = asset("/media/home-daisy-peek.webp");
/** Where her body is cut off, as a share of the image's height: below it only her paws hang over the book. */
const DAISY_EDGE = 0.937;
const DICE = asset("/media/dizzjunarju-dice.webp");

/**
 * The Dizzjunarju's way in from the home page, under the word of the day: an open green book with
 * Daisy peeking over it. Its left page searches the dictionary (the book opens on that word, see
 * DictionaryBook's readArrival), its right page holds the dice for a random word, and a ribbon
 * bookmark opens the book itself. On phones the book shows one page, with the dice beside the search.
 *
 * The book is drawn in CSS (.felt-cover, .felt-page in app/globals.css) so it can be any width.
 */
export function DictionaryInvite({ lang }: { lang: Lang }) {
  const d = t(lang);
  const router = useRouter();
  const [q, setQ] = useState("");
  const page = href("dizzjunarju", lang);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const word = q.trim();
    router.push(word ? `${page}?q=${encodeURIComponent(word)}` : page);
  };

  return (
    <section
      aria-labelledby="dict-invite-title"
      className="dict-invite relative mx-auto mb-4 mt-8 w-full max-w-[44rem] pb-14 text-left [--daisy:128px] sm:mt-10 sm:[--daisy:180px]"
      style={{ paddingTop: `calc(var(--daisy) * ${DAISY_EDGE})` } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, no image optimiser */}
      <img src={DAISY} alt="" width={459} height={480} draggable={false} className="dict-invite-daisy pointer-events-none absolute left-1/2 top-0 z-20 h-[var(--daisy)] w-auto -translate-x-1/2 select-none" />

      <div className="felt-cover relative z-10 rounded-[10px] px-3 py-3 sm:px-[22px] sm:py-4">
        <div className="relative grid sm:grid-cols-2">
          {/* left page: the search */}
          <div className="felt-page felt-page-left relative flex flex-col gap-3 rounded-[4px] px-4 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-8">
            <div>
              <h2 id="dict-invite-title" lang="mt" className="display-caps text-2xl leading-none sm:text-[1.75rem]">
                {d.dictTitle}
              </h2>
              <p className="mt-1.5 text-sm leading-snug text-ink-soft sm:text-[0.9375rem]">{d.homeDictBlurb}</p>
            </div>
            <div className="flex gap-2">
              <form role="search" onSubmit={submit} className="relative min-w-0 flex-1">
                <label htmlFor="dict-invite-q" className="sr-only">
                  {d.dictSearch}
                </label>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="square" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink">
                  <rect x="4" y="4" width="11" height="11" />
                  <path d="M15.5 15.5 20 20" />
                </svg>
                <input
                  id="dict-invite-q"
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={d.dictSearch}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-12 w-full rounded-tile border-2 border-ink bg-[#fffdf6] pl-11 pr-12 text-base font-medium text-ink shadow-[var(--shadow-block-sm)] placeholder:text-ink-soft [&::-webkit-search-cancel-button]:hidden"
                />
                <button
                  type="submit"
                  aria-label={d.homeDictGo}
                  className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-tile text-ink hover:bg-limestone-100"
                >
                  <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="square">
                    <path d="M4 12h15M13 6l6 6-6 6" />
                  </svg>
                </button>
              </form>
              {/* phones: the dice sits beside the search (the right-hand page is hidden) */}
              <Link href={`${page}?random=1`} aria-label={d.dictRandom} title={d.dictRandom} className="dict-dice shrink-0 sm:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={DICE} alt="" width={48} height={48} draggable={false} className="block size-12" />
              </Link>
            </div>
          </div>

          {/* right page: a random word (from sm up) */}
          <div className="felt-page felt-page-right relative hidden flex-col items-center justify-center gap-2 rounded-[4px] px-7 pb-7 pt-8 sm:flex">
            <Link href={`${page}?random=1`} className="group flex flex-col items-center gap-2 rounded-tile p-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DICE} alt="" width={80} height={80} draggable={false} className="dict-invite-die block size-20" />
              <span className="text-sm font-semibold text-ink-soft underline decoration-ink/30 underline-offset-4 group-hover:text-ink group-hover:decoration-ink">{d.dictRandom}</span>
            </Link>
          </div>

          {/* the fold down the middle */}
          <div aria-hidden className="felt-fold pointer-events-none absolute inset-y-0 left-1/2 hidden w-12 -translate-x-1/2 sm:block" />
        </div>
      </div>

      {/* the bookmark ribbon, tucked under the bottom of the book */}
      <Link
        href={page}
        className="dict-ribbon felt-ribbon absolute bottom-0 left-1/2 z-0 flex h-[4.5rem] w-[15rem] -translate-x-1/2 items-end justify-center pb-6 text-ink sm:left-auto sm:right-14 sm:translate-x-0"
      >
        <span className="button-caps text-base leading-none">{d.homeDictOpen}</span>
      </Link>
    </section>
  );
}
