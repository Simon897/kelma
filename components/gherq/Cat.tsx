"use client";

import { motion, useAnimationControls, type TargetAndTransition } from "framer-motion";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import {
  IDLES,
  REACTION_MS,
  createIdleScheduler,
  type CatPose,
  type IdleName,
  type ReactionType,
} from "@/lib/gherq/cat-scheduler";
import {
  AWAKE_TAIL,
  BELL,
  BELL_GLINT,
  CAT_AT,
  COLLAR,
  EAR_L,
  EAR_R,
  EYES_SMILE,
  EYE_CLOSED_L,
  EYE_CLOSED_R,
  HAPPY_FLICK_MARKS,
  HAPPY_TAIL,
  HEAD,
  LEAF,
  MOUTH,
  MOUTH_HAPPY,
  NAP_BACK_PAW,
  NAP_BODY,
  NAP_BOX,
  NAP_FRONT_PAW,
  NAP_HEAD_AT,
  NAP_SHADOW,
  NAP_TAIL,
  NAP_TAIL_CLIPS,
  NAP_TAIL_JOINT,
  NAP_TAIL_TIP,
  NOSE_WHISKERS,
  PAW_L,
  PAW_R,
  PAW_SPLIT,
  SIT_BODY,
  SIT_HEAD_AT,
  SIT_SHADOW,
  eyeOpen,
  pupil,
} from "./catSvg";

/**
 * The Għerq cat. Three drawings from the design (nap, awake, happy) built from separate parts so
 * she can breathe, twitch, blink and react. One action plays at a time: an idle from the scheduler
 * (lib/gherq/cat-scheduler.ts) or a reaction to the player, which interrupts it. Every animation
 * moves transform or opacity only and ends exactly on the base pose. Decorative: aria-hidden.
 */

export type { CatPose };
export type CatReaction = Exclude<ReactionType, "earFlick">;
export interface CatHandle {
  /** React to the player. While napping every reaction is a single ear flick, except "stir". */
  react: (type: CatReaction) => void;
  /** Debug: play one idle now. */
  playIdle: (name: IdleName) => void;
}

const EASE = [0.45, 0, 0.2, 1] as const;
const PARTS = ["root", "body", "head", "earL", "earR", "eyes", "pupils", "tail", "tailTip", "pawL", "pawR", "napFront", "napBack", "bell", "glint", "leaf"] as const;
type Part = (typeof PARTS)[number];
type ActionName = IdleName | ReactionType;
type Moves = Partial<Record<Part, TargetAndTransition>>;
type Action = { name: ActionName; key: number } | null;

const ENTER: Record<"nap" | "awake" | "happy", TargetAndTransition> = {
  nap: { scaleY: 0.92, opacity: 0 },
  awake: { scaleY: 0.82, opacity: 0 },
  happy: { scaleY: 1, opacity: 1 },
};
const SETTLE: Record<"nap" | "awake" | "happy", TargetAndTransition> = {
  nap: { scaleY: [0.92, 1.03, 1], opacity: 1, transition: { duration: 0.4, ease: EASE } },
  awake: { scaleY: [0.82, 1.03, 1], opacity: 1, transition: { duration: 0.4, ease: EASE } },
  happy: { scaleY: [1, 1.08, 1], y: [0, -6, 0], opacity: 1, transition: { duration: 0.45, ease: EASE } },
};
const BREATHE_ON: TargetAndTransition = { scaleY: [1, 1.02, 1], transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } };
const BREATHE_OFF: TargetAndTransition = { scaleY: 1, transition: { duration: 0 } };
const BASE: TargetAndTransition = { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, transition: { duration: 0.2, ease: EASE } };
const HIDDEN: TargetAndTransition = { opacity: 0, transition: { duration: 0.15 } };
const AFTER_SETTLE_MS = 30_000;
/** Where the falling leaf drifts, in scene units: from the canopy to the grass beside her. */
const LEAF_PATH = { x: [234, 226, 238, 229, 236, 236], y: [86, 108, 130, 152, 171, 171], rotate: [0, 40, -20, 30, 0, 0] };

/** A keyframed move: values per key, shared timing. */
const kf = (s: number, frames: Record<string, number[]>, times?: number[]): TargetAndTransition => ({
  ...frames,
  transition: { duration: s, ease: EASE, ...(times ? { times } : {}) },
});

