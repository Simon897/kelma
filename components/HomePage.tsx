import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { CatLogo } from "./CatLogo";
import { HomeButtons, HomeDate, HomeLangRedirect } from "./HomeClient";
import { IdleVideo } from "./IdleVideo";
import { LangToggle } from "./LangToggle";

export function HomePage({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <>
      <HomeLangRedirect lang={lang} />
      <main className="relative flex min-h-svh flex-col items-center justify-center px-4 pb-14 pt-16 text-center">
        <LangToggle lang={lang} page="home" className="absolute right-4 top-4" />
        <div className="flex flex-col items-center">
          <CatLogo className="size-24 sm:size-28" />
          <h1 className="display-caps mt-1 text-[3.5rem] leading-none sm:text-7xl">Kelma</h1>
        </div>
        <p className="mt-4 max-w-[22rem] text-balance text-lg font-medium leading-snug">{d.tagline}</p>
        <div className="mt-8 flex w-full justify-center">
          <HomeButtons lang={lang} />
        </div>
        <div className="mt-7">
          <HomeDate lang={lang} />
        </div>
      </main>
      <IdleVideo />
    </>
  );
}
