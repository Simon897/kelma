import Link from "next/link";
import type { ReactNode } from "react";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { GABRA_URL } from "@/lib/site";
import { CatLogo } from "../CatLogo";
import { ArrowIcon } from "../Icons";
import { LangToggle } from "../LangToggle";
import { ExampleFamily } from "./ExampleFamily";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-ink/80 pt-6">
      <h2 className="display-caps text-xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

export function GherqHowPage({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex h-16 max-w-[40rem] items-center justify-between px-4">
        <Link href={href("home", lang)} aria-label={d.homeAria} className="inline-flex min-h-11 items-center gap-2">
          <CatLogo className="size-10" />
          <span className="display-caps text-xl">Kelma</span>
        </Link>
        <LangToggle lang={lang} page="gherqHow" />
      </header>

      <main className="mx-auto max-w-[40rem] space-y-8 px-4 pb-16 pt-4">
        <h1 className="display-caps text-4xl">{d.gherqHowTitle}</h1>

        <Section title={d.gherqHowRootTitle}>
          <p>{d.gherqHowRoot}</p>
          <figure>
            <ExampleFamily lang={lang} />
            <figcaption className="mt-2 text-sm text-ink-soft">{d.gherqHowExample}</figcaption>
          </figure>
        </Section>

        <Section title={d.gherqHowCountsTitle}>
          <p>{d.gherqHowCounts}</p>
        </Section>

        <Section title={d.gherqHowPointsTitle}>
          <ul className="space-y-1.5">
            {[d.gherqHowPoints1, d.gherqHowPoints2, d.gherqHowPoints3].map((line, i) => (
              <li key={line} className="flex items-center gap-3">
                <span aria-hidden className={`inline-flex h-6 min-w-7 items-center justify-center rounded-tile text-xs font-bold text-limestone-50 ${i === 2 ? "bg-star" : "bg-ink"}`}>
                  {`+${i + 1}`}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p>{d.gherqHowStars}</p>
        </Section>

        <Section title={d.gherqHowHintsTitle}>
          <p>{d.gherqHowHints}</p>
        </Section>

        <Section title={d.gherqHowGiveUpTitle}>
          <p>{d.gherqHowGiveUp}</p>
          <p>{d.gherqHowFree}</p>
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
            href={href("gherq", lang)}
            className="btn-block inline-flex min-h-12 items-center rounded-tile border-2 border-ink bg-sea px-5 text-limestone-50 hover:bg-sea-deep"
          >
            <span className="display-caps text-lg">{d.sellumPlay}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
