"use client";

import { motion } from "framer-motion";
import { useState, type Ref } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Cat, type CatHandle, type CatPose } from "./Cat";
import {
  DEFS,
  GROUND,
  POD_SLOTS,
  SCENE_BG,
  SPRIG_SLOTS,
  TREE,
  VIEWBOX,
} from "./carobSvg";
import { RootTiles } from "./Parts";

/**
 * Għerq's scene, from the Claude Design file "Gherq Scene": a carob tree in a rubble-walled
 * field with its roots running into the soil. The drawing is the design's own SVG; the root
 * letters are the site's stone RootTiles, laid over the soil where the design placed its tiles.
 * Everything is decorative (aria-hidden); the found-words list is the accessible record.
 */

const EASE = [0.45, 0, 0.2, 1] as const;
const VB_W = 360;
const VB_H = 236;
/** Vertical centre of the design's root tiles, as a share of the viewBox height. */
const ROOT_TILES_Y = 208 / VB_H;

/** Static SVG markup from the design (trusted, in-repo constants). */
const Raw = ({ html, ...rest }: { html: string } & React.SVGProps<SVGGElement>) => (
  <g {...rest} dangerouslySetInnerHTML={{ __html: html }} />
);

function Growth({ kind, slot, fresh, reduce, swing = 0 }: { kind: "leaf" | "pod"; slot: [number, number, number, number]; fresh: boolean; reduce: boolean; swing?: number }) {
  const [x, y, r, s] = slot;
  return (
    <motion.g
      initial={fresh && !reduce ? { scale: 0 } : false}
      animate={{ scale: fresh && !reduce ? [0, 1.1, 1] : 1 }}
      transition={{ duration: 0.3, ease: EASE, delay: fresh ? 0.25 : 0 }}
      style={{ originX: `${x}px`, originY: `${y}px`, transformBox: "view-box" }}
    >
      {/* a pod the cat bats swings from its stalk and settles */}
      <motion.g
        key={swing}
        animate={swing ? { rotate: [0, 14, -9, 5, -2, 0] } : { rotate: 0 }}
        transition={{ duration: 1.4, ease: EASE }}
        style={{ originX: `${x}px`, originY: `${y}px`, transformBox: "view-box" }}
      >
        <use href={kind === "pod" ? "#gq-pod" : "#gq-sprig"} transform={`translate(${x},${y}) rotate(${r}) scale(${s})`} />
      </motion.g>
    </motion.g>
  );
}

/**
 * The scene. `found` lists each found word's kind in the order found (rare words grow pods),
 * `freshIndex` the one that just arrived and unfolds. The tree starts bare and fills out.
 */
export function CarobScene({
  found,
  freshIndex,
  catState,
  catRef,
  root,
  className = "",
}: {
  found: ("leaf" | "pod")[];
  freshIndex: number | null;
  /** 0–1 stars nap, 2–4 awake, 5 happy (she settles back into a nap on her own). */
  catState: CatPose;
  /** The cat's reaction API: catRef.current.react("found" | "rare" | "wrong" | "hint" | "stir"). */
  catRef?: Ref<CatHandle>;
  /** Today's root, shown as the site's stone tiles in the soil. */
  root?: string[];
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const [swing, setSwing] = useState(0);
  let leaves = 0;
  let pods = 0;
  const slots = found.map((kind) => {
    if (kind === "pod" && pods < POD_SLOTS.length) return POD_SLOTS[pods++];
    return SPRIG_SLOTS[leaves++ % SPRIG_SLOTS.length];
  });
  // The pod the cat can bat: the lowest one hanging, nearest her on a tie.
  let batIndex = -1;
  found.forEach((kind, i) => {
    if (kind !== "pod") return;
    const b = slots[batIndex];
    if (!b || slots[i][1] > b[1] || (slots[i][1] === b[1] && slots[i][0] > b[0])) batIndex = i;
  });
  const growth = found.map((kind, i) => (
    <Growth key={i} kind={kind} slot={slots[i]} fresh={i === freshIndex} reduce={reduce} swing={i === batIndex ? swing : 0} />
  ));

  return (
    // Positioning comes from the caller (e.g. "absolute inset-0"), so classes never conflict.
    <div className={`overflow-hidden [container-type:size] ${className || "relative"}`} style={{ background: SCENE_BG }}>
      {/* A box with the viewBox's proportions, bottom-centred, always as tall as the scene so the
          whole tree shows, canopy included (where found words grow). A short, wide scene (phones)
          gets a smaller tree, and the sky, wall and fields, drawn far past the viewBox, fill the
          sides. A tall, narrow scene zooms in up to 1.5× and crops the sides instead. */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{ width: `min(calc(100cqh * ${VB_W} / ${VB_H}), calc(100cqw * 1.5))`, aspectRatio: `${VB_W} / ${VB_H}` }}
      >
        <svg aria-hidden viewBox={VIEWBOX} preserveAspectRatio="xMidYMax meet" className="absolute inset-0 size-full overflow-visible" focusable="false">
          <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
          <Raw html={GROUND} />
          <Raw html={TREE} />
          <g filter="url(#gq-sh)">{growth}</g>
          <Cat ref={catRef} pose={catState} reduce={reduce} hasPod={batIndex >= 0} onPodBat={() => setSwing((n) => n + 1)} />
        </svg>
        {root && (
          <div className="absolute inset-x-0 -translate-y-1/2" style={{ top: `${ROOT_TILES_Y * 100}%` }}>
            <RootTiles root={root} size="scene" onSoil />
          </div>
        )}
      </div>
    </div>
  );
}
