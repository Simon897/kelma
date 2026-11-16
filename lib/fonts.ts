import { Bricolage_Grotesque } from "next/font/google";

/**
 * The site's one sans font, for text and headings alike. It is fetched from Google Fonts when the
 * site is built and served from the site itself, so no visitor's browser contacts Google.
 *
 * All three variable axes are loaded: weight (200 to 800), optical size (12 to 96, applied by the
 * browser through font-optical-sizing: auto) and width (75 to 100; the site only uses the default, 100).
 * latin-ext carries ġĠħĦżŻċĊ.
 *
 * Both root layouts put its variable on <html> (components/RootShell.tsx, app/global-not-found.tsx);
 * app/globals.css turns it into the --font-sans token. The Dizzjunarju's headwords use a second
 * font, a serif: lib/fonts-serif.ts.
 */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
  display: "swap",
});
