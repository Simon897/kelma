"use client";

import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Cat, type CatHandle, type CatPose } from "./Cat";
import { CLUMP_SLOTS, DEFS, GROUND, POD_SLOTS, SCENE_BG, TREE, VIEWBOX } from "./carobSvg";
import { RootTiles } from "./Parts";

/**
 * Għerq's scene, from the Claude Design files "Gherq Scene" and "Gherq Carob Tree": a paper-cut
 * carob tree in a rubble-walled field, its roots running into the soil. The canopy fills in as a
 * share of the core words found (all of them = a full tree, whatever the puzzle's size) and every
 * bonus word hangs a green carob pod. In the result panel a short finale plays once: a breeze,
 * the pods ripen to gold, two leaflets fall and the cat bats a pod; then the scene holds still.
 * Growth and the finale are written straight to the SVG in requestAnimationFrame. Decorative
 * (aria-hidden); the found-words list is the accessible record.
 */

const VB_W = 360;
const VB_H = 236;
/** Vertical centre of the design's root tiles, as a share of the viewBox height. */
const ROOT_TILES_Y = 208 / VB_H;
/** The result panel's crop keeps the canopy top and the root tiles. */
const RESULT_VIEWBOX = "20 -28 320 264";
const MAX_PODS = 12;
/** The finale starts this long after the panel opens. */
const FINALE_DELAY_MS = 450;
const POD_D = "M-1,4 C5,9 7,22 4,34 C3,38 -2,38 -2,34 C0,24 -2,12 -4,6 Z";
const SEEDS: [number, number, number, number][] = [
  [1, 13, 1.4, 2],
  [2, 21, 1.4, 2],
  [1.5, 29, 1.3, 1.9],
];
/** Falling leaflets: from (x0, y0) to (x1, y1) on the grass, starting at `at` seconds. */
const LEAFLETS = [
  { x0: 132, y0: 72, x1: 110, y1: 167, at: 0.35, fill: "#4f7a3a" },
  { x0: 236, y0: 80, x1: 204, y1: 170, at: 0.7, fill: "#5d8a44" },
];

