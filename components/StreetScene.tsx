"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { asset } from "@/lib/site";
import GEO from "./street-scene-geometry.json";

/**
 * The street scene at the top of the home page, in felt and cut paper: the street (4 depth layers
 * on desktop, one image on phones) with the sun, clouds, bunting and washing over it, the bell and
 * pigeons, butterflies, the lantern, Daisy's blinks, ears and tail, and (every second loop) the
 * neighbour watering her geraniums. The art and the points it is measured at come from
 * scripts/build-street-scene.mjs (street-scene-geometry.json). A 30s loop where everything is a pure
 * function of t, written straight to the SVG inside requestAnimationFrame (no React re-renders).
 * Decorative, so aria-hidden. Reduced motion: frame t = 0, still. Off-screen: the clock pauses.
 * Ported from the Claude Design handoffs "Kelma street scene" and "Kelma street parallax layers".
 */
type Fmt = "desktop" | "mobile";
/** An image placed on the artboard; px, py is the point it turns about (ears, tail). */
type Sprite = { href: string; x: number; y: number; w: number; h: number; px: number; py: number };
type Cfg = {
  W: number;
  H: number;
  sun: [number, number, number];
  clouds: [number, number, number][];
  swags: [number, number, number, number, number][];
  spacing: number;
  fw: number;
  fh: number;
  strW: number;
  bell: [number, number, number];
  pig: [[number, number], [number, number]];
  bf: [[number, number], [number, number]];
  bfS: number;
  daisy: Sprite;
  earL: Sprite;
  earR: Sprite;
  tail: Sprite;
  leafL: Sprite;
  leafR: Sprite;
  pot: Sprite;
  win: [number, number, number, number];
  eyeL: [number, number];
  eyeR: [number, number];
  eyeRad: number;
  glass: string;
  lamp: [number, number, number];
  laundry: [number, number, number];
  flags: { si: number; u: number; i: number }[];
};

const MOBILE_QUERY = "(max-width: 767px)";
const LOOP = 30;
/** The scene redraws at most this often (24 fps). */
const FRAME_MS = 1000 / 24;

/**
 * Desktop parallax (from the Claude Design handoff "Kelma street parallax layers"): the plate is
 * re-cut into sky, far, street and near layers, each stacked as its own element and moved with a
 * CSS transform, so following the mouse costs the compositor, not a repaint. Travel is in artboard
 * px, horizontal (vertical is half); sky and bunting stay still, pigeons move with the far layer.
 */
type LayerName = "sky" | "far" | "bunting" | "pigeons" | "street" | "near";
const DEPTH: Partial<Record<LayerName, number>> = { far: 4, pigeons: 4, street: 8, near: 12 };
/** The desktop view is inset 12px (6px top and bottom) so the near layer's travel never shows an edge. */
const OVERSCAN = 12;
/** Exponential ease towards the pointer: about 95% of the way in 300ms. */
const EASE_TAU = 0.1;
/** Desktop draws the 4 depth layers; phones (no parallax) draw one plate, half the download. */
const plate = (fmt: Fmt, layer: string) => art(fmt === "desktop" ? `street-${layer}` : "street-mobile");
const REWARD_EVERY = 2;
const TIMES = { water: 4.0, bell: 14.0, lamp: [21.5, 28.0] as const };
const WING = "M0 -1 C-6 -9 -10 -4 -8 0 C-10 3 -5 6 0 1 Z M0 -1 C6 -9 10 -4 8 0 C10 3 5 6 0 1 Z";
/** The felt pieces, by file name in public/media/scene/; their height for each unit of width. */
const art = (n: string) => asset(`/media/scene/${n}.webp`);
const RATIO = GEO.pieces;
const place = (n: string, b: number[]): Sprite => ({ href: art(n), x: b[0], y: b[1], w: b[2], h: b[3], px: b[4] ?? 0, py: b[5] ?? 0 });
/** Cloud width before each cloud's own scale; the sun is drawn 120 wide. */
const CLOUD_W = 170;
const SUN_W = 120;
/** The washing on its line (135 long): each piece's middle, width, and where its top edge meets the line. */
const WASH = [
  { x: 22, w: 32, top: 0.106 },
  { x: 56, w: 24, top: 0.183 },
  { x: 89, w: 22, top: 0.215 },
  { x: 116, w: 21, top: 0.199 },
] as const;
/**
 * The neighbour's forearm and watering can, in the window's own units (76 × 119): drawn at x, y,
 * w wide; it turns about the cuff (pivot) to pour, and the water falls from the rose (spout).
 */
