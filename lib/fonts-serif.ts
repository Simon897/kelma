import { IBM_Plex_Serif } from "next/font/google";

// The Dizzjunarju's headwords and word forms. Kept out of lib/fonts.ts so only that page loads it.
// latin-ext for ġĠħĦżŻċĊ.
export const plexSerif = IBM_Plex_Serif({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-plex-serif",
  display: "swap",
});
