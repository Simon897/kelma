"use client";

import { useAllDone } from "./DoneForToday";
import { StreetScene } from "./StreetScene";

/** The home page's street: Daisy naps on her doorstep once all of today's games are done. */
export function HomeStreet() {
  return <StreetScene fill asleep={useAllDone()} />;
}