const CAN = { x: 23.5, y: 62, w: 44, pivot: [66, 74] as const, spout: [26.6, 69.1] as const, tilt: -26 };
/** The neighbour herself, in the window's units. */
const NANNA = { x: 3, y: 9, w: 70 };

/** Daisy, the neighbour's window and the lantern, where the build measured them. */
function parts(g: (typeof GEO)["desktop"]) {
  return {
    daisy: place("daisy", g.daisy),
    earL: place("daisy-ear-l", g.earL),
    earR: place("daisy-ear-r", g.earR),
    tail: place("daisy-tail", g.tail),
    leafL: place("street-shutter-l", g.leafL),
    leafR: place("street-shutter-r", g.leafR),
    pot: place("street-pot", g.pot),
    win: g.win as Cfg["win"],
    eyeL: g.eyeL as [number, number],
    eyeR: g.eyeR as [number, number],
    eyeRad: g.eyeRad,
    glass: g.glass,
    lamp: g.lamp as Cfg["lamp"],
  };
}

const cache: Partial<Record<Fmt, Cfg>> = {};
function cfg(fmt: Fmt): Cfg {
  const hit = cache[fmt];
  if (hit) return hit;
  const g = GEO[fmt];
  const c: Omit<Cfg, "flags"> =
    fmt === "desktop"
      ? {
          W: 1920,
          H: 720,
          sun: [1272, 98, 1],
          clouds: [
            [180, 100, 0.88],
            [860, 95, 0.75],
            [1490, 120, 0.82],
            [1810, 80, 0.62],
          ],
          swags: [
            [-30, -6, 640, -8, 70],
            [630, -8, 1290, -2, 72],
            [1280, -4, 1960, 6, 66],
          ],
          spacing: 50,
          fw: 28,
          fh: 36,
          strW: 2,
          bell: g.bell as Cfg["bell"],
          pig: [
            [500, 92],
            [2000, -40],
          ],
          bf: [
            [757, 548],
            [1160, 545],
          ],
          bfS: 1.1,
          ...parts(g),
          laundry: [52, 414, 1],
        }
      : {
          W: 1080,
          H: 1080,
          sun: [875, 122, 1.25],
          clouds: [
            [418, 100, 0.74],
            [18, 175, 0.66],
            [1092, 160, 0.6],
          ],
          swags: [[-30, -6, 1110, -6, 86]],
          spacing: 60,
          fw: 36,
          fh: 46,
          strW: 2.4,
          bell: g.bell as Cfg["bell"],
          pig: [
            [52, 300],
            [1150, 40],
          ],
          bf: [
            [290, 845],
            [790, 835],
          ],
          bfS: 1.45,
          ...parts(g),
          laundry: [48, 700, 1.09],
        };
  const flags: Cfg["flags"] = [];
  c.swags.forEach((s, si) => {
    const n = Math.floor((s[2] - s[0]) / c.spacing);
    for (let i = 0; i < n; i++) flags.push({ si, u: (i + 0.5) / n, i: flags.length });
  });
  return (cache[fmt] = { ...c, flags });
}

type Els = Record<string, SVGElement | null>;

