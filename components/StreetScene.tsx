"use client";

import { useEffect, useId, useRef, useState } from "react";
import { asset } from "@/lib/site";

/**
 * The street scene below the fold: the painted plate with code-drawn sky, bunting, laundry,
 * butterflies, the bell and pigeons, the lantern, the cat's blinks, ears and tail, and (every
 * second loop) the neighbour watering her geraniums. A 30s loop where everything is a pure
 * function of t, written straight to the SVG inside requestAnimationFrame (no React re-renders).
 * Decorative, so aria-hidden. Reduced motion: frame t = 0, still. Off-screen: the clock pauses.
 * Ported from the Claude Design handoff "Kelma street scene".
 */
type Fmt = "desktop" | "mobile";
type Sprite = { href: string; x: number; y: number; w: number; h: number };
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
  tower: [number, number] | null;
  pig: [[number, number], [number, number]];
  bf: [[number, number], [number, number]];
  bfS: number;
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
  tailPiv: [number, number];
  glass: string;
  lamp: [number, number, number];
  laundry: [number, number, number];
  flags: { si: number; u: number; color: string; i: number }[];
};

const MOBILE_QUERY = "(max-width: 767px)";
const LOOP = 30;
const REWARD_EVERY = 2;
const TIMES = { water: 4.0, bell: 14.0, lamp: [21.5, 28.0] as const };
const FLAG_COLOURS = ["#a8402e", "#f3e7cf", "#2f6f58", "#d8a23a", "#2a5a8c"];
const CLOUD = "M-70 0 C-82 0 -84 -20 -64 -24 C-66 -44 -40 -50 -28 -36 C-22 -60 14 -62 22 -40 C32 -52 58 -48 58 -28 C76 -28 82 0 64 0 Z";
const WING = "M0 -1 C-6 -9 -10 -4 -8 0 C-10 3 -5 6 0 1 Z M0 -1 C6 -9 10 -4 8 0 C10 3 5 6 0 1 Z";
const SUN_RAYS = (() => {
  let d = "";
  const p = (r: number, b: number) => `${(r * Math.cos(b)).toFixed(2)},${(r * Math.sin(b)).toFixed(2)}`;
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    d += `M${p(38, a - 0.12)} L${p(56, a)} L${p(38, a + 0.12)} Z `;
  }
  return d;
})();

const cache: Partial<Record<Fmt, Cfg>> = {};
function cfg(fmt: Fmt): Cfg {
  const hit = cache[fmt];
  if (hit) return hit;
  const sp = (n: string, x: number, y: number, w: number, h: number): Sprite => ({ href: asset(`/media/scene/${fmt}-${n}.png`), x, y, w, h });
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
          bell: [485.5, 108, 1],
          tower: null,
          pig: [
            [500, 92],
            [2000, -40],
          ],
          bf: [
            [757, 548],
            [1160, 545],
          ],
          bfS: 1.1,
          earL: sp("earL", 996, 498, 22, 22),
          earR: sp("earR", 1034, 498, 24, 22),
          tail: sp("tail", 810, 594, 76, 36),
          leafL: sp("leafL", 1260, 448, 38, 119),
          leafR: sp("leafR", 1298, 448, 38, 119),
          pot: sp("pot", 1262, 510, 72, 80),
          win: [1260, 448, 1, 1],
          eyeL: [1014.5, 545.5],
          eyeR: [1038.5, 545.5],
          eyeRad: 8.2,
          tailPiv: [886, 612],
          glass: "1115,234 1138,234 1135,260 1118,260",
          lamp: [1127, 247, 1],
          laundry: [52, 402, 1],
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
          bell: [185, 284, 1.4],
          tower: [185, 381],
          pig: [
            [190, 245],
            [1150, 40],
          ],
          bf: [
            [290, 845],
            [790, 835],
          ],
          bfS: 1.45,
          earL: sp("earL", 582, 762, 28, 28),
          earR: sp("earR", 634, 762, 28, 28),
          tail: sp("tail", 356, 894, 96, 34),
          leafL: sp("leafL", 912, 704, 47, 146),
          leafR: sp("leafR", 959, 704, 46, 146),
          pot: sp("pot", 918, 780, 82, 96),
          win: [912, 704, 93 / 76, 146 / 119],
          eyeL: [607.5, 822.5],
          eyeR: [636.5, 822.5],
          eyeRad: 9.6,
          tailPiv: [452, 911],
          glass: "731,437 760,437 756,470 735,470",
          lamp: [745.5, 453, 1.25],
          laundry: [48, 628, 1.09],
        };
  const flags: Cfg["flags"] = [];
  let ci = 0;
  c.swags.forEach((s, si) => {
    const n = Math.floor((s[2] - s[0]) / c.spacing);
    for (let i = 0; i < n; i++) flags.push({ si, u: (i + 0.5) / n, color: FLAG_COLOURS[ci++ % 5], i: flags.length });
  });
  return (cache[fmt] = { ...c, flags });
}

