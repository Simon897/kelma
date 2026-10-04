/**
 * The Għerq cat's idle scheduler: one subtle idle at a time, 6–12s apart, never the same idle twice
 * in a row, rare idles about 1 pick in 10. Reactions to the player interrupt whatever is playing.
 * Pure (timers and randomness are injected) so it can be unit-tested.
 */

/** "drowsy": curled back into a nap under the full tree, 30s after five stars. */
export type CatPose = "nap" | "awake" | "happy" | "drowsy";

export type IdleName =
  | "earTwitch"
  | "tailCurl"
  | "stretch"
  | "sunSquint"
  | "blink"
  | "pawLick"
  | "tailSweep"
  | "leafFall"
  | "tailFlick"
  | "smileBlink"
  | "glanceUp"
  | "purr"
  | "podBat";

/** "stir" is the one-off moment at the first star; "earFlick" is every reaction while napping. */
export type ReactionType = "found" | "rare" | "wrong" | "hint" | "stir" | "earFlick";

export interface IdleDef {
  name: IdleName;
  ms: number;
  rare?: boolean;
}

export const IDLE_MIN_MS = 6000;
export const IDLE_MAX_MS = 12000;
export const RARE_CHANCE = 0.1;

export const IDLES: Record<CatPose, IdleDef[]> = {
  nap: [
    { name: "earTwitch", ms: 600 },
    { name: "tailCurl", ms: 1400 },
    { name: "stretch", ms: 2200, rare: true },
    { name: "sunSquint", ms: 2000, rare: true },
  ],
  awake: [
    { name: "blink", ms: 600 },
    { name: "pawLick", ms: 1800 },
    { name: "tailSweep", ms: 2400 },
    { name: "leafFall", ms: 2500, rare: true },
  ],
  happy: [
    { name: "tailFlick", ms: 1500 },
    { name: "smileBlink", ms: 900 },
    { name: "glanceUp", ms: 1400 },
    { name: "purr", ms: 800 },
    { name: "podBat", ms: 2200, rare: true },
  ],
  drowsy: [{ name: "earTwitch", ms: 600 }],
};

export const REACTION_MS: Record<ReactionType, number> = {
  found: 700,
  rare: 900,
  wrong: 700,
  hint: 1200,
  stir: 2200,
  earFlick: 500,
};

export interface Timers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (id: unknown) => void;
}

export interface SchedulerOptions {
  /** The idles allowed right now (depends on the pose, and e.g. whether a pod hangs). */
  idles: () => IdleDef[];
  onIdle: (idle: IdleDef) => void;
  /** An idle or reaction has finished (or was cut short): back to the base pose. */
  onEnd: () => void;
  random?: () => number;
  timers?: Timers;
}

/**
 * Picks the next idle: never `last` (unless it is the only one the pose has), rare ones with
 * RARE_CHANCE (or when nothing else is left).
 */
export function pickIdle(idles: IdleDef[], last: IdleName | null, random: () => number): IdleDef | null {
  const others = idles.filter((i) => i.name !== last);
  const pool = others.length ? others : idles;
  if (!pool.length) return null;
  const rare = pool.filter((i) => i.rare);
  const common = pool.filter((i) => !i.rare);
  const list = rare.length && (!common.length || random() < RARE_CHANCE) ? rare : common;
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

export function createIdleScheduler(opts: SchedulerOptions) {
  const random = opts.random ?? Math.random;
  const timers: Timers = opts.timers ?? { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id as number) };
  const paused = new Set<string>();
  let running = false;
  let timer: unknown = null;
  let busy = false;
  let last: IdleName | null = null;

  const clear = () => {
    if (timer !== null) timers.clear(timer);
    timer = null;
  };
  const active = () => running && paused.size === 0;

  function wait() {
    clear();
    if (!active()) return;
    timer = timers.set(fire, IDLE_MIN_MS + random() * (IDLE_MAX_MS - IDLE_MIN_MS));
  }

  function fire() {
    timer = null;
    if (!active()) return;
    const idle = pickIdle(opts.idles(), last, random);
    if (!idle) return wait();
    last = idle.name;
    busy = true;
    opts.onIdle(idle);
    timer = timers.set(() => {
      timer = null;
      busy = false;
      opts.onEnd();
      wait();
    }, idle.ms);
  }

  /** Cuts a running idle short (it returns to the base pose). */
  function interrupt() {
    clear();
    if (busy) {
      busy = false;
      opts.onEnd();
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      wait();
    },
    stop() {
      running = false;
      interrupt();
    },
    /** Pause for a reason ("hidden", "offscreen"); idles resume when no reason is left. */
    setPaused(reason: string, on: boolean) {
      const was = active();
      if (on) paused.add(reason);
      else paused.delete(reason);
      if (was && !active()) interrupt();
      else if (!was && active()) wait();
    },
    /** A reaction plays for `ms`: any idle stops now, and the next idle waits a full interval after. */
    react(ms: number) {
      interrupt();
      busy = true;
      timer = timers.set(() => {
        timer = null;
        busy = false;
        opts.onEnd();
        wait();
      }, ms);
    },
    /** New pose: drop what's playing, forget the last idle, start a fresh interval. */
    reset() {
      interrupt();
      last = null;
      wait();
    },
    get waiting() {
      return timer !== null && !busy;
    },
    get busy() {
      return busy;
    },
  };
}

export type IdleScheduler = ReturnType<typeof createIdleScheduler>;
