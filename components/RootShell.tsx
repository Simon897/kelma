import type { ReactNode } from "react";
import { archivo, plex } from "@/lib/fonts";
import type { Lang } from "@/lib/i18n";
import { Providers } from "./Providers";

// Applies the saved high-contrast setting before first paint (no flash of the default tile colours).
const SETTINGS_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("kelma:settings")||"{}");if(s&&s.highContrast)document.documentElement.setAttribute("data-contrast","")}catch(e){}`;

export function RootShell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={lang} className={`${archivo.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_SCRIPT }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
