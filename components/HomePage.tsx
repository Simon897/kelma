import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { GameCarousel } from "./GameCarousel";
import { DoneForToday, HomeCat } from "./DoneForToday";
import { HomeLangRedirect } from "./HomeClient";
import { IdleVideo } from "./IdleVideo";
import { LangToggle } from "./LangToggle";
import { WordOfDay } from "./WordOfDay";

export function HomePage({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <>
      <HomeLangRedirect lang={lang} />
      {/* The hero stops short of the full screen so the top of the idle animation peeks in,
          a hint that there's more below. Spacing is tighter on phones to make room. */}
      <main className="relative flex min-h-[calc(100svh-5.5rem)] flex-col items-center justify-center px-4 pb-4 pt-10 text-center sm:pb-8 sm:pt-16">
        <LangToggle lang={lang} page="home" className="absolute right-4 top-4" />
        <div className="flex flex-col items-center">
          <HomeCat className="size-16 sm:size-28" />
          <h1 className="display-caps mt-1 text-[2.75rem] leading-none sm:text-7xl">Kelma</h1>
          {/* Says what the site is, so the site's name and the Kelma game aren't confused. */}
          <p className="mt-1 text-sm font-semibold text-ink-soft sm:mt-2 sm:text-lg">{d.siteTagline}</p>
        </div>
        {/* One slide per game; it runs edge to edge so the next slide can peek in. */}
        <div className="-mx-4 mt-2 flex w-[calc(100%+2rem)] justify-center sm:mt-5">
          <GameCarousel lang={lang} />
        </div>
        <DoneForToday lang={lang} />
        <div className="mt-3 w-full max-w-[26rem] border-t-2 border-ink/15 pt-3 sm:mt-4">
          <WordOfDay lang={lang} />
        </div>
      </main>
      <IdleVideo />
    </>
  );
}
