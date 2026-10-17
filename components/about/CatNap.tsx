"use client";

import { memo, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import {
  BELL,
  COLLAR,
  EAR_L,
  EAR_R,
  HEAD,
  MOUTH,
  NAP_BACK_PAW,
  NAP_BODY,
  NAP_FRONT_PAW,
  NAP_TAIL,
  NAP_TAIL_CLIPS,
  NAP_TAIL_TIP,
  NOSE_WHISKERS,
} from "../gherq/catSvg";
import { DEFS } from "../gherq/carobSvg";

/**
 * The about page's cat, from the Claude Design file "Kelma Cat Nap" (without its room, so it sits
 * quietly on the page beside the text): she naps on a stack of dictionaries; a gold paper butterfly lands on her ear, she opens one eye to watch it go, sighs
 * and drifts off again. A 12-second loop, as a pure function of time T (seconds). It's the same
 * cat as Għerq's (catSvg.ts). Decorative: aria-hidden.
 */

// The design's four beats (Settle 3s, Visitor 3.5s, Stir 2.5s, Drift 3s) -> start times.
const C = { Settle: 0, Visitor: 3, Stir: 6.5, Drift: 9 };
const LOOP = 12;
const TAU = Math.PI * 2;

const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  out: (t: number) => --t * t * t + 1,
  // a little overshoot, for ears springing back
  pop: (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
};
/** from -> to between two times, eased; held before and after. */
const A = (T: number, from: number, to: number, start: number, end: number, e = ease.inOut) =>
  T <= start ? from : T >= end ? to : from + (to - from) * e((T - start) / (end - start));

// Scene geometry (the design's 1080×1080 frame).
const S = 3;
const CX = 960 + 19 * S;
const CY = 520 + 17 * S;
const toScreen = (x: number, y: number) => [CX + x * S, CY + y * S];
const EAR_TIP = toScreen(39, -131);
const HEAD_AT = toScreen(61, -88);

const Raw = ({ html, ...p }: { html: string; transform?: string }) => <g {...p} dangerouslySetInnerHTML={{ __html: html }} />;

const BOOKS = [
  { x: 560, y: 790, w: 860, h: 110, fill: "#0e6b8c", band: "#e6b84c", r: 0 },
  { x: 615, y: 700, w: 760, h: 90, fill: "#9b3b2a", band: "#e6b84c", r: -0.7 },
  { x: 585, y: 601, w: 820, h: 100, fill: "#4f7a3a", band: "#e4d6b4", r: 0.5 },
  { x: 610, y: 520, w: 780, h: 82, fill: "#c9921e", band: "#2e2618", r: 0 },
];

/** The stack of dictionaries, on a soft shadow (there's no floor). Static. */
const Books = memo(function Books() {
  return (
    <>
      <ellipse cx="990" cy="904" rx="470" ry="14" fill="#2e2618" opacity="0.14" />
      {BOOKS.map((b, i) => {
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        return (
          <g key={i} transform={`rotate(${b.r} ${cx} ${cy})`} filter="url(#kn-sh)">
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill={b.fill} />
            <rect x={b.x} y={b.y} width={b.w} height="7" fill="#000" opacity="0.08" />
            <rect x={b.x + 46} y={b.y} width="7" height={b.h} fill={b.band} />
            <rect x={b.x + 62} y={b.y} width="3" height={b.h} fill={b.band} />
            <rect x={b.x + b.w - 53} y={b.y} width="7" height={b.h} fill={b.band} />
            <rect x={b.x + b.w - 65} y={b.y} width="3" height={b.h} fill={b.band} />
          </g>
        );
      })}
    </>
  );
});

/** The purple bookmark ribbon hanging from the top book; it sways, and swings when her tail flicks. */
function Ribbon({ T }: { T: number }) {
  const sway = Math.sin((T / 3) * TAU) * 3 + A(T, 0, 7, 6.5, 6.9, ease.out) - A(T, 0, 7, 6.9, 8.2);
  const s = sway * 1.6;
  return (
    <path
      d={`M 700 560 C 700 610, ${696 + sway} 650, ${690 + s} 700 L ${676 + s} 716 L ${700 + s} 708 L ${712 + s} 724 L ${708 + s} 700 C ${712 + sway} 650, 716 610, 716 560 Z`}
      fill="#7b46b0"
    />
  );
}

/** One eye in head space: a closed arc, or open by `open` (0–1) with the pupil shifted by `look`. */
function Eye({ cx, open, look }: { cx: number; open: number; look: number }) {
  if (open < 0.04) return <path d={`M${cx - 7} -3Q${cx} 4 ${cx + 7} -3`} fill="none" stroke="#2f2823" strokeWidth="2.4" strokeLinecap="round" />;
  const ry = 5.9 * open;
  const cy = -2 + (1 - open) * 2;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="7.6" ry={ry + 1.2} fill="#2f2823" />
      <ellipse cx={cx} cy={cy} rx="6.6" ry={ry} fill="#c8cc55" />
      <ellipse cx={cx + look} cy={cy} rx="1.7" ry={ry * 0.85} fill="#1c150f" />
      {/* the drowsy upper lid */}
      <path
        d={`M${cx - 7.6} ${cy - ry * 0.2}Q${cx} ${-2 - ry - 2} ${cx + 7.6} ${cy - ry * 0.2}`}
        fill="none"
        stroke="#2f2823"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>
  );
}