/** The moves for one action, by pose. Parts not listed return to base. */
function movesFor(name: ActionName, pose: CatPose): Moves {
  const napping = pose === "nap" || pose === "drowsy";
  const happy = pose === "happy";
  switch (name) {
    // --- nap ---
    case "earTwitch":
      return { earR: kf(0.6, { rotate: [0, 16, 0, 16, 0] }, [0, 0.2, 0.4, 0.6, 1]) };
    case "earFlick":
      return { earL: kf(0.5, { rotate: [0, -16, 0] }) };
    case "tailCurl":
      return { tailTip: kf(1.4, { rotate: [0, 16, 20, 15, 0] }, [0, 0.3, 0.5, 0.7, 1]) };
    case "stretch": {
      const t = [0, 0.25, 0.7, 1];
      return {
        napFront: kf(2.2, { x: [0, 16, 16, 0] }, t),
        napBack: kf(2.2, { x: [0, 6, 6, 0] }, t),
        head: kf(2.2, { x: [0, 9, 9, 0], y: [0, -2, -2, 0] }, t),
        body: kf(2.2, { scaleX: [1, 1.04, 1.04, 1] }, t),
      };
    }
    case "sunSquint":
      return { head: kf(2, { rotate: [0, -6, -6, 0] }, [0, 0.2, 0.8, 1]) };
    case "stir": {
      const t = [0, 0.15, 0.35, 0.55, 0.78, 1];
      return {
        head: kf(2.2, { y: [0, -12, -12, -12, -12, 0], rotate: [0, -8, 10, -6, 0, 0] }, t),
        earL: kf(2.2, { rotate: [0, -8, 0, -8, 0, 0] }, t),
        earR: kf(2.2, { rotate: [0, 8, 0, 8, 0, 0] }, t),
      };
    }
    // --- awake ---
    case "blink":
      return { eyes: kf(0.6, { scaleY: [1, 0.1, 1] }) };
    case "pawLick": {
      const t = [0, 0.2, 0.4, 0.55, 0.72, 1];
      return {
        pawR: kf(1.8, { y: [0, -56, -52, -56, -52, 0], scaleY: [1, 0.3, 0.3, 0.3, 0.3, 1] }, t),
        head: kf(1.8, { y: [0, 5, 7, 5, 7, 0], rotate: [0, 8, 8, 8, 8, 0] }, t),
      };
    }
    case "tailSweep":
      return { tail: kf(2.4, { rotate: [0, -6, 5, -4, 0] }, [0, 0.25, 0.5, 0.75, 1]) };
    case "leafFall": {
      const t = [0, 0.2, 0.4, 0.6, 0.8, 1];
      return {
        leaf: kf(2.5, { ...LEAF_PATH, opacity: [0, 1, 1, 1, 1, 0] }, t),
        pupils: kf(2.5, { x: [0, -1, -1.5, -2.5, -3, 0], y: [-3, -1.5, 0, 2, 3, 0] }, t),
        head: kf(2.5, { rotate: [0, -4, -2, 2, 4, 0] }, t),
        pawL: kf(2.5, { x: [0, 0, 0, 0, -6, 0], y: [0, 0, 0, 0, -14, 0] }, [0, 0.2, 0.4, 0.7, 0.82, 1]),
      };
    }
    // --- happy ---
    case "tailFlick":
      return { tail: kf(1.5, { rotate: [0, -14, 8, -10, 5, 0] }) };
    case "smileBlink":
      return {};
    case "glanceUp":
      return { head: kf(1.4, { rotate: [0, -7, -7, 0], y: [0, -3, -3, 0] }, [0, 0.25, 0.75, 1]) };
    case "purr": {
      const wiggle = [0, 2, -2, 2, -2, 2, -2, 0];
      return { body: kf(0.8, { x: wiggle }), bell: kf(0.8, { x: wiggle }), glint: kf(0.8, { opacity: [0, 1, 1, 0] }, [0, 0.2, 0.5, 1]) };
    }
    case "podBat": {
      const t = [0, 0.2, 0.4, 0.6, 0.8, 1];
      return {
        root: kf(2.2, { y: [0, -16, -16, -16, -16, 0] }, t),
        pawL: kf(2.2, { rotate: [0, 120, 150, 120, 150, 0] }, t),
      };
    }
    // --- reactions (awake and happy; napping ones become earFlick) ---
    case "found":
      return napping
        ? { earL: kf(0.5, { rotate: [0, -16, 0] }) }
        : {
            earL: kf(0.7, { rotate: [0, -18, 0] }),
            ...(happy ? {} : { head: kf(0.7, { rotate: [0, -7, 0], y: [0, -3, 0] }), pupils: kf(0.7, { x: [0, -2, 0], y: [0, -3, 0] }) }),
          };
    case "rare": {
      const t = [0, 0.15, 0.6, 1];
      return {
        head: kf(0.9, { y: [0, -8, -8, 0] }, t),
        eyes: kf(0.9, { scale: [1, 1.25, 1.25, 1] }, t),
        earL: kf(0.9, { rotate: [0, -6, -6, 0] }, t),
        earR: kf(0.9, { rotate: [0, 6, 6, 0] }, t),
        // the puff: 300ms, then back
        tail: kf(0.9, happy ? { scaleX: [1, 1.3, 1.3, 1] } : { scaleY: [1, 1.3, 1.3, 1] }, [0, 0.1, 0.43, 0.6]),
      };
    }
    case "wrong":
      return { earR: kf(0.7, { rotate: [0, 28, 28, 0] }, [0, 0.2, 0.7, 1]) };
    case "hint":
      return {
        head: kf(1.2, { rotate: [0, -5, 6, 6, 0] }, [0, 0.2, 0.45, 0.8, 1]),
        pupils: kf(1.2, { x: [0, 0, 3, 3, 0] }, [0, 0.2, 0.45, 0.8, 1]),
      };
  }
}

