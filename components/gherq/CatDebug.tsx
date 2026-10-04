"use client";

import { useEffect, useState, type RefObject } from "react";
import { IDLES, type CatPose } from "@/lib/gherq/cat-scheduler";
import type { CatHandle, CatReaction } from "./Cat";

/**
 * Dev builds only, and hidden until the URL has ?catdebug: force each pose, and play each idle and
 * reaction on demand, to check them against the design.
 */
export function CatDebugPanel({ cat, pose, setPose }: { cat: RefObject<CatHandle | null>; pose: CatPose | null; setPose: (p: CatPose | null) => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(new URLSearchParams(window.location.search).has("catdebug")), []);
  if (!shown) return null;

  const btn = "rounded-tile border border-ink/60 bg-limestone-50 px-1.5 py-0.5 hover:bg-limestone-200";
  const on = "border-sea bg-sea text-limestone-50 hover:bg-sea-deep";
  const reactions: CatReaction[] = ["found", "rare", "wrong", "hint", "stir"];
  const poses: (CatPose | null)[] = [null, "nap", "awake", "happy", "drowsy"];
  return (
    <div className="absolute right-2 top-2 z-30 max-w-[17rem] space-y-1.5 rounded-tile border-2 border-ink bg-limestone-100/95 p-2 text-[11px] shadow-block-sm">
      <p className="font-bold">Cat debug</p>
      <div className="flex flex-wrap gap-1">
        {poses.map((p) => (
          <button key={p ?? "auto"} type="button" className={`${btn} ${pose === p ? on : ""}`} onClick={() => setPose(p)}>
            {p ?? "auto"}
          </button>
        ))}
      </div>
      {(Object.keys(IDLES) as CatPose[]).map((p) => (
        <div key={p} className="flex flex-wrap items-center gap-1">
          <span className="w-12 font-semibold">{p}</span>
          {IDLES[p].map((i) => (
            <button key={i.name} type="button" className={btn} onClick={() => cat.current?.playIdle(i.name)}>
              {i.name}
              {i.rare ? "*" : ""}
            </button>
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-1">
        <span className="w-12 font-semibold">react</span>
        {reactions.map((r) => (
          <button key={r} type="button" className={btn} onClick={() => cat.current?.react(r)}>
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