function Cat({ T }: { T: number }) {
  const br = (1 - Math.cos((T / 2.4) * TAU)) / 2;
  const sigh = A(T, 0, 1, C.Drift + 0.2, C.Drift + 1.2) - A(T, 0, 1, C.Drift + 1.2, C.Drift + 2.6);
  const breath = br * 0.022 + sigh * 0.03;
  const headY = -br * 1.6 - sigh * 2.5;
  const earL =
    A(T, 0, -24, C.Stir + 0.05, C.Stir + 0.14, ease.out) +
    A(T, 0, 24, C.Stir + 0.14, C.Stir + 0.5, ease.pop) +
    A(T, 0, -12, C.Stir + 0.7, C.Stir + 0.78, ease.out) +
    A(T, 0, 12, C.Stir + 0.78, C.Stir + 1.05, ease.pop);
  const earR = A(T, 0, 10, C.Stir + 0.2, C.Stir + 0.3, ease.out) + A(T, 0, -10, C.Stir + 0.3, C.Stir + 0.6, ease.pop);
  const open = A(T, 0, 0.5, C.Stir + 0.5, C.Stir + 0.9, ease.out) - A(T, 0, 0.5, C.Stir + 1.8, C.Stir + 2.2);
  const look = A(T, 0, -3.2, C.Stir + 0.9, C.Stir + 1.6);
  const headTilt = A(T, 0, -4, C.Stir + 0.6, C.Stir + 1.2) - A(T, 0, -4, C.Stir + 1.9, C.Stir + 2.6);
  const tail = 2 + Math.sin((T / 4) * TAU) * 2.5 + A(T, 0, 12, C.Stir + 0.9, C.Stir + 1.2, ease.out) - A(T, 0, 12, C.Stir + 1.2, C.Stir + 2.0, ease.pop);
  return (
    <g transform={`translate(${CX} ${CY}) scale(${S})`}>
      <ellipse cx="-19" cy="-16" rx="118" ry="4" fill="#5c3016" opacity="0.18" />
      <g transform={`rotate(${tail} -56 -30)`}>
        <Raw html={NAP_TAIL} />
        <Raw html={NAP_TAIL_TIP} />
      </g>
      <g transform={`translate(0 -17) scale(1 ${1 + breath}) translate(0 17)`}>
        <Raw html={NAP_BACK_PAW} />
        <Raw html={NAP_BODY} />
      </g>
      <g transform={`translate(0 ${headY}) rotate(${headTilt} 61 -70)`}>
        <g transform="translate(61 -88)">
          {/* ears pivot at their bases, (44,-100) and (78,-100) in the cat's space */}
          <g transform={`rotate(${earL} -17 -12)`}>
            <Raw html={EAR_L} />
          </g>
          <g transform={`rotate(${earR} 17 -12)`}>
            <Raw html={EAR_R} />
          </g>
          <Raw html={HEAD} />
          <Eye cx={-11} open={0} look={0} />
          <Eye cx={11} open={open} look={look} />
          <Raw html={MOUTH + NOSE_WHISKERS + COLLAR + BELL} />
        </g>
      </g>
      <Raw html={NAP_FRONT_PAW} />
    </g>
  );
}

/** The "z"s drift up while she sleeps, fade while the butterfly visits, and return after. */
function Zzz({ T }: { T: number }) {
  const shown = A(T, 1, 0, C.Visitor + 1.8, C.Visitor + 2.4) + A(T, 0, 1, C.Drift + 0.6, C.Drift + 1.4);
  return (
    <g
      style={{
        fontFamily: "var(--font-display), sans-serif",
        fontWeight: 900,
        fontStretch: "125%",
      }}
      fill="#6d5f45"
    >
      {[0, 1, 2].map((i) => {
        const p = ((T + i) % 3) / 3;
        return (
          <text
            key={i}
            x={HEAD_AT[0] + 70 + p * 70 + Math.sin(p * TAU) * 10}
            y={HEAD_AT[1] - 60 - p * 150}
            fontSize={28 + p * 34}
            opacity={Math.sin(p * Math.PI) * shown}
          >
            z
          </text>
        );
      })}
    </g>
  );
}

