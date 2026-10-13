import type { Metadata } from "next";
import { AboutPage } from "@/components/AboutPage";
import { pageMetadata } from "@/lib/metadata";

// One version of this page, in English, linked from both home pages' footers.
export const metadata: Metadata = {
  ...pageMetadata("about", "en", "About"),
  alternates: { canonical: "/about" },
};

export default function Page() {
  return <AboutPage />;
}
