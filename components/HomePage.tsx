import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { GameCarousel } from "./GameCarousel";
import { DoneForToday } from "./DoneForToday";
import { HomeLangRedirect } from "./HomeClient";
import { HomeStreet } from "./HomeStreet";
import { LangToggle } from "./LangToggle";
import { WordOfDay } from "./WordOfDay";

/**
 * The home page opens on the street: the wordmark, then a strip of the street scene with Daisy
 * on her doorstep, and the game cards standing on its pavement edge. The play buttons stay above
 * the fold at 375×667, and the word of the day comes right under the games.
 */
export function HomePage({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    // The footer sits at the bottom of the screen even when the page is shorter (tall or ultrawide screens).
    <div className="flex min-h-svh flex-col">
      <HomeLangRedirect lang={lang} />
      {/* spare height (tall or ultrawide screens) goes above and below, so the page sits in the middle */}
      <main className="relative flex flex-1 flex-col justify-center">
        <LangToggle lang={lang} page="home" className="absolute right-4 top-4 z-20 bg-limestone-50" />
        <div className="flex flex-col items-center px-4 pt-7 text-center sm:pt-14">
          <h1 className="display-caps text-[2.75rem] leading-none sm:text-7xl">Kelma</h1>
          {/* Says what the site is, so the site's name and the Kelma game aren't confused. */}
          <p className="mt-1 text-sm font-semibold text-ink-soft sm:mt-2 sm:text-lg">{d.siteTagline}</p>
        </div>
        {/* Up to 1600px wide, so ultrawide screens see the street, not a zoomed band of it; wider than
            that, its sides fade into the page like the pavement does. */}
        {/* Phones: the whole square street, as tall as the strip (--strip), its sides fading into the page. */}
        <div
          style={{ "--strip": "clamp(220px,36svh,300px)" } as React.CSSProperties}
          className="relative mx-auto mt-1 h-[var(--strip)] w-full max-w-[1600px] max-md:[mask-image:linear-gradient(to_right,transparent_calc(50%-var(--strip)/2),black_calc(50%-var(--strip)/2+32px),black_calc(50%+var(--strip)/2-32px),transparent_calc(50%+var(--strip)/2))] md:h-[clamp(260px,40svh,380px)] min-[1600px]:[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
        >
          <HomeStreet />
        </div>
        {/* One slide per game, edge to edge so the next slide peeks in; the cards stand on the pavement. */}
        <div className="relative z-10 -mt-3 flex w-full justify-center md:-mt-16">
          <GameCarousel lang={lang} solid />
        </div>
        <div className="flex flex-col items-center px-4 pb-6 text-center">
          <DoneForToday lang={lang} />
          <div className="mt-3 w-full max-w-[26rem] border-t-2 border-ink/15 pt-3 sm:mt-4">
            <WordOfDay lang={lang} />
          </div>
        </div>
      </main>
      <footer className="bg-ink px-4 py-5 text-center text-sm text-limestone-50">
        <Link
          href={href("about", lang)}
          className="inline-flex min-h-11 items-center font-bold underline underline-offset-4 hover:text-limestone-200 focus-visible:outline-limestone-50"
        >
          {d.aboutLink}
        </Link>
      </footer>
    </div>
  );
}
