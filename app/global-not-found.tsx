import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { CatLogo } from "@/components/CatLogo";
import { archivo, plex } from "@/lib/fonts";
import { t } from "@/lib/i18n";
import { asset } from "@/lib/site";

export const metadata: Metadata = {
  title: "404 · Kelma",
  icons: { icon: asset("/favicon.svg"), apple: asset("/apple-touch-icon.png") },
  other: { google: "notranslate" },
};

// One 404 for both languages (there is no single root layout), so it speaks both.
export default function GlobalNotFound() {
  const mt = t("mt");
  const en = t("en");
  return (
    <html lang="mt" translate="no" className={`notranslate ${archivo.variable} ${plex.variable}`}>
      <body className="antialiased">
        <main className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
          <CatLogo className="size-24" />
          <p className="display-caps mt-2 text-6xl leading-none">404</p>
          <h1 className="mt-4 text-xl font-bold">{mt.notFoundTitle}</h1>
          <p lang="en" className="mt-1 text-ink-soft">
            {en.notFoundTitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="btn-block inline-flex min-h-12 items-center rounded-tile border-2 border-ink bg-sea px-5 font-bold text-limestone-50 hover:bg-sea-deep"
            >
              {mt.notFoundHome}
            </Link>
            <Link
              href="/en"
              hrefLang="en"
              lang="en"
              className="btn-block inline-flex min-h-12 items-center rounded-tile border-2 border-ink bg-limestone-50 px-5 font-bold text-ink hover:bg-limestone-200"
            >
              {en.notFoundHome}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