/** A gold paper butterfly: flutters in, rests on her ear, lifts off when it twitches. */
function Butterfly({ T }: { T: number }) {
  const land = C.Visitor + 2.6;
  const lift = C.Stir + 0.08;
  let x: number;
  let y: number;
  if (T < land) {
    const k = A(T, 0, 1, C.Visitor, land, ease.out);
    x = 1580 + (EAR_TIP[0] - 1580) * k;
    y = 260 + (EAR_TIP[1] - 8 - 260) * k + Math.sin(T * 5.2) * 46 * (1 - k);
  } else if (T < lift) {
    x = EAR_TIP[0];
    y = EAR_TIP[1] - 8;
  } else {
    const k = A(T, 0, 1, lift, C.Drift + 1.6);
    x = EAR_TIP[0] + (340 - EAR_TIP[0]) * k;
    y = EAR_TIP[1] - 8 - Math.sin(k * Math.PI) * 120 + k * 90 + Math.sin(T * 5.6) * 30 * k;
  }
  const resting = T >= land && T < lift;
  const flap = resting ? 0.55 + 0.35 * Math.sin(T * 2.4) : 0.25 + 0.75 * Math.abs(Math.sin(T * 14));
  const dir = T < lift ? 1 : -1;
  return (
    <g transform={`translate(${x} ${y}) scale(${dir} 1)`} filter="url(#kn-sh)">
      <g transform={`scale(${flap} 1)`}>
        <path d="M0 0 C-10 -34 -40 -40 -44 -18 C-46 -4 -20 2 0 0 Z" fill="#c9921e" />
        <path d="M0 2 C-18 6 -34 16 -26 30 C-18 40 -4 22 0 2 Z" fill="#e6b84c" />
        <path d="M0 0 C10 -34 40 -40 44 -18 C46 -4 20 2 0 0 Z" fill="#c9921e" />
        <path d="M0 2 C18 6 34 16 26 30 C18 40 4 22 0 2 Z" fill="#e6b84c" />
        <circle cx="-26" cy="-18" r="5" fill="#8a6212" />
        <circle cx="26" cy="-18" r="5" fill="#8a6212" />
      </g>
      <rect x="-2.5" y="-14" width="5" height="34" rx="2.5" fill="#2e2618" />
      <path d="M-1 -14 Q-6 -26 -12 -28 M1 -14 Q6 -26 12 -28" stroke="#2e2618" strokeWidth="2" fill="none" />
    </g>
  );
}

/**
 * The clock: loops T through the 12s piece while the scene is on screen and the tab is visible.
 * Reduced motion: no loop, a still frame of her asleep on the books.
 */
function useLoopTime(host: React.RefObject<HTMLElement | null>, still: boolean) {
  const [T, setT] = useState(1.2);
  useEffect(() => {
    if (still) {
      setT(1.2);
      return;
    }
    let raf = 0;
    let onScreen = true;
    let last = performance.now();
    let t = 0;
    let shown = -Infinity;
    // Re-render at most 24 times a second: the motion is slow, and 60 renders a second of the
    // whole drawing kept phones busy (and warm).
    const tick = (now: number) => {
      t = (t + Math.min(0.1, (now - last) / 1000)) % LOOP;
      last = now;
      if (now - shown >= 1000 / 24) {
        shown = now;
        setT(t);
      }
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (onScreen && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      run();
    });
    if (host.current) io.observe(host.current);
    document.addEventListener("visibilitychange", run);
    run();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
    };
  }, [host, still]);
  return T;
}

export function CatNap({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const T = useLoopTime(host, reduce);
  return (
    <div ref={host} aria-hidden className={`relative aspect-[96/86] ${className}`}>
      {/* cropped to the books, the cat and the air above her where the z's and butterfly go */}
      <svg viewBox="520 70 960 860" className="block size-full" focusable="false">
        <defs>
          <filter id="kn-sh" x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow dx="5" dy="7" stdDeviation="2" floodColor="#2e2618" floodOpacity="0.28" />
          </filter>
        </defs>
        {/* the cat's clip paths (shared with Għerq's scene) */}
        <defs dangerouslySetInnerHTML={{ __html: DEFS + NAP_TAIL_CLIPS }} />
        <Books />
        <Ribbon T={T} />
        <g filter="url(#kn-sh)">
          <Cat T={T} />
        </g>
        <Zzz T={T} />
        <Butterfly T={T} />
      </svg>
    </div>
  );
}
