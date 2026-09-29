"use client";

import { useEffect, useState } from "react";
import { msUntilNextDay } from "@/lib/day-index";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Time to the next word: midnight in Malta, whatever the player's own time zone. */
export function Countdown({ onElapsed, className = "" }: { onElapsed?: () => void; className?: string }) {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const left = msUntilNextDay();
      setMs(left);
      // msUntilNextDay jumps back to ~24h right after midnight; treat a jump up as elapsed.
      return left;
    };
    let prev = tick();
    const id = window.setInterval(() => {
      const left = tick();
      if (!fired && left > prev + 1000) {
        fired = true;
        onElapsed?.();
      }
      prev = left;
    }, 1000);
    return () => window.clearInterval(id);
  }, [onElapsed]);

  return (
    <span className={`tabular-nums ${className}`} role="timer" aria-live="off">
      {ms === null ? "--:--:--" : fmt(ms)}
    </span>
  );
}
