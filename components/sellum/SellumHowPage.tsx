import Link from "next/link";
import type { ReactNode } from "react";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { GABRA_URL } from "@/lib/site";
import { CatLogo } from "../CatLogo";
import { ArrowIcon } from "../Icons";
import { LangToggle } from "../LangToggle";
import { ExampleLadder } from "./ExampleLadder";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-ink/80 pt-6">
      <h2 className="display-caps text-xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

export function SellumHowPage({ lang }: { lang: Lang }) {
  const d = t(lang);
  const lives: [string, boolean][] = [
    [d.sellumHowLivesSlip, false],
    [d.sellumHowLivesWord, true],
    [d.sellumHowLivesDead, true],
  ];
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex h-16 max-w-[40rem] items-center justify-between px-4">
        <Link href={href("home", lang)} aria-label={d.homeAria} className="inline-flex min-h-11 items-center gap-2">
          <CatLogo className="size-10" />
          <span className="display-caps text-xl">Kelma</span>
        </Link>
        <LangToggle lang={lang} page="sellumHow" />
      </header>

      <main className="mx-auto max-w-[40rem] space-y-8 px-4 pb-16 pt-4">
        <h1 className="display-caps text-4xl">{d.sellumHowTitle}</h1>
        <p className="text-lg leading-relaxed">{d.sellumHowIntro}</p>

        <figure>
          <ExampleLadder lang={lang} />
          <figcaption className="mt-2 text-sm text-ink-soft">{d.sellumHowExample}</figcaption>
        </figure>

        <Section title={d.sellumHowEditTitle}>
          <p>{d.sellumHowEdit}</p>
          <p>{d.sellumHowGreen}</p>
        </Section>

        <Section title={d.sellumHowLivesTitle}>
          <ul className="space-y-2">
            {lives.map(([text, costs]) => (
              <li key={text} className="flex gap-3">
                <span
                  aria-hidden
                  className={`mt-1.5 inline-block size-3 shrink-0 rounded-tile border-2 ${costs ? "border-ink bg-transparent" : "border-ink bg-ink"}`}
                />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p>{d.sellumHowLivesEnd}</p>
        </Section>

        <Section title={d.sellumHowRoutesTitle}>
          <p>{d.sellumHowRoutes}</p>
        </Section>

        <Section title={d.howSourceTitle}>
          <p>{d.howSourceBody}</p>
          <p>
            <a href={GABRA_URL} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 font-bold text-sea-deep underline underline-offset-2">
              {d.howSourceLink}
              <ArrowIcon className="size-4" />
            </a>
          </p>
        </Section>

        <div className="border-t-2 border-ink/80 pt-8">
          <Link
            href={href("sellum", lang)}
            className="btn-block inline-flex min-h-12 items-center rounded-tile border-2 border-ink bg-sea px-5 text-limestone-50 hover:bg-sea-deep"
          >
            <span className="display-caps text-lg">{d.sellumPlay}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
