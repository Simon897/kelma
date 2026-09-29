import Link from "next/link";
import type { ReactNode } from "react";
import { tiles } from "@/lib/game";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { GABRA_URL, LICENCE_URL } from "@/lib/site";
import { CatLogo } from "./CatLogo";
import { ArrowIcon } from "./Icons";
import { LangToggle } from "./LangToggle";
import { Tile, type TileState } from "./Tile";

function Row({ word, states, lang }: { word: string; states: TileState[]; lang: Lang }) {
  return (
    <div className="flex gap-1" lang="mt">
      {tiles(word).map((l, i) => (
        <Tile key={i} letter={l} state={states[i]} lang={lang} className="size-11 text-xl" />
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-ink/80 pt-6">
      <h2 className="display-caps text-xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

const tbd = (n: number, at: number, s: TileState): TileState[] =>
  Array.from({ length: n }, (_, i) => (i === at ? s : "tbd"));

export function HowPage({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex h-16 max-w-[40rem] items-center justify-between px-4">
        <Link href={href("home", lang)} aria-label={d.homeAria} className="inline-flex min-h-11 items-center gap-2">
          <CatLogo className="size-10" />
          <span className="display-caps text-xl">Kelma</span>
        </Link>
        <LangToggle lang={lang} page="how" />
      </header>

      <main className="mx-auto max-w-[40rem] space-y-8 px-4 pb-16 pt-4">
        <h1 className="display-caps text-4xl">{d.howHeading}</h1>

        <Section title={d.howPlayTitle}>
          <p>{d.howPlayBody}</p>
          <div className="space-y-4 pt-1">
            <figure>
              <Row word="BAĦAR" states={tbd(5, 0, "correct")} lang={lang} />
              <figcaption className="mt-1.5 text-sm">{d.howExampleCorrect}</figcaption>
            </figure>
            <figure>
              <Row word="KAMRA" states={tbd(5, 2, "present")} lang={lang} />
              <figcaption className="mt-1.5 text-sm">{d.howExamplePresent}</figcaption>
            </figure>
            <figure>
              <Row word="SKOLA" states={tbd(5, 2, "absent")} lang={lang} />
              <figcaption className="mt-1.5 text-sm">{d.howExampleAbsent}</figcaption>
            </figure>
          </div>
          <h3 className="pt-2 font-bold">{d.howDoublesTitle}</h3>
          <p>{d.howDoublesBody}</p>
          <figure>
            <Row word="DAWRA" states={["present", "absent", "absent", "absent", "correct"]} lang={lang} />
            <figcaption className="mt-1.5 text-sm">{d.howDoublesExample}</figcaption>
          </figure>
        </Section>

        <Section title={d.howModesTitle}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stone rounded-tile border-2 border-ink bg-limestone-50 p-4 shadow-block-sm">
              <p className="display-caps text-lg">{d.modeNormali}</p>
              <p className="mt-1.5 text-[0.95rem]">{d.howNormaliBody}</p>
            </div>
            <div className="stone rounded-tile border-2 border-ink bg-limestone-50 p-4 shadow-block-sm">
              <p className="display-caps text-lg">{d.modeTqila}</p>
              <p className="mt-1.5 text-[0.95rem]">{d.howTqilaBody}</p>
            </div>
          </div>
          <p>{d.howModesShared}</p>
        </Section>

        <Section title={d.howLettersTitle}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Row word="GĦAJN" states={["tbd", "tbd", "empty", "empty", "empty"]} lang={lang} />
            <Row word="KTIEB" states={["empty", "empty", "tbd", "tbd", "empty"]} lang={lang} />
          </div>
          <p>{d.howLettersDigraphs}</p>
          <p>{d.howLettersKeys}</p>
          <p>{d.howLettersPhysical}</p>
        </Section>

        <Section title={d.howDailyTitle}>
          <p>{d.howDailyBody}</p>
        </Section>

        <Section title={d.howSourceTitle}>
          <p>{d.howSourceBody}</p>
          <p>
            <a
              href={GABRA_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center gap-2 font-bold text-sea-deep underline underline-offset-2"
            >
              {d.howSourceLink}
              <ArrowIcon className="size-4" />
            </a>
          </p>
          <p>
            <a
              href={LICENCE_URL}
              target="_blank"
              rel="noopener license"
              className="inline-flex min-h-11 items-center gap-2 font-bold text-sea-deep underline underline-offset-2"
            >
              {d.howLicenceLink}
              <ArrowIcon className="size-4" />
            </a>
          </p>
        </Section>

        <div className="flex flex-wrap gap-3 border-t-2 border-ink/80 pt-8">
          <Link
            href={href("normali", lang)}
            className="btn-block inline-flex min-h-12 items-center rounded-tile border-2 border-ink bg-sea px-5 text-limestone-50 hover:bg-sea-deep"
          >
            <span className="display-caps text-lg">{d.modeNormali}</span>
          </Link>
          <Link
            href={href("tqila", lang)}
            className="btn-block inline-flex min-h-12 items-center rounded-tile border-2 border-ink bg-sea px-5 text-limestone-50 hover:bg-sea-deep"
          >
            <span className="display-caps text-lg">{d.modeTqila}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
