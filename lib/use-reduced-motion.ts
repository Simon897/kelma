"use client";

import { useEffect, useState } from "react";

/**
 * prefers-reduced-motion, read after mount and kept live. Used where the reduced version must be
 * a different behaviour (the Sellum worker jumps floors), not just a shorter animation.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return reduced;
}