type Els = Record<string, SVGElement | null>;

/** Writes one frame: t seconds into the loop, `loop` loops in. */
function apply(c: Cfg, el: Els, t: number, loop: number) {
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
  let lid = 0;
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
  S("earL", "transform", `rotate(${(-11 * twitch([9.4, b0 + 1.6, 4.8])).toFixed(2)} ${eL.x + eL.w / 2} ${eL.y + eL.h})`);
  S("earR", "transform", `rotate(${(11 * twitch([b0 + 0.4, 4.6, 26.2])).toFixed(2)} ${eR.x + eR.w / 2} ${eR.y + eR.h})`);
  let ta = 1.1 + 1.1 * wave(7.5);
  [6.5, 15.8, 25.1].forEach((x) => {
    const k = (t - x) / 0.9;
    if (k > 0 && k < 1) ta += 4.5 * Math.sin(Math.PI * k);
  });
  S("tail", "transform", `rotate(${ta.toFixed(2)} ${c.tailPiv[0]} ${c.tailPiv[1]})`);

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
    S("can", "transform", `translate(54,64) rotate(${(-36 * tilt + 1.5 * Math.sin(t * 3) * tilt).toFixed(2)})`);
    const a = (-36 * tilt * Math.PI) / 180,
      tx = 54 + (-18 * Math.cos(a) + 12 * Math.sin(a)),
      ty = 64 + (-18 * Math.sin(a) - 12 * Math.cos(a));
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

export function StreetScene() {
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

  useEffect(() => {
    if (!fmt || !near) return;
    const c = cfg(fmt);
    if (reduced) {
      apply(c, els.current, 0, 0);
      return;
    }
    let raf = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last == null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      if (visible.current) clock.current += dt;
      const T = clock.current;
      apply(c, els.current, T % LOOP, Math.floor(T / LOOP));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fmt, near, reduced]);

  const c = fmt ? cfg(fmt) : null;
  const er = c ? c.eyeRad + 1 : 0;
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
      className="relative aspect-square w-full overflow-hidden bg-bg md:aspect-[1920/720] [mask-image:linear-gradient(to_bottom,transparent,black_9%)]"
    >
      {c && near && (
        <svg key={fmt} viewBox={`0 0 ${c.W} ${c.H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 block size-full">
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
            <clipPath id={`${uid}-eyeL`}>
              <circle cx={c.eyeL[0]} cy={c.eyeL[1]} r={er} />
            </clipPath>
            <clipPath id={`${uid}-eyeR`}>
              <circle cx={c.eyeR[0]} cy={c.eyeR[1]} r={er} />
            </clipPath>
          </defs>

          <image href={asset(`/media/scene/${fmt}-plate.jpg`)} x="0" y="0" width={c.W} height={c.H} />

          <g transform={`translate(${c.sun[0]},${c.sun[1]}) scale(${c.sun[2]})`} filter={url("paper")}>
            <g ref={r("sunRays")}>
              <path d={SUN_RAYS} fill="#f4b44a" />
            </g>
            <g ref={r("sunCore")}>
              <circle r="39" fill="#f0a03c" />
              <circle r="30" fill="#f8c55a" />
            </g>
          </g>

          <g filter={url("paper")}>
            {c.clouds.map((k, i) => (
              <g key={i} ref={r(`cloud${i}`)} transform={`translate(${k[0]},${k[1]}) scale(${k[2]})`}>
                <path d={CLOUD} fill="#fbf2e1" />
              </g>
            ))}
          </g>

          {c.tower && (
            <g transform={`translate(${c.tower[0]},${c.tower[1]})`} filter={url("dist")}>
              <rect x="-21" y="-116" width="42" height="116" fill="#d6a088" />
              <rect x="-24" y="-121" width="48" height="6" fill="#c98f76" />
              <polygon points="-22,-121 0,-150 22,-121" fill="#cf957c" />
              <circle cx="0" cy="-153" r="3" fill="#cf957c" />
              <path d="M-9 -64 L-9 -88 A9 9 0 0 1 9 -88 L9 -64 Z" fill="#a8785f" />
            </g>
          )}
          <g transform={`translate(${c.bell[0]},${c.bell[1]}) scale(${c.bell[2]})`} filter={url("dist")}>
            <rect x="-6" y="-2" width="12" height="2.5" fill="#7d5a45" />
            <g ref={r("bell")}>
              <path d="M-1 0 L1 0 L1 1.5 C4 2 4.5 5 4.6 8 C4.8 10 6 11 6.5 12 L-6.5 12 C-6 11 -4.8 10 -4.6 8 C-4.5 5 -4 2 -1 1.5 Z" fill="#8f6247" />
              <circle cx="0" cy="12.6" r="1.4" fill="#6d4a36" />
            </g>
          </g>

          <g filter={url("paper")}>
            {c.swags.map((_, i) => (
              <path key={`s${i}`} ref={r(`str${i}`)} d="" fill="none" stroke="#3b3024" strokeWidth={c.strW} />
            ))}
            {c.flags.map((f) => (
              <g key={`f${f.i}`} ref={r(`flag${f.i}`)} transform="translate(-100,-100)">
                <polygon points={`${-c.fw / 2},0 ${c.fw / 2},0 0,${c.fh}`} fill={f.color} />
              </g>
            ))}
          </g>

          <g filter={url("paper")}>
            {pigeon("pig1", "#8e8a92", "#7d7982", "#a8a4ac")}
            {pigeon("pig2", "#9a96a0", "#87838c", "#b3afb6")}
          </g>

          <g transform={`translate(${c.laundry[0]},${c.laundry[1]}) scale(${c.laundry[2]})`}>
            <path d="M0 0 Q67.5 10 135 0" fill="none" stroke="#3b3024" strokeWidth={1.2} />
            <g filter={url("paper")}>
              <g transform="translate(27,3.2)">
                <g ref={r("l1")}>
                  <path d="M-13 0 L13 0 L19 7 L14 11 L12 9 L12 30 L-12 30 L-12 9 L-14 11 L-19 7 Z" fill="#f1ead9" />
                  <rect x="-0.6" y="2" width="1.2" height="26" fill="#d6ccb6" />
                  <rect x="-10" y="-2" width="2.5" height="5" fill="#8a6a44" />
                  <rect x="7.5" y="-2" width="2.5" height="5" fill="#8a6a44" />
                </g>
              </g>
              <g transform="translate(64.8,5)">
                <g ref={r("l2")}>
                  <rect x="-12" y="0" width="24" height="34" fill="#d8a23a" />
                  <rect x="-12" y="24" width="24" height="3" fill="#a8402e" />
                  <rect x="-12" y="29" width="24" height="2" fill="#a8402e" />
                  <rect x="-9" y="-2" width="2.5" height="5" fill="#8a6a44" />
                  <rect x="6.5" y="-2" width="2.5" height="5" fill="#8a6a44" />
                </g>
              </g>
              <g transform="translate(99.9,3.9)">
                <g ref={r("l3")}>
                  <path d="M-9 0 L9 0 L13 5 L9 8 L8 7 L8 20 L-8 20 L-8 7 L-9 8 L-13 5 Z" fill="#2f6f58" />
                  <rect x="-7" y="-2" width="2.2" height="4.5" fill="#8a6a44" />
                  <rect x="4.8" y="-2" width="2.2" height="4.5" fill="#8a6a44" />
                </g>
              </g>
              <g transform="translate(121.5,1.8)">
                <g ref={r("l4")}>
                  <path d="M-7 0 L-3 0 L-3 11 L0 13 L0 16 L-7 16 Z" fill="#a8402e" />
                  <path d="M1 0 L5 0 L5 11 L8 13 L8 16 L1 16 Z" fill="#a8402e" />
                  <rect x="-2" y="-2" width="2.2" height="4.5" fill="#8a6a44" />
                </g>
              </g>
            </g>
          </g>

          <g filter={url("paper")}>
            {butterfly("bf1", "#f3d36b")}
            {butterfly("bf2", "#f6efe0")}
          </g>

          <g ref={r("winIn")} transform={`translate(${c.win[0]},${c.win[1]}) scale(${c.win[2]},${c.win[3]})`} style={{ display: "none" }}>
            <rect x="0" y="0" width="76" height="119" fill="#33251a" />
            <rect x="6" y="10" width="64" height="109" fill="#3d2d20" />
            <path d="M0 0H76V8Q72 13 68 8Q64 13 60 8Q56 13 52 8Q48 13 44 8Q40 13 36 8Q32 13 28 8Q24 13 20 8Q16 13 12 8Q8 13 4 8Q2 11 0 8Z" fill="#efe2c6" />
            <g ref={r("nanna")} filter={url("paper")}>
              <path d="M12 119 C12 92 16 70 26 64 Q38 58 50 64 C60 70 64 92 64 119 Z" fill="#2c5f8a" />
              {[
                [22, 82],
                [32, 94],
                [46, 80],
                [55, 98],
                [27, 108],
                [44, 106],
                [37, 76],
              ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="#f3e9d6" />
              ))}
              <rect x="34" y="51" width="8" height="11" fill="#d9a07d" />
              <path d="M30 62 L38 70 L46 62 Q38 58 30 62 Z" fill="#f3e9d6" />
              <circle cx="38" cy="26" r="6" fill="#cbc4b7" />
              <circle cx="38" cy="42" r="12" fill="#e7b18d" />
              <path d="M26 42 C25 30 32 28 38 28 C45 28 51 30 50 42 C48 36 44 33 38 33 C32 33 28 36 26 42 Z" fill="#d6d0c5" />
              <circle cx="33.5" cy="43" r="1.2" fill="#2e2618" />
              <circle cx="42.5" cy="43" r="1.2" fill="#2e2618" />
              <circle cx="30.5" cy="47.5" r="2" fill="#de927c" />
              <circle cx="45.5" cy="47.5" r="2" fill="#de927c" />
              <path d="M35.5 49.5 Q38 51.5 40.5 49.5" fill="none" stroke="#2e2618" strokeWidth={1} />
            </g>
          </g>

          {shutter("leafL", c.leafL)}
          {shutter("leafR", c.leafR)}
          <image href={c.pot.href} x={c.pot.x} y={c.pot.y} width={c.pot.w} height={c.pot.h} />

          <g transform={`translate(${c.win[0]},${c.win[1]}) scale(${c.win[2]},${c.win[3]})`}>
            <g ref={r("canArm")} opacity="0" filter={url("paper")}>
              <path d="M60 80 Q64 68 56 62 L50 66 Q56 70 54 80 Z" fill="#2c5f8a" />
              <g ref={r("can")}>
                <path d="M-2 -2 L-18 -11 L-17.5 -13 L-1 -6 Z" fill="#86a29a" />
                <circle cx="-18" cy="-12" r="2.4" fill="#6f8b83" />
                <rect x="-2" y="-8" width="18" height="12" rx="2" fill="#86a29a" />
                <path d="M2 -8 Q8 -17 14 -8" fill="none" stroke="#5f7b73" strokeWidth={2} />
                <circle cx="1" cy="-1" r="3" fill="#e7b18d" />
              </g>
            </g>
            <g ref={r("drops")} opacity="0">
              {["d1", "d2", "d3", "d4", "d5"].map((k) => (
                <ellipse key={k} ref={r(k)} cx="0" cy="0" rx="0.9" ry="1.8" fill="#8cc3d8" />
              ))}
            </g>
          </g>

          {img("earL", c.earL)}
          {img("earR", c.earR)}
          {img("tail", c.tail)}
          {(["L", "R"] as const).map((s) => {
            const l = lid(s === "L" ? c.eyeL : c.eyeR);
            return (
              <g key={s} clipPath={url(`eye${s}`)}>
                <rect ref={r(`lid${s}`)} x={l.x} y={l.y} width={l.s} height={l.s} fill="#665c4f" transform="scale(1,0)" />
                <rect ref={r(`lash${s}`)} x={l.x} y={l.y} width={l.s} height="1.6" fill="#2e2618" opacity="0" />
              </g>
            );
          })}

          <g ref={r("lamp")} opacity="0">
            <circle cx={c.lamp[0]} cy={c.lamp[1]} r={44 * c.lamp[2]} fill="#ffd66b" opacity="0.14" />
            <circle cx={c.lamp[0]} cy={c.lamp[1]} r={24 * c.lamp[2]} fill="#ffd66b" opacity="0.22" />
            <polygon points={c.glass} fill="#ffc94a" style={{ mixBlendMode: "multiply" }} />
          </g>
        </svg>
      )}
    </div>
  );
}
