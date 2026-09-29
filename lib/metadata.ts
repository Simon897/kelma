import type { Metadata, Viewport } from "next";
import { t, type Lang } from "./i18n";
import { alternates, type PageKey } from "./routes";
import { SITE_URL } from "./site";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#edd2a4",
};

export function pageMetadata(page: PageKey, lang: Lang, title?: string): Metadata {
  const d = t(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: title ? `${title} · Kelma` : "Kelma",
    description: d.siteDescription,
    alternates: alternates(page, lang),
    icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
    openGraph: { title: title ? `Kelma · ${title}` : "Kelma", description: d.siteDescription, locale: lang === "mt" ? "mt_MT" : "en_GB" },
  };
}