/** Writes one frame: t seconds into the loop, `loop` loops in. */
function apply(c: Cfg, el: Els, t: number, loop: number, asleep = false) {
  const reward = loop % REWARD_EVERY === 0;
  const S = (k: string, a: string, v: string) => el[k]?.setAttribute(a, v);
  const cl = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (a: number, b: number) => cl((t - a) / (b - a));
  const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const TAU = Math.PI * 2;
  const wave = (per: number, ph = 0) => Math.sin((TAU * t) / per + ph);

  // bunting
  const sw = c.swags.map((s, si) => {
    const low = s[4] + 3 * wave(6, si * 1.7);
    return { s, cx: (s[0] + s[2]) / 2 + 6 * wave(10, si), cy: 2 * low - (s[1] + s[3]) / 2 };
  });
  sw.forEach((w, si) => S(`str${si}`, "d", `M${w.s[0]} ${w.s[1]} Q${w.cx.toFixed(1)} ${w.cy.toFixed(1)} ${w.s[2]} ${w.s[3]}`));
  c.flags.forEach((f) => {
    const w = sw[f.si],
      u = f.u,
      s = w.s;
    const x = (1 - u) * (1 - u) * s[0] + 2 * u * (1 - u) * w.cx + u * u * s[2];
    const y = (1 - u) * (1 - u) * s[1] + 2 * u * (1 - u) * w.cy + u * u * s[3];
    const dx = 2 * (1 - u) * (w.cx - s[0]) + 2 * u * (s[2] - w.cx),
      dy = 2 * (1 - u) * (w.cy - s[1]) + 2 * u * (s[3] - w.cy);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI + 5 * wave(30 / 6, f.i * 0.45);
    S(`flag${f.i}`, "transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${a.toFixed(2)})`);
  });
  // clouds
  c.clouds.forEach((k, i) =>
    S(`cloud${i}`, "transform", `translate(${(k[0] + 16 * wave(30, i * 2.1)).toFixed(1)},${(k[1] + 1.5 * wave(15, i)).toFixed(1)}) scale(${k[2]})`),
  );
  // sun
  S("sunRays", "transform", `rotate(${t.toFixed(2)})`);
  S("sunCore", "transform", `scale(${(1 + 0.025 * wave(6)).toFixed(4)})`);
  // the lantern switches on with a stutter, glows, then goes off
  const [c0, c1] = TIMES.lamp,
    ss = c.sun[2];
  const cp = seg(c0, c1);
  let lamp = 0;
  if (cp > 0.25 && cp < 0.86) {
    const k = t - (c0 + 0.25 * (c1 - c0));
    lamp = k < 0.08 ? 1 : k < 0.16 ? 0 : k < 0.23 ? 0.8 : k < 0.3 ? 0.1 : 1;
    lamp *= 0.92 + 0.08 * Math.sin(t * 23) * Math.sin(t * 7);
  }
  S("lamp", "opacity", lamp.toFixed(3));
  // bell
  const b0 = TIMES.bell,
    bp = seg(b0, b0 + 3.6);
  const env = bp <= 0 || bp >= 1 ? 0 : bp < 0.12 ? bp / 0.12 : Math.pow(1 - (bp - 0.12) / 0.88, 1.4);
  S("bell", "transform", `rotate(${(28 * env * Math.sin((TAU * (t - b0)) / 1.15)).toFixed(2)})`);
  // pigeons, startled by the bell
  (
    [
      ["pig1", "pig1w", 0.25, 0],
      ["pig2", "pig2w", 0.55, 14],
    ] as const
  ).forEach(([g, wg, d, oy]) => {
    const p = seg(b0 + d, b0 + d + 5.2);
    if (p <= 0 || p >= 1) return S(g, "transform", "translate(-300,-300)");
    const [a, b] = c.pig,
      e = p * p * (3 - 2 * p) * 0.35 + p * 0.65;
    const x = a[0] + (b[0] - a[0]) * e,
      y = a[1] + oy + (b[1] - a[1]) * e - 60 * Math.sin(Math.PI * p) * ss;
    S(g, "transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${ss.toFixed(2)})`);
    S(wg, "transform", `translate(0,-1) scale(1,${Math.cos(TAU * (t * 5.5 + d)).toFixed(3)}) translate(0,1)`);
  });
  // butterflies
  (
    [
      ["bf1", "bf1w", 0],
      ["bf2", "bf2w", 2.4],
    ] as const
  ).forEach(([g, wg, ph], i) => {
    const [x0, y0] = c.bf[i];
    const x = x0 + 30 * Math.sin((TAU * t) / 15 + ph) + 8 * Math.sin((TAU * t) / 5 + ph);
    const y = y0 - 18 + 12 * Math.sin((TAU * t) / 10 + ph * 1.3) + 3 * Math.sin((TAU * t) / 2);
    S(g, "transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    S(wg, "transform", `scale(${(0.25 + 0.75 * Math.abs(Math.sin(TAU * t * 2.6 + ph))).toFixed(3)},1)`);
  });
  // laundry
  ["l1", "l2", "l3", "l4"].forEach((k, i) => S(k, "transform", `rotate(${(3.2 * wave(30 / 8, i * 1.1) + 1.4 * wave(30 / 13, i * 2.3) + 1).toFixed(2)})`));
  // the cat: blinks, ears, tail
  // Once the day's games are done she keeps her eyes shut.
  let lid = asleep ? 1 : 0;
  [3.2, 11.6, 11.98, 20.8, 27.4].forEach((b) => {
    const k = t - b;
    if (k > 0 && k < 0.3) lid = Math.max(lid, k < 0.1 ? k / 0.1 : k < 0.16 ? 1 : 1 - (k - 0.16) / 0.14);
  });
  const er = c.eyeRad + 1,
    ls = er * 2;
  (
    [
      ["lidL", "lashL", c.eyeL],
      ["lidR", "lashR", c.eyeR],
    ] as const
  ).forEach(([lr, la, e]) => {
    const top = e[1] - er;
    S(lr, "transform", `translate(0,${top}) scale(1,${lid.toFixed(3)}) translate(0,${-top})`);
    S(la, "transform", `translate(0,${(lid * ls - 1.6).toFixed(2)})`);
    S(la, "opacity", lid > 0.02 ? "1" : "0");
  });
  const twitch = (times: number[]) => {
    let a = 0;
    times.forEach((x) => {
      const k = (t - x) / 0.38;
      if (k > 0 && k < 1) a += Math.sin(Math.PI * k) * Math.sin(3 * Math.PI * k);
    });
    return a;
  };
  const eL = c.earL,
    eR = c.earR;
  S("earL", "transform", `rotate(${(-11 * twitch([9.4, b0 + 1.6, 4.8])).toFixed(2)} ${eL.px} ${eL.py})`);
  S("earR", "transform", `rotate(${(11 * twitch([b0 + 0.4, 4.6, 26.2])).toFixed(2)} ${eR.px} ${eR.py})`);
  let ta = 1.1 + 1.1 * wave(7.5);
  [6.5, 15.8, 25.1].forEach((x) => {
    const k = (t - x) / 0.9;
    if (k > 0 && k < 1) ta += 4.5 * Math.sin(Math.PI * k);
  });
  // the tip of her tail lifts off the step (it lies to the right of its root, so it turns anticlockwise)
  S("tail", "transform", `rotate(${(-ta).toFixed(2)} ${c.tail.px} ${c.tail.py})`);

  // the neighbour opens the shutters and waters the geraniums
  const ws = TIMES.water,
    wt = t - ws;
  const active = reward && wt > 0 && wt < 6.7;
  const winIn = el.winIn as SVGGElement | null;
  if (winIn) winIn.style.display = active ? "" : "none";
  if (active) {
    const open = io(seg(ws, ws + 0.8)) * (1 - io(seg(ws + 5.8, ws + 6.6)));
    const sxl = 1 - 0.86 * open;
    const L = c.leafL,
      Rr = c.leafR;
    S("leafL", "transform", `translate(${L.x},0) scale(${sxl.toFixed(3)},1) translate(${-L.x},0)`);
    S("leafR", "transform", `translate(${Rr.x + Rr.w},0) scale(${sxl.toFixed(3)},1) translate(${-(Rr.x + Rr.w)},0)`);
    S("leafLd", "opacity", (0.35 * open).toFixed(3));
    S("leafRd", "opacity", (0.35 * open).toFixed(3));
    const nin = io(seg(ws + 0.8, ws + 1.4)) * (1 - io(seg(ws + 5.2, ws + 5.7)));
    S("nanna", "opacity", nin.toFixed(3));
    S("nanna", "transform", `translate(0,${(10 * (1 - nin)).toFixed(2)})`);
    const arm = io(seg(ws + 1.6, ws + 2.1)) * (1 - io(seg(ws + 4.7, ws + 5.1)));
    S("canArm", "opacity", arm.toFixed(3));
    S("canArm", "transform", `translate(0,${(12 * (1 - arm)).toFixed(2)})`);
    const tilt = io(seg(ws + 2.1, ws + 2.5)) * (1 - io(seg(ws + 4.3, ws + 4.7)));
    const [px, py] = CAN.pivot;
    S("can", "transform", `rotate(${(CAN.tilt * tilt + 1.5 * Math.sin(t * 3) * tilt).toFixed(2)} ${px} ${py})`);
    const a = (CAN.tilt * tilt * Math.PI) / 180,
      sx = CAN.spout[0] - px,
      sy = CAN.spout[1] - py,
      tx = px + sx * Math.cos(a) - sy * Math.sin(a),
      ty = py + sx * Math.sin(a) + sy * Math.cos(a);
    const pour = wt > 2.45 && wt < 4.4;
    S("drops", "opacity", pour ? "1" : "0");
    if (pour)
      ["d1", "d2", "d3", "d4", "d5"].forEach((d, i) => {
        const k = (t * 2.4 + i / 5) % 1;
        S(d, "transform", `translate(${(tx + (i % 2 ? 1.2 : -1) * k * 3).toFixed(2)},${(ty + 2 + k * 14).toFixed(2)})`);
        S(d, "opacity", (1 - k * 0.6).toFixed(2));
      });
  } else {
    S("leafL", "transform", "");
    S("leafR", "transform", "");
    S("leafLd", "opacity", "0");
    S("leafRd", "opacity", "0");
    S("canArm", "opacity", "0");
    S("drops", "opacity", "0");
  }
}

export function StreetScene({
  fill = false,
  asleep = false,
  className = "",
}: {
  /**
   * Fill the parent (absolute), cropped from the bottom so the pavement and Daisy always show; the
   * pavement then fades into the page, so the cards standing on it sit on plain beige.
   */
  fill?: boolean;
  /** All of today's games are done: Daisy naps. */
  asleep?: boolean;
  className?: string;
} = {}) {
  const wrap = useRef<HTMLDivElement>(null);
  const els = useRef<Els>({});
  const r = (k: string) => (node: SVGElement | null) => {
    els.current[k] = node;
  };
  const [fmt, setFmt] = useState<Fmt | null>(null);
  const [reduced, setReduced] = useState(false);
  const [near, setNear] = useState(false);
  const visible = useRef(false);
  const clock = useRef(0);
  const layers = useRef<Partial<Record<LayerName, SVGSVGElement | null>>>({});
  const layerRef = (k: LayerName) => (node: SVGSVGElement | null) => {
    layers.current[k] = node;
  };
  /** Pointer target and eased position (each -1…1), and the scene's size on screen. */
  const parallax = useRef({ tx: 0, ty: 0, x: 0, y: 0, w: 0, h: 0 });
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const url = (k: string) => `url(#${uid}-${k})`;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setFmt(mq.matches ? "mobile" : "desktop");
      setReduced(rm.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    rm.addEventListener("change", sync);
    const node = wrap.current;
    // The artwork loads once the scene is near; the clock runs only while it's on screen.
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "300px 0px" });
    const visObs = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { threshold: 0.02 });
    if (node) {
      nearObs.observe(node);
      visObs.observe(node);
    }
    return () => {
      mq.removeEventListener("change", sync);
      rm.removeEventListener("change", sync);
      nearObs.disconnect();
      visObs.disconnect();
    };
  }, []);

  // Mouse only, desktop only, and never with reduced motion; touch never moves the scene.
  const parallaxOn = fmt === "desktop" && !reduced;
  useEffect(() => {
    const node = wrap.current;
    if (!node || !parallaxOn) return;
    const p = parallax.current;
    const size = () => {
      const b = node.getBoundingClientRect();
      p.w = b.width;
      p.h = b.height;
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(node);
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const b = node.getBoundingClientRect();
      p.tx = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width) * 2 - 1));
      p.ty = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height) * 2 - 1));
    };
    const leave = () => {
      p.tx = 0;
      p.ty = 0;
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return () => {
      ro.disconnect();
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      Object.assign(p, { tx: 0, ty: 0, x: 0, y: 0 });
      for (const el of Object.values(layers.current)) if (el) el.style.transform = "";
    };
  }, [parallaxOn]);

  useEffect(() => {
    if (!fmt || !near) return;
    const c = cfg(fmt);
    if (reduced) {
      apply(c, els.current, 0, 0, asleep);
      return;
    }
    // Drawn at 24 fps, and not at all off screen: every moving part carries the paper filter,
    // which the browser re-renders each time it moves, so 60 fps kept phones busy (and warm).
    let raf = 0;
    let last: number | null = null;
    let drawn = -Infinity;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last == null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!visible.current) return;
      clock.current += dt;
      // The parallax eases every frame while it's moving (a transform only, so it's cheap); the
      // drawing itself stays at 24 fps.
      const p = parallax.current;
      if (fmt === "desktop" && (Math.abs(p.tx - p.x) > 1e-4 || Math.abs(p.ty - p.y) > 1e-4)) {
        const k = 1 - Math.exp(-dt / EASE_TAU);
        p.x += (p.tx - p.x) * k;
        p.y += (p.ty - p.y) * k;
        const scale = Math.max(p.w / (c.W - 2 * OVERSCAN), p.h / (c.H - OVERSCAN)); // artboard px -> screen px (slice)
        for (const [name, d] of Object.entries(DEPTH)) {
          const el = layers.current[name as LayerName];
          if (el) el.style.transform = `translate3d(${(-p.x * d * scale).toFixed(2)}px,${(-p.y * d * 0.5 * scale).toFixed(2)}px,0)`;
        }
      }
      if (now - drawn < FRAME_MS) return;
      drawn = now;
      const T = clock.current;
      apply(c, els.current, T % LOOP, Math.floor(T / LOOP), asleep);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fmt, near, reduced, asleep]);

  const c = fmt ? cfg(fmt) : null;
  const er = c ? c.eyeRad + 1 : 0;
  const layerHref = (layer: string) => (fmt ? plate(fmt, layer) : "");
  // Every layer shares one view of the artboard, so they stay in register.
  const svgProps = c && {
    viewBox: fmt === "desktop" ? `${OVERSCAN} ${OVERSCAN / 2} ${c.W - 2 * OVERSCAN} ${c.H - OVERSCAN}` : `0 0 ${c.W} ${c.H}`,
    preserveAspectRatio: fill ? "xMidYMax slice" : "xMidYMid slice",
    className: `absolute inset-0 block size-full${parallaxOn ? " will-change-transform" : ""}`,
  };
  const lid = (e: [number, number]) => ({ x: e[0] - er, y: e[1] - er, s: er * 2 });
  const img = (k: string, s: Sprite) => (
    <g ref={r(k)}>
      <image href={s.href} x={s.x} y={s.y} width={s.w} height={s.h} />
    </g>
  );
  const shutter = (k: "leafL" | "leafR", s: Sprite) => (
    <g ref={r(k)}>
      <image href={s.href} x={s.x} y={s.y} width={s.w} height={s.h} />
      <rect ref={r(`${k}d`)} x={s.x} y={s.y} width={s.w} height={s.h} fill="#1c140c" opacity="0" />
    </g>
  );
  const pigeon = (k: string, body: string, head: string, wing: string) => (
    <g ref={r(k)} transform="translate(-300,-300)">
      <polygon points="-8,-1 -15,-3 -15,2 -8,1.5" fill="#77737b" />
      <ellipse cx="0" cy="0" rx="9" ry="4.5" fill={body} />
      <circle cx="8" cy="-2.5" r="3.2" fill={head} />
      <polygon points="11,-3 14,-2.2 11,-1.4" fill="#d8a23a" />
      <g ref={r(`${k}w`)}>
        <path d="M-4 -1 L4 -1 L-3 -14 Z" fill={wing} />
      </g>
    </g>
  );
  const butterfly = (k: string, fill: string) => (
    <g ref={r(k)} transform="translate(-300,-300)">
      <g transform={`scale(${c?.bfS ?? 1})`}>
        <g ref={r(`${k}w`)}>
          <path d={WING} fill={fill} />
        </g>
        <rect x="-0.8" y="-4" width="1.6" height="8" fill="#5e5139" />
      </g>
    </g>
  );

  return (
    <div
      ref={wrap}
      aria-hidden="true"
      className={`${fill ? "absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_9%,black_80%,transparent)]" : "relative aspect-square w-full md:aspect-[1920/720] [mask-image:linear-gradient(to_bottom,transparent,black_9%)]"} overflow-hidden bg-bg ${className}`}
    >
      {c && near && (
        <Fragment key={fmt}>
          <svg ref={layerRef("sky")} {...svgProps}>
            <defs>
              <filter id={`${uid}-paper`} x="-15%" y="-15%" width="130%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={4} result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" result="d" />
                <feColorMatrix in="d" type="matrix" values="0 0 0 0 0.18  0 0 0 0 0.15  0 0 0 0 0.09  0 0 0 0.3 0" result="sa" />
                <feGaussianBlur in="sa" stdDeviation={1.3} result="sb" />
                <feOffset in="sb" dx={1.5} dy={2.2} result="so" />
                <feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves={1} seed={9} result="g" />
                <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.18  0 0 0 0 0.14  0 0 0 0 0.08  -0.7 0 0 0 0.42" result="g2" />
                <feComposite in="g2" in2="d" operator="in" result="g3" />
                <feMerge>
                  <feMergeNode in="so" />
                  <feMergeNode in="d" />
                  <feMergeNode in="g3" />
                </feMerge>
              </filter>
              <filter id={`${uid}-dist`} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves={1} seed={2} result="g" />
                <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.12  0 0 0 0 0.08  -0.6 0 0 0 0.36" result="g2" />
                <feComposite in="g2" in2="SourceGraphic" operator="in" result="g3" />
                <feMerge>
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode in="g3" />
                </feMerge>
              </filter>
              <clipPath id={`${uid}-win`}>
                <rect x="0" y="0" width="76" height="119" />
              </clipPath>
              <clipPath id={`${uid}-eyeL`}>
                <circle cx={c.eyeL[0]} cy={c.eyeL[1]} r={er} />
              </clipPath>
              <clipPath id={`${uid}-eyeR`}>
                <circle cx={c.eyeR[0]} cy={c.eyeR[1]} r={er} />
              </clipPath>
            </defs>

            {/* desktop: the sky layer of the re-cut; phones: the whole plate in one image (nothing moves there) */}
            <image href={layerHref("1-sky")} x="0" y="0" width={c.W} height={c.H} />

            <g transform={`translate(${c.sun[0]},${c.sun[1]}) scale(${c.sun[2]})`}>
              <g ref={r("sunRays")}>
                <image href={art("sun")} x={-SUN_W / 2} y={(-SUN_W * RATIO.sun) / 2} width={SUN_W} height={SUN_W * RATIO.sun} />
              </g>
              <g ref={r("sunCore")}>
                <image href={art("sun-core")} x={(-SUN_W * RATIO.sunCore) / 2} y={(-SUN_W * RATIO.sunCore) / 2} width={SUN_W * RATIO.sunCore} height={SUN_W * RATIO.sunCore} />
              </g>
            </g>

            {c.clouds.map((k, i) => {
              const n = (i % 3) + 1;
              const h = CLOUD_W * RATIO[`cloud${n}` as "cloud1"];
              return (
                <g key={i} ref={r(`cloud${i}`)} transform={`translate(${k[0]},${k[1]}) scale(${k[2]})`}>
                  <image href={art(`cloud-${n}`)} x={-CLOUD_W / 2} y={-h} width={CLOUD_W} height={h} />
                </g>
              );
            })}
          </svg>
          <svg ref={layerRef("far")} {...svgProps}>
            {fmt === "desktop" && <image href={layerHref("2-far")} x="0" y="0" width={c.W} height={c.H} />}
            <g transform={`translate(${c.bell[0]},${c.bell[1]}) scale(${c.bell[2]})`} filter={url("dist")}>
              <rect x="-6" y="-2" width="12" height="2.5" fill="#7d5a45" />
              <g ref={r("bell")}>
                <path d="M-1 0 L1 0 L1 1.5 C4 2 4.5 5 4.6 8 C4.8 10 6 11 6.5 12 L-6.5 12 C-6 11 -4.8 10 -4.6 8 C-4.5 5 -4 2 -1 1.5 Z" fill="#8f6247" />
                <circle cx="0" cy="12.6" r="1.4" fill="#6d4a36" />
              </g>
            </g>

          </svg>
          <svg ref={layerRef("bunting")} {...svgProps}>
            <g filter={url("paper")}>
              {c.swags.map((_, i) => (
                <path key={`s${i}`} ref={r(`str${i}`)} d="" fill="none" stroke="#3b3024" strokeWidth={c.strW} />
              ))}
            </g>
            {c.flags.map((f) => {
              const n = (f.i % 5) + 1;
              const h = c.fw * RATIO[`flag${n - 1}` as "flag0"];
              // the string runs through the folded hem at the top
              return (
                <g key={`f${f.i}`} ref={r(`flag${f.i}`)} transform="translate(-100,-100)">
                  <image href={art(`flag-${n}`)} x={-c.fw / 2} y={-0.07 * h} width={c.fw} height={h} />
                </g>
              );
            })}

          </svg>
          <svg ref={layerRef("pigeons")} {...svgProps}>
            <g filter={url("paper")}>
              {pigeon("pig1", "#8e8a92", "#7d7982", "#a8a4ac")}
              {pigeon("pig2", "#9a96a0", "#87838c", "#b3afb6")}
            </g>

          </svg>
          <svg ref={layerRef("street")} {...svgProps}>
            {fmt === "desktop" && <image href={layerHref("3-street")} x="0" y="0" width={c.W} height={c.H} />}
            <g transform={`translate(${c.laundry[0]},${c.laundry[1]}) scale(${c.laundry[2]})`}>
              <path d="M0 0 Q67.5 10 135 0" fill="none" stroke="#3b3024" strokeWidth={1.2} />
              {WASH.map((p, i) => {
                const u = p.x / 135;
                const h = p.w * RATIO[`wash${i}` as "wash0"];
                return (
                  <g key={i} transform={`translate(${p.x},${(20 * u * (1 - u)).toFixed(2)})`}>
                    <g ref={r(`l${i + 1}`)}>
                      <image href={art(`wash-${i + 1}`)} x={-p.w / 2} y={-p.top * h} width={p.w} height={h} />
                    </g>
                  </g>
                );
              })}
            </g>

            <g ref={r("winIn")} transform={`translate(${c.win[0]},${c.win[1]}) scale(${c.win[2]},${c.win[3]})`} style={{ display: "none" }}>
              <rect x="0" y="0" width="76" height="119" fill="#33251a" />
              <rect x="6" y="10" width="64" height="109" fill="#3d2d20" />
              {/* she stands back in the room, her face clear of the geraniums; the window frames her */}
              <g clipPath={url("win")}>
                <g ref={r("nanna")}>
                  <image href={art("neighbour")} x={NANNA.x} y={NANNA.y} width={NANNA.w} height={NANNA.w * RATIO.nanna} />
                </g>
              </g>
              <path d="M0 0H76V8Q72 13 68 8Q64 13 60 8Q56 13 52 8Q48 13 44 8Q40 13 36 8Q32 13 28 8Q24 13 20 8Q16 13 12 8Q8 13 4 8Q2 11 0 8Z" fill="#efe2c6" />
            </g>

            {shutter("leafL", c.leafL)}
            {shutter("leafR", c.leafR)}
            <image href={c.pot.href} x={c.pot.x} y={c.pot.y} width={c.pot.w} height={c.pot.h} />

            <g transform={`translate(${c.win[0]},${c.win[1]}) scale(${c.win[2]},${c.win[3]})`}>
              <g ref={r("canArm")} opacity="0">
                <g ref={r("can")}>
                  <image href={art("neighbour-can")} x={CAN.x} y={CAN.y} width={CAN.w} height={CAN.w * RATIO.arm} />
                </g>
              </g>
              <g ref={r("drops")} opacity="0">
                {["d1", "d2", "d3", "d4", "d5"].map((k) => (
                  <ellipse key={k} ref={r(k)} cx="0" cy="0" rx="0.9" ry="1.8" fill="#8cc3d8" />
                ))}
              </g>
            </g>

            <g ref={r("lamp")} opacity="0">
              <circle cx={c.lamp[0]} cy={c.lamp[1]} r={44 * c.lamp[2]} fill="#ffd66b" opacity="0.14" />
              <circle cx={c.lamp[0]} cy={c.lamp[1]} r={24 * c.lamp[2]} fill="#ffd66b" opacity="0.22" />
              <polygon points={c.glass} fill="#ffc94a" style={{ mixBlendMode: "multiply" }} />
            </g>
          </svg>
          <svg ref={layerRef("near")} {...svgProps}>
            {fmt === "desktop" && <image href={layerHref("4-near")} x="0" y="0" width={c.W} height={c.H} />}
            {/* Daisy: her body, then the ears and the tip of her tail that move */}
            <image href={c.daisy.href} x={c.daisy.x} y={c.daisy.y} width={c.daisy.w} height={c.daisy.h} />
            <g filter={url("paper")}>
              {butterfly("bf1", "#f3d36b")}
              {butterfly("bf2", "#f6efe0")}
            </g>

            {img("earL", c.earL)}
            {img("earR", c.earR)}
            {img("tail", c.tail)}
            {(["L", "R"] as const).map((s) => {
              const l = lid(s === "L" ? c.eyeL : c.eyeR);
              return (
                <g key={s} clipPath={url(`eye${s}`)}>
                  <rect ref={r(`lid${s}`)} x={l.x} y={l.y} width={l.s} height={l.s} fill={GEO.fur} transform="scale(1,0)" />
                  <rect ref={r(`lash${s}`)} x={l.x} y={l.y} width={l.s} height="2" fill="#3a2a1f" opacity="0" />
                </g>
              );
            })}

          </svg>
        </Fragment>
      )}
    </div>
  );
}
