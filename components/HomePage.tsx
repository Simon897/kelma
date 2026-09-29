import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { CatLogo } from "./CatLogo";
import { HomeButtons, HomeDate, HomeLangRedirect } from "./HomeClient";
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
      <main className="relative flex min-h-[calc(100svh-5.5rem)] flex-col items-center justify-center px-4 pb-4 pt-12 text-center sm:pb-8 sm:pt-16">
        <LangToggle lang={lang} page="home" className="absolute right-4 top-4" />
        <div className="flex flex-col items-center">
          <CatLogo className="size-20 sm:size-28" />
          <h1 className="display-caps mt-1 text-[3.25rem] leading-none sm:text-7xl">Kelma</h1>
        </div>
        <p className="mt-3 max-w-[22rem] text-balance text-lg font-medium leading-snug">{d.tagline}</p>
        <div className="mt-6 flex w-full justify-center sm:mt-8">
          <HomeButtons lang={lang} />
        </div>
        <div className="mt-5">
          <HomeDate lang={lang} />
        </div>
        <div className="mt-4 w-full max-w-[26rem] border-t-2 border-ink/15 pt-3">
          <WordOfDay lang={lang} />
        </div>
      </main>
      <IdleVideo />
    </>
  );
}