/** The site's ease, cubic-bezier(0.45, 0, 0.2, 1), as a function of progress. */
function ez(u: number) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const bx = (t: number) => 3 * 0.45 * t * (1 - t) * (1 - t) + 3 * 0.2 * t * t * (1 - t) + t * t * t;
  const by = (t: number) => 3 * t * t * (1 - t) + t * t * t;
  let lo = 0,
    hi = 1,
    t = u;
  for (let i = 0; i < 18; i++) {
    t = (lo + hi) / 2;
    if (bx(t) < u) lo = t;
    else hi = t;
  }
  return by(t);
}
/** Keyframes at progress u (eased per segment), like framer-motion's. */
function kf(u: number, v: number[], times?: number[]) {
  const n = v.length;
  if (!(u > 0)) return v[0];
  if (u >= 1) return v[n - 1];
  const T = times ?? v.map((_, i) => i / (n - 1));
  for (let i = 1; i < n; i++) if (u <= T[i]) return v[i - 1] + (v[i] - v[i - 1]) * ez((u - T[i - 1]) / (T[i] - T[i - 1]));
  return v[n - 1];
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Pod i hangs at base slot i % 4; later rounds cluster beside it, alternating sides. */
function podSlot(i: number) {
  const b = POD_SLOTS[i % 4],
    k = Math.floor(i / 4);
  const dx = k === 0 ? 0 : (k % 2 ? 4.5 : -4.5) * Math.ceil(k / 2);
  return { x: b[0] + dx, y: b[1] + (k ? 1.5 : 0), r: b[2] + (k === 0 ? 0 : k % 2 ? 11 : -11), s: b[3] * (k ? 0.88 : 1) };
}
/** The pod the cat can bat: the lowest one hanging, nearest her on a tie. */
function batIndex(n: number) {
  let b = -1;
  for (let i = 0; i < n; i++) {
    const p = podSlot(i),
      q = b < 0 ? null : podSlot(b);
    if (!q || p.y > q.y || (p.y === q.y && p.x > q.x)) b = i;
  }
  return b;
}

type Tween = { from: number; to: number; start: number };
/** A tween's value now: a 300ms pop (to 1.1× the change, then settle) once its start arrives. */
function tv(t: Tween | undefined, now: number) {
  if (!t) return 0;
  if (!t.start) return t.to;
  const u = (now - t.start) / 300;
  if (u <= 0) return t.from;
  if (u >= 1) return t.to;
  return kf(u, [t.from, t.to + 0.1 * (t.to - t.from), t.to]);
}

/** Static SVG markup from the design (trusted, in-repo constants). */
const Raw = ({ html }: { html: string }) => <g dangerouslySetInnerHTML={{ __html: html }} />;

export function CarobScene({
  coreFound,
  coreTotal,
  bonus,
  catState,
  catRef,
  root,
  variant = "game",
  className = "",
}: {
  coreFound: number;
  coreTotal: number;
  /** Bonus words found: one pod each. */
  bonus: number;
  /** 0–1 stars nap, 2–4 awake, 5 happy. */
  catState: CatPose;
  /** In game, the cat's reaction API: catRef.current.react("found" | "rare" | "wrong" | "hint" | "stir"). */
  catRef?: Ref<CatHandle>;
  /** Today's root, shown as the site's stone tiles in the soil. */
  root?: string[];
  /** "result": the result panel's crop, playing the finale once on mount. */
  variant?: "game" | "result";
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const finale = variant === "result";
  const share = clamp01(coreFound / Math.max(1, coreTotal));
  const pods = Math.max(0, Math.min(MAX_PODS, bonus));
  const bat = batIndex(pods);

  const leafEls = useRef<(SVGGElement | null)[]>([]);
  const podSwing = useRef<(SVGGElement | null)[]>([]);
  const podGreen = useRef<(SVGGElement | null)[]>([]);
  const leafletEls = useRef<(SVGGElement | null)[]>([]);
  const tw = useRef<{ leaf: Tween[]; pod: Tween[] }>({ leaf: [], pod: [] });
  const finStart = useRef<number | null>(null);
  const batAt = useRef(-1e9);
  const busyUntil = useRef(0);
  const dirty = useRef(true);
  const shareRef = useRef(share);
  const podsRef = useRef(pods);
  shareRef.current = share;
  podsRef.current = pods;
  const bump = (ms: number) => {
    busyUntil.current = Math.max(busyUntil.current, performance.now() + ms);
    dirty.current = true;
  };

  // Growth: a clump or pod that grows tweens in after a short wait; anything that shrinks jumps.
  const first = useRef(true);
  useEffect(() => {
    const now = performance.now(),
      instant = first.current || reduce;
    first.current = false;
    const set = (arr: Tween[], i: number, v: number) => {
      const t = (arr[i] ??= { from: 0, to: 0, start: 0 });
      if (Math.abs(t.to - v) < 1e-6) return;
      const cur = tv(t, now);
      if (instant || v < cur) Object.assign(t, { from: v, to: v, start: 0 });
      else Object.assign(t, { from: cur, to: v, start: now + 250 });
    };
    CLUMP_SLOTS.forEach((_, i) => set(tw.current.leaf, i, clamp01(share * CLUMP_SLOTS.length - i)));
    tw.current.pod.length = Math.min(tw.current.pod.length, pods);
    for (let i = 0; i < pods; i++) set(tw.current.pod, i, 1);
    bump(900);
  }, [share, pods, reduce]);

  // The finale: once, when the result panel opens (with reduced motion, straight to its end).
  const [woke, setWoke] = useState(false);
  const cat = useRef<CatHandle>(null);
  useEffect(() => {
    if (!finale) return;
    if (reduce) {
      finStart.current = performance.now() - 99_000;
      setWoke(true);
      bump(100);
      return;
    }
    finStart.current = performance.now() + FINALE_DELAY_MS;
    bump(FINALE_DELAY_MS + 6200);
    const ids = [
      window.setTimeout(() => setWoke(true), FINALE_DELAY_MS + 500),
      window.setTimeout(() => cat.current?.playMove("finaleGlance"), FINALE_DELAY_MS + 1200),
      window.setTimeout(() => podsRef.current > 0 && cat.current?.playMove("finaleBat"), FINALE_DELAY_MS + 2600),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [finale, reduce]);

  const apply = useCallback((now: number) => {
    const TAU = Math.PI * 2;
    const fin = finStart.current == null ? -1 : Math.min(6, (now - finStart.current) / 1000);
    const gust = (x: number) => {
      if (fin < 0) return [0, 0];
      const d = fin - (0.1 + ((x - 90) / 180) * 0.6);
      return [Math.exp(-((d - 0.3) * (d - 0.3)) / 0.09), d];
    };
    const rust = (x: number) => (fin > 1.2 && fin < 4.4 ? 2.2 * Math.exp(-(fin - 1.2) * 1.6) * Math.sin(TAU * fin * 2.4 + x * 0.07) : 0);

    CLUMP_SLOTS.forEach(([x], i) => {
      const g = tv(tw.current.leaf[i], now),
        vis = g <= 0 ? 0 : Math.pow(g, 0.6);
      const [e, d] = gust(x);
      const rot = e * (4 + 8 * Math.sin(TAU * d * 3)) + rust(x);
      const sx = 1 - 0.06 * e * Math.abs(Math.sin(TAU * d * 4));
      leafEls.current[i]?.setAttribute("transform", `rotate(${rot.toFixed(2)}) scale(${(vis * sx).toFixed(3)},${vis.toFixed(3)})`);
    });

    const n = podsRef.current,
      b = batIndex(n);
    const stag = n > 1 ? Math.min(0.14, 1 / (n - 1)) : 0;
    for (let j = 0; j < n; j++) {
      const p = podSlot(j);
      const g = tv(tw.current.pod[j], now);
      const rp = fin < 0 ? 0 : ez(clamp01((fin - 1.2 - j * stag) / 0.5));
      const swell = 1 + 0.08 * Math.sin(Math.PI * rp);
      const [e, d] = gust(p.x);
      let rot = e * 10 * Math.sin(TAU * d * 2.5) + 1.5 * rust(p.x);
      if (j === b) rot += fin >= 0 ? kf((fin - 2.95) / 1.2, [0, 14, -9, 5, -2, 0]) : kf((now - batAt.current) / 1400, [0, 14, -9, 5, -2, 0]);
      podSwing.current[j]?.setAttribute("transform", `rotate(${rot.toFixed(2)}) scale(${(g * swell).toFixed(3)})`);
      podGreen.current[j]?.setAttribute("opacity", (1 - rp).toFixed(3));
    }

    LEAFLETS.forEach((l, i) => {
      const el = leafletEls.current[i];
      if (!el) return;
      const u = fin < 0 || shareRef.current <= 0 ? 0 : clamp01((fin - l.at) / 2);
      if (u <= 0) return el.setAttribute("opacity", "0");
      const x = l.x0 + (l.x1 - l.x0) * u + 7 * Math.sin(TAU * u * 1.5) * (1 - u);
      const y = l.y0 + (l.y1 - l.y0) * (0.6 * u + 0.4 * u * u);
      const rot = 50 * Math.sin(TAU * u * 1.3) * (1 - u) + 8;
      el.setAttribute("opacity", "1");
      el.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(0.85,${u >= 1 ? 0.5 : 0.85})`);
    });
  }, []);

  // One loop; it only draws while something is moving.
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (dirty.current || now <= busyUntil.current) {
        dirty.current = false;
        apply(now);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [apply]);

  // In the result panel she gets up for the finale (if she was napping) and then stays sitting.
  const pose: CatPose = finale ? (catState === "nap" || catState === "drowsy" ? (woke ? "awake" : "nap") : catState) : catState;
  const onPodBat = useCallback(() => {
    batAt.current = performance.now();
    bump(1500);
  }, []);

  const drawing = (
    <svg
      aria-hidden
      viewBox={finale ? RESULT_VIEWBOX : VIEWBOX}
      preserveAspectRatio={finale ? "xMidYMax slice" : "xMidYMax meet"}
      className="absolute inset-0 size-full overflow-visible"
      focusable="false"
    >
      <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
      <Raw html={GROUND} />
      <Raw html={TREE} />
      <g filter="url(#gq-paper)">
        {CLUMP_SLOTS.map(([x, y, r, s], i) => (
          <g key={i} transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}>
            <g ref={(el) => void (leafEls.current[i] = el)} transform="scale(0)">
              <use href="#gq-clump" />
            </g>
          </g>
        ))}
      </g>
      {finale &&
        LEAFLETS.map((l, i) => (
          <g key={i} ref={(el) => void (leafletEls.current[i] = el)} opacity="0">
            <ellipse cx="0" cy="0" rx="6.6" ry="4.6" fill={l.fill} />
            <path d="M-5.5 0L5.5 0" stroke="#34522a" strokeWidth={0.8} />
          </g>
        ))}
      <g filter="url(#gq-paper)">
        {Array.from({ length: pods }, (_, i) => {
          const p = podSlot(i);
          return (
            <g key={i} transform={`translate(${p.x},${p.y}) rotate(${p.r}) scale(${p.s.toFixed(3)})`}>
              <g ref={(el) => void (podSwing.current[i] = el)} transform="scale(0)">
                <path d="M0,0 L0,4" stroke="#5b3f27" strokeWidth={1.6} />
                <path d={POD_D} fill="#c9921e" stroke="#7d5810" strokeWidth={1} />
                {SEEDS.map(([cx, cy, rx, ry]) => (
                  <ellipse key={cy} cx={cx} cy={cy} rx={rx} ry={ry} fill="#e6b84c" />
                ))}
                {/* green until the finale ripens it */}
                <g ref={(el) => void (podGreen.current[i] = el)}>
                  <path d={POD_D} fill="#86a046" stroke="#56702c" strokeWidth={1} />
                  {SEEDS.map(([cx, cy, rx, ry]) => (
                    <ellipse key={cy} cx={cx} cy={cy} rx={rx} ry={ry} fill="#a9c070" />
                  ))}
                </g>
              </g>
            </g>
          );
        })}
      </g>
      <Cat ref={finale ? cat : catRef} pose={pose} reduce={reduce} still={finale} hasPod={bat >= 0} onPodBat={onPodBat} />
    </svg>
  );

  if (finale)
    return (
      <div className={`relative w-full overflow-hidden rounded-tile ${className}`} style={{ aspectRatio: "320 / 264", background: SCENE_BG }}>
        {drawing}
        {root && (
          <div className="pointer-events-none absolute inset-x-0 -translate-y-1/2" style={{ top: "89.4%" }}>
            <RootTiles root={root} size="sm" onSoil />
          </div>
        )}
      </div>
    );

  return (
    // Positioning comes from the caller (e.g. "absolute inset-0"), so classes never conflict.
    <div className={`overflow-hidden [container-type:size] ${className || "relative"}`} style={{ background: SCENE_BG }}>
      {/* A box with the viewBox's proportions, bottom-centred, always as tall as the scene so the
          whole tree shows, canopy included. A short, wide scene gets a smaller tree, and the sky,
          wall and fields, drawn far past the viewBox, fill the sides. A tall, narrow scene zooms
          in up to 1.5× and crops the sides instead. */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{ width: `min(calc(100cqh * ${VB_W} / ${VB_H}), calc(100cqw * 1.5))`, aspectRatio: `${VB_W} / ${VB_H}` }}
      >
        {drawing}
        {root && (
          <div className="absolute inset-x-0 -translate-y-1/2" style={{ top: `${ROOT_TILES_Y * 100}%` }}>
            <RootTiles root={root} size="scene" onSoil />
          </div>
        )}
      </div>
    </div>
  );
}
