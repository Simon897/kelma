"use client";

import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { href, type PageKey } from "@/lib/routes";
import { KEYS, writeJSON } from "@/lib/storage";

/** Goes to the same page in the other language and remembers the choice. */
export function LangToggle({ lang, page, className = "" }: { lang: Lang; page: PageKey; className?: string }) {
  const other: Lang = lang === "mt" ? "en" : "mt";
  const d = t(lang);
  return (
    <Link
      href={href(page, other)}
      hrefLang={other}
      aria-label={d.switchLang}
      onClick={() => writeJSON(KEYS.lang, other)}
      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-tile border-2 border-ink px-2 text-sm font-bold tracking-wide text-ink hover:bg-ink hover:text-limestone-50 ${className}`}
    >
      {d.langShort}
    </Link>
  );
}
