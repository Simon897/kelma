import Link from "next/link";
import type { Dict, Lang } from "@/lib/i18n";
import type { Mode } from "@/lib/modes";
import { href } from "@/lib/routes";
import { CatLogo } from "./CatLogo";
import { HelpIcon, SettingsIcon, StatsIcon } from "./Icons";
import { LangToggle } from "./LangToggle";

const iconBtn =
  "inline-flex size-11 items-center justify-center rounded-tile text-ink hover:bg-limestone-200 active:translate-y-px";

export function GameHeader({
  lang,
  mode,
  d,
  onHelp,
  onStats,
  onSettings,
}: {
  lang: Lang;
  mode: Mode;
  d: Dict;
  onHelp: () => void;
  onStats: () => void;
  onSettings: () => void;
}) {
  const modeName = mode === "normali" ? d.modeNormali : d.modeTqila;
  return (
    <header className="mx-auto flex h-14 w-full max-w-[500px] shrink-0 items-center gap-1 border-b-2 border-ink/80 px-2">
      <Link href={href("home", lang)} aria-label={d.homeAria} className={`${iconBtn} -ml-1`}>
        <CatLogo className="size-9" />
      </Link>
      {/* Below 420px the cat logo carries the brand, so "Kelma ·" is for screen readers only. */}
      <h1 className="min-w-0 flex-1 truncate whitespace-nowrap pl-1 leading-none">
        <span className="sr-only min-[420px]:not-sr-only">
          <span className="display-caps text-base">Kelma</span>
          <span className="mx-1.5 text-ink-soft">·</span>
        </span>
        <span className="display-caps text-base">{modeName}</span>
      </h1>
      <button type="button" className={iconBtn} aria-label={d.helpAria} onClick={onHelp}>
        <HelpIcon className="size-6" />
      </button>
      <button type="button" className={iconBtn} aria-label={d.statsAria} onClick={onStats}>
        <StatsIcon className="size-6" />
      </button>
      <button type="button" className={iconBtn} aria-label={d.settingsAria} onClick={onSettings}>
        <SettingsIcon className="size-6" />
      </button>
      <LangToggle lang={lang} page={mode} className="ml-1" />
    </header>
  );
}