const Raw = ({ html }: { html: string }) => <g dangerouslySetInnerHTML={{ __html: html }} />;

/**
 * A part that the action can move. The pivot is a share of the part's own box (fill-box), or a
 * fixed point in the drawing's own units (`at`) where clipped shapes make the box misleading.
 */
function P({ c, ox = 0.5, oy = 0.5, at, children, initial }: { c: ReturnType<typeof useAnimationControls>; ox?: number; oy?: number; at?: [string, string]; children: ReactNode; initial?: TargetAndTransition }) {
  return (
    <motion.g animate={c} initial={initial} style={at ? { transformBox: "view-box", originX: at[0], originY: at[1] } : { transformBox: "fill-box", originX: ox, originY: oy }}>
      {children}
    </motion.g>
  );
}

type EyeShape = "open" | "closed" | "smile" | "squint";

export function Cat({
  pose: posed,
  reduce,
  hasPod = false,
  onPodBat,
  ref,
}: {
  pose: CatPose;
  reduce: boolean;
  /** A golden pod hangs within reach (for the rare pod-batting idle). */
  hasPod?: boolean;
  onPodBat?: () => void;
  ref?: Ref<CatHandle>;
}) {
  // 30s after five stars she curls back up for a nap under the full tree.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (posed !== "happy") return;
    const id = window.setTimeout(() => setSettled(true), AFTER_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [posed]);
  const pose: CatPose = posed === "happy" && settled ? "drowsy" : posed;

  const controls = {} as Record<Part, ReturnType<typeof useAnimationControls>>;
  for (const p of PARTS) {
    // A fixed list, so the hook order never changes.
    controls[p] = useAnimationControls();
  }

  const [action, setAction] = useState<Action>(null);
  const [shifted, setShifted] = useState(false);
  const [reducedBlink, setReducedBlink] = useState(false);
  const keyRef = useRef(0);
  const poseRef = useRef(pose);
  const hasPodRef = useRef(hasPod);
  const reduceRef = useRef(reduce);
  const onPodBatRef = useRef(onPodBat);
  useEffect(() => {
    poseRef.current = pose;
    hasPodRef.current = hasPod;
    reduceRef.current = reduce;
    onPodBatRef.current = onPodBat;
  });

  const play = useCallback((name: ActionName) => setAction({ name, key: ++keyRef.current }), []);
  const scheduler = useMemo(
    () =>
      createIdleScheduler({
        idles: () => IDLES[poseRef.current].filter((i) => i.name !== "podBat" || hasPodRef.current),
        onIdle: (i) => play(i.name),
        onEnd: () => setAction(null),
      }),
    [play],
  );

  // Idles run only with motion allowed, and pause while the tab is hidden or the scene off-screen.
  useEffect(() => {
    if (reduce) return scheduler.stop();
    scheduler.start();
    return () => scheduler.stop();
  }, [reduce, scheduler]);
  useEffect(() => {
    const sync = () => scheduler.setPaused("hidden", document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [scheduler]);
  const rootEl = useRef<SVGGElement>(null);
  useEffect(() => {
    const el = rootEl.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => scheduler.setPaused("offscreen", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [scheduler]);

  // A new stage: drop what's playing and move her back; entering happy starts with the tail flick.
  const firstPose = useRef(true);
  useEffect(() => {
    setAction(null);
    setShifted(false);
    scheduler.reset();
    if (firstPose.current) {
      firstPose.current = false;
      return;
    }
    if (pose === "happy" && !reduceRef.current) {
      scheduler.react(IDLES.happy[0].ms);
      play("tailFlick");
    }
  }, [pose, play, scheduler]);

  // Reduced motion: no idles, only a very slow blink every 10–15s (an instant swap).
  useEffect(() => {
    if (!reduce) return;
    let id = 0;
    const loop = () => {
      id = window.setTimeout(() => {
        setReducedBlink(true);
        id = window.setTimeout(() => {
          setReducedBlink(false);
          loop();
        }, 300);
      }, 10_000 + Math.random() * 5000);
    };
    loop();
    return () => window.clearTimeout(id);
  }, [reduce]);

  useImperativeHandle(
    ref,
    () => ({
      react(type) {
        if (reduceRef.current) return;
        const p = poseRef.current;
        const t: ReactionType = (p === "nap" || p === "drowsy") && type !== "stir" ? "earFlick" : type;
        scheduler.react(REACTION_MS[t]);
        play(t);
      },
      playIdle(name) {
        const def = Object.values(IDLES)
          .flat()
          .find((i) => i.name === name);
        if (!def) return;
        scheduler.react(def.ms);
        play(name);
      },
    }),
    [play, scheduler],
  );

  // Run the action on every part (parts it doesn't use go back to base), plus its side effects.
  useEffect(() => {
    const moves = action ? movesFor(action.name, poseRef.current) : {};
    for (const p of PARTS) {
      const target = moves[p] ?? (p === "glint" || p === "leaf" ? HIDDEN : BASE);
      void controls[p].start(target);
    }
    if (action?.name === "sunSquint") setShifted(true);
    if (action?.name === "podBat") {
      const id = window.setTimeout(() => onPodBatRef.current?.(), 650);
      return () => window.clearTimeout(id);
    }
    // controls are stable for the component's life
  }, [action]);

  const napping = pose === "nap" || pose === "drowsy";
  const name = action?.name;
  let eyes: EyeShape = napping ? "closed" : pose === "happy" ? "smile" : "open";
  if (name === "stir" || name === "smileBlink") eyes = "open";
  if (name === "sunSquint") eyes = "squint";
  if (reducedBlink && !napping) eyes = "closed";

  const c = controls;
  const head = (
    <P c={c.head} oy={0.9} ox={napping ? 0.4 : 0.5}>
      <P c={c.earL} oy={1}>
        <Raw html={EAR_L} />
      </P>
      <P c={c.earR} oy={1}>
        <Raw html={EAR_R} />
      </P>
      <Raw html={HEAD} />
      <P c={c.eyes}>
        {eyes === "open" && (
          <>
            <Raw html={eyeOpen(-11) + eyeOpen(11)} />
            <P c={c.pupils}>
              <Raw html={pupil(-11) + pupil(11)} />
            </P>
          </>
        )}
        {eyes === "closed" && <Raw html={EYE_CLOSED_L + EYE_CLOSED_R} />}
        {eyes === "smile" && <Raw html={EYES_SMILE} />}
        {eyes === "squint" && (
          <>
            <Raw html={EYE_CLOSED_L} />
            {/* one eye half open towards the sun */}
            <g transform="translate(11 -2) scale(1 0.45) translate(-11 2)">
              <Raw html={eyeOpen(11) + pupil(11)} />
            </g>
          </>
        )}
      </P>
      <Raw html={(pose === "happy" ? MOUTH_HAPPY : MOUTH) + NOSE_WHISKERS + COLLAR} />
      <P c={c.bell}>
        <Raw html={BELL} />
        <P c={c.glint} initial={{ opacity: 0 }}>
          <Raw html={BELL_GLINT} />
        </P>
      </P>
    </P>
  );

  // Pose changes: a short get-up or stretch (instant with reduced motion and on first paint).
  const enter = firstPose.current || reduce ? false : ENTER[napping ? "nap" : pose === "happy" ? "happy" : "awake"];
  const settle = SETTLE[napping ? "nap" : pose === "happy" ? "happy" : "awake"];

  const drawing = napping ? (
    <>
      <Raw html={NAP_SHADOW} />
      <svg {...NAP_BOX} overflow="visible">
        <defs dangerouslySetInnerHTML={{ __html: NAP_TAIL_CLIPS }} />
        <g>
          <Raw html={NAP_TAIL} />
          <P c={c.tailTip} at={NAP_TAIL_JOINT}>
            <Raw html={NAP_TAIL_TIP} />
          </P>
          <P c={c.napBack} ox={0} oy={0.5}>
            <Raw html={NAP_BACK_PAW} />
          </P>
          <Breathe on={!reduce}>
            <P c={c.body} ox={0.3} oy={1}>
              <Raw html={NAP_BODY} />
            </P>
          </Breathe>
          <g transform={NAP_HEAD_AT}>{head}</g>
          <P c={c.napFront} ox={0} oy={0.5}>
            <Raw html={NAP_FRONT_PAW} />
          </P>
        </g>
      </svg>
      {pose === "nap" && <Zzz still={reduce} />}
    </>
  ) : (
    <>
      <Raw html={SIT_SHADOW} />
      {pose === "happy" && (
        <>
          <P c={c.tail} ox={0} oy={1}>
            <Raw html={HAPPY_TAIL} />
          </P>
          <Raw html={HAPPY_FLICK_MARKS} />
        </>
      )}
      <P c={c.body} oy={1}>
        <Raw html={SIT_BODY} />
      </P>
      {pose === "awake" && (
        <P c={c.tail} ox={1} oy={0.5}>
          <Raw html={AWAKE_TAIL} />
        </P>
      )}
      <g transform={SIT_HEAD_AT}>{head}</g>
      <Raw html={PAW_SPLIT} />
      <P c={c.pawL} oy={0}>
        <Raw html={PAW_L} />
      </P>
      <P c={c.pawR} oy={0}>
        <Raw html={PAW_R} />
      </P>
    </>
  );

  return (
    <>
      {/* Under the canopy (from the second stage on) a soft shade covers her. */}
      {pose !== "nap" && <ellipse cx="238" cy="172.5" rx="44" ry="5.5" fill="#3d2a17" opacity="0.13" />}
      <motion.g initial={{ opacity: 0 }} animate={c.leaf}>
        <Raw html={LEAF} />
      </motion.g>
      <g ref={rootEl} filter="url(#gq-sh)" transform={`translate(${CAT_AT.x},${CAT_AT.y}) scale(${CAT_AT.scale})`}>
        {/* the sun squint leaves her 8 units closer to the trunk, until the next stage */}
        <motion.g animate={{ x: shifted ? -30 : 0 }} transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}>
          <P c={c.root} oy={1}>
            <motion.g key={napping ? "nap" : pose} initial={enter} animate={settle} style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}>
              {drawing}
            </motion.g>
          </P>
        </motion.g>
      </g>
    </>
  );
}

/** Breathing: a slow rise and fall of the body (about 3.5s, ±2%). */
function Breathe({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <motion.g
      animate={on ? BREATHE_ON : BREATHE_OFF}
      style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
    >
      {children}
    </motion.g>
  );
}

/** The "z"s: they drift up and fade, each on its own size and timing (static with reduced motion). */
function Zzz({ still }: { still: boolean }) {
  const zs = [
    { x: 80, y: -110, size: 30, dur: 3.4, delay: 0 },
    { x: 104, y: -142, size: 40, dur: 4.1, delay: 1.3 },
    { x: 92, y: -126, size: 24, dur: 3.8, delay: 2.5 },
  ];
  return (
    <g fontFamily="IBM Plex Sans, sans-serif" fontWeight={700} fill="#6d5f45">
      {(still ? zs.slice(0, 2) : zs).map((z, i) => (
        <text
          key={i}
          x={z.x}
          y={z.y}
          fontSize={z.size}
          className={still ? undefined : "gq-z"}
          style={still ? undefined : { animationDuration: `${z.dur}s`, animationDelay: `${z.delay}s` }}
        >
          z
        </text>
      ))}
    </g>
  );
}
