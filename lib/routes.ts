import type { Lang } from "./i18n";

export type PageKey = "home" | "normali" | "tqila" | "how" | "sellum" | "sellumHow";

const PATHS: Record<PageKey, Record<Lang, string>> = {
  home: { mt: "/", en: "/en" },
  normali: { mt: "/normali", en: "/en/normal" },
  tqila: { mt: "/tqila", en: "/en/hard" },
  how: { mt: "/kif-tahdem", en: "/en/how-it-works" },
  sellum: { mt: "/sellum", en: "/en/sellum" },
  sellumHow: { mt: "/sellum/kif-tahdem", en: "/en/sellum/how-it-works" },
};

export function href(page: PageKey, lang: Lang): string {
  return PATHS[page][lang];
}

/** hreflang alternates for a page pair. */
export function alternates(page: PageKey, lang: Lang) {
  return {
    canonical: PATHS[page][lang],
    languages: { mt: PATHS[page].mt, en: PATHS[page].en, "x-default": PATHS[page].mt },
  };
}
