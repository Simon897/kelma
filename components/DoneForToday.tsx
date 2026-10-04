"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { NEW_DAY_EVENT, allDone, gamesToday } from "@/lib/today";
import { CatLogo } from "./CatLogo";
import { Countdown } from "./Countdown";

/** True once every game is done today; re-checked when a new day starts on the page. */
function useAllDone() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const check = () => setDone(allDone(gamesToday()));
    check();
    window.addEventListener(NEW_DAY_EVENT, check);
    return () => window.removeEventListener(NEW_DAY_EVENT, check);
  }, []);
  return done;
}

/** The home page's cat. With every game done for the day it curls up and naps (unannounced). */
export function HomeCat({ className }: { className?: string }) {
  return <CatLogo className={className} sleeping={useAllDone()} />;
}

/** One line once every game is done: done for today, and how long until the new games. */
export function DoneForToday({ lang }: { lang: Lang }) {
  const d = t(lang);
  const done = useAllDone();
  if (!done) return null;
  return (
    <p className="mt-2 text-center text-base font-semibold text-ink" role="status">
      <span className="display-caps mr-1.5 text-sm">{d.doneForToday}</span>
      {/* kept on one line, so a narrow screen breaks after the title, not mid-phrase */}
      <span className="whitespace-nowrap">
        {d.newGamesIn}{" "}
        <Countdown className="font-bold tabular-nums" onElapsed={() => window.dispatchEvent(new Event(NEW_DAY_EVENT))} />
      </span>
    </p>
  );
}
