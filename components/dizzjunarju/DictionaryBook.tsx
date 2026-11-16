"use client";

import { Component, createRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { ALPHABET, ARCHAIC_LABEL, FORM_LABEL, FORMS_H, loadEntries, loadForms, paginate, ROW_GAP, OPENER_H, searchExact, wantsRelated, type Entry, type ExactResult, type Layout, type PageRow } from "@/lib/dizzjunarju-book";
import { loadRelated } from "@/lib/dizzjunarju-related";
import type { Dict } from "@/lib/i18n";
import { CatLogo } from "../CatLogo";

/**
 * The Dizzjunarju as a book: pages that turn, letter tabs, a search that riffles to the word.
 *
 * Wide screens show the open book (two pages), scaled down to fit. Narrow ones show one page at a
 * time, sized to the screen. Everything that moves is driven by one requestAnimationFrame loop
 * (`kick`), which re-renders while a page is turning and stops when nothing is.
 */

const INK = "var(--color-ink)";
const SOFT = "var(--color-ink-soft)";
const PAPER = "var(--color-limestone-50)";
const SEA = "var(--color-sea)";
const SERIF = "var(--font-plex-serif), Georgia, serif";
const ink = (a: number) => `rgb(46 38 24 / ${a.toFixed(3)})`;
const PAGE_EDGES = "repeating-linear-gradient(to right, var(--color-limestone-100) 0px, var(--color-limestone-100) 2px, var(--color-limestone-400) 2px, var(--color-limestone-400) 3px)";
const PAPER_GRAIN = `repeating-linear-gradient(92deg, ${ink(0.02)} 0px, ${ink(0.02)} 1px, transparent 1px, transparent 3px), repeating-linear-gradient(2deg, ${ink(0.015)} 0px, ${ink(0.015)} 1px, transparent 1px, transparent 5px)`;
const curl = (to: string) => `linear-gradient(to ${to}, var(--color-limestone-50) 0%, var(--color-limestone-100) 46%, ${ink(0.4)} 50%, var(--color-limestone-300) 52%, var(--color-limestone-200) 100%)`;
const display: CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 900, fontStretch: "125%", fontVariationSettings: '"wdth" 125', textTransform: "uppercase", letterSpacing: "0.01em" };
const SEA_DEEP = "var(--color-sea-deep)";

/**
 * The opening: the closed book rests, the cover lifts to upright, comes down on the left as the
 * first page, and the whole book slides to the centre. Times in ms; the slide starts when the
 * cover is upright. From the design prototype "Dizzjunarju opening animation".
 */
const OPENING = { pause: 500, lift: 700, land: 800, slide: 800, reducedFade: 250, tabs: 320 };
/** The lift and land curves meet at the same speed, so the cover keeps its pace as it passes upright. */
const EASE_LIFT = bezier(0.5, 0, 0.75, 0.5);
const EASE_LAND = bezier(0.25, 0.5, 0.5, 1);
const EASE_SLIDE = bezier(0.45, 0, 0.2, 1);

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of time 0..1. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** How the book is drawn for the space it has. */
interface Geo {
  /** one page at a time (narrow screens) */
  single: boolean;
  /** page width and height, px before scaling */
  W: number;
  H: number;
  /** side padding inside a page */
  pad: number;
  /** the open book is scaled down to fit; a single page never is */
  scale: number;
}
/** The open book with its arrows, at full size. */
const FULL_WIDTH = 1260;
/** Below this the open book would be scaled under about 70%, too small to read: show one page instead. */
const SINGLE_BELOW = 900;
/**
 * One page at a time: what the page takes up besides the book's own page, so the whole thing
 * (header, search, letters, book, arrows) fits a phone screen without scrolling. Header 56, search
 * 48, letters 52, arrows 48, the cover's edge 16, gaps and padding 50.
 */
const SINGLE_CHROME = 270;

interface Flip {
  from: number;
  to: number;
  dir: 1 | -1;
  t0: number;
  dur: number;
  p0: number;
  p1: number;
  /** held by the pointer at dragP */
  drag?: boolean;
  dragP: number;
  /** one of several pages riffling past on the way to a word */
  riffle?: boolean;
}
interface Sheet {
  key: string;
  /** page index, or "cover" */
  page: number | "cover";
  left: number;
  origin: string;
  transform: string;
  z: number;
  opacity: number;
  shade: string;
  blur: boolean;
  right: boolean;
  /** how much of the fold shadow at the spine shows (it fades in as the book opens) */
  fold?: number;
}
type Zone = "tr" | "br" | "tl" | "bl" | null;

export class DictionaryBook extends Component<{ d: Dict }, { tick: number }> {
  state = { tick: 0 };

  private box = createRef<HTMLDivElement>();
  private probe = createRef<HTMLSpanElement>();
  private ents: Entry[] | null = null;
  private layout: Layout | null = null;
  private geo: Geo = { single: false, W: 520, H: 760, pad: 38, scale: 1 };
  private boxWidth = 0;
  private fontProbe = 0;
  private mounted = false;

  /** which view (spread, or page when single) is open */
  private cur = 0;
  /** 0 while the book is closed or opening, 1 once it lies open */
  private o = 0;
  /** when the opening started playing; null before it starts and after it ends */
  private openT0: number | null = null;
  private flips: Flip[] = [];
  private hl: { i: number; t0?: number; fixed?: boolean } | null = null;
  private pendHl: number | null = null;
  private hint: Zone = null;
  private drag: { f: Flip; dir: 1 | -1 } | null = null;
  private fadeT0: number | null = null;
  private swipe: { x: number; y: number } | null = null;
  private raf = 0;
  private reducedMotion = false;
  private observer: ResizeObserver | null = null;

  private q = "";
  private sugOpen = false;
  private sugIdx = 0;
  private exact: ExactResult = { raw: "", hits: [], isMaltese: false, malteseTop: false, via: {} };
  private related: { q: string; ids: number[] } | null = null;
  private relatedState: "idle" | "loading" | "ready" | "off" = "idle";
  private relatedWait: string | null = null;
  private relatedTimer: ReturnType<typeof setTimeout> | undefined;

  /* ---------- setup ---------- */

  componentDidMount() {
    this.mounted = true;
    try {
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {}
    this.measureBox();
    if (typeof ResizeObserver !== "undefined" && this.box.current) {
      this.observer = new ResizeObserver(() => this.measureBox());
      this.observer.observe(this.box.current);
    }
    loadEntries().then((ents) => {
      if (!this.mounted) return;
      this.ents = ents;
      this.relayout();
      this.open();
      // Plurals, feminines and verb forms become searchable once their file arrives.
      loadForms(ents).then(() => {
        if (!this.mounted || !this.q) return;
        this.exact = searchExact(ents, this.q);
        this.redraw();
      });
    });
    // The page was laid out with whatever font was ready; lay it out again once the real one is.
    const again = () => this.mounted && this.fontWidth() !== this.fontProbe && this.relayout();
    try {
      document.fonts?.ready.then(again, again);
    } catch {}
  }

  componentWillUnmount() {
    this.mounted = false;
    this.observer?.disconnect();
    if (this.raf) cancelAnimationFrame(this.raf);
    clearTimeout(this.relatedTimer);
  }

  private redraw() {
    if (this.mounted) this.setState({ tick: performance.now() });
  }

  /** Sizes the book for the space it has. A change of page size means new page breaks. */
  private measureBox() {
    const w = this.box.current?.clientWidth ?? 0;
    if (!w || w === this.boxWidth) return;
    this.boxWidth = w;
    const was = this.geo;
    if (w >= SINGLE_BELOW) this.geo = { single: false, W: 520, H: 760, pad: 38, scale: Math.min(1, w / FULL_WIDTH) };
    else {
      const W = Math.min(520, w - 44);
      this.geo = { single: true, W, H: Math.max(300, Math.min(760, window.innerHeight - SINGLE_CHROME)), pad: W < 440 ? 22 : 38, scale: 1 };
    }
    if (was.single !== this.geo.single || was.W !== this.geo.W || was.H !== this.geo.H) this.relayout();
    else this.redraw();
  }

  private measurer(): (s: string) => number {
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = document.createElement("canvas").getContext("2d");
      const family = this.probe.current ? getComputedStyle(this.probe.current).fontFamily : "system-ui, sans-serif";
      if (ctx) ctx.font = `15px ${family}`;
    } catch {}
    return (s) => (ctx ? ctx.measureText(s).width : s.length * 7.6);
  }
  private fontWidth(): number {
    return this.measurer()("abcdefghijklmnopqrstuvwxyz ċġħż;,.");
  }

  /** Breaks the entries into pages for the current page size, keeping the reader on the same word. */
  private relayout() {
    if (!this.ents) return;
    const { single, W, H, pad } = this.geo;
    const first = this.firstEntryInView();
    this.fontProbe = this.fontWidth();
    this.layout = paginate(this.ents, { lineWidth: W - 2 * pad - 4, rowsHeight: H - 100, perView: single ? 1 : 2 }, this.measurer());
    this.flips = [];
    this.drag = null;
    this.cur = first != null ? this.viewOf(first) : Math.min(this.cur, this.views() - 1);
    this.redraw();
  }
  private per() {
    return this.geo.single ? 1 : 2;
  }
  private views() {
    return this.layout ? this.layout.pages.length / this.per() : 1;
  }
  private viewOf(entry: number) {
    return Math.floor(this.layout!.wordPage[entry] / this.per());
  }
  private firstEntryInView(): number | null {
    if (!this.layout) return null;
    for (let p = this.cur * this.per(); p < (this.cur + 1) * this.per(); p++) {
      const row = this.layout.pages[p]?.rows.find((r) => r.kind === "entry");
      if (row && row.kind === "entry") return row.i;
    }
    return null;
  }

  /** Plays the opening, every time the page is visited. */
  private open() {
    if (this.o >= 1) return;
    this.openT0 = performance.now();
    this.kick();
  }
  private openingLength() {
    return OPENING.pause + (this.reducedMotion ? OPENING.reducedFade : OPENING.lift + Math.max(OPENING.land, this.geo.single ? 0 : OPENING.slide));
  }
  /** Where the opening has got to. Before it starts, everything is at its closed position. */
  private opening(now: number) {
    const t = this.openT0 == null ? -1 : now - this.openT0 - OPENING.pause;
    const reduced = this.reducedMotion;
    const liftT = reduced ? 0 : clamp01(t / OPENING.lift);
    const landT = reduced ? 0 : clamp01((t - OPENING.lift) / OPENING.land);
    const tabsT = clamp01((t - (reduced ? 0 : OPENING.lift + OPENING.land - 200)) / (reduced ? OPENING.reducedFade : OPENING.tabs));
    return {
      reduced,
      /** reduced motion: the closed cover cross-fades to the open book */
      fade: reduced ? clamp01(t / OPENING.reducedFade) : 0,
      liftT,
      landT,
      /** the front of the cover, 0 flat to 1 upright */
      lift: EASE_LIFT(liftT),
      /** the inside of the cover coming down, 0 upright to 1 flat */
      land: EASE_LAND(landT),
      /** the book moving from where it lay closed to the centre */
      slide: reduced ? 1 : EASE_SLIDE(clamp01((t - OPENING.lift) / OPENING.slide)),
      /** the whole swing, for the shadow it throws */
      swing: reduced ? 0 : clamp01(t / (OPENING.lift + OPENING.land)),
      tabs: reduced ? tabsT : 1 - Math.pow(1 - tabsT, 2),
    };
  }

  /* ---------- animation ---------- */

  private ease(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  private progress(f: Flip, now: number) {
    if (f.drag) return f.dragP;
    const t = Math.max(0, Math.min(1, (now - f.t0) / f.dur));
    return f.p0 + (f.p1 - f.p0) * this.ease(t);
  }

  private kick() {
    if (this.raf) return;
    const step = () => {
      this.raf = 0;
      const now = performance.now();
      let active = false;
      if (this.openT0 != null) {
        if (now - this.openT0 >= this.openingLength()) {
          this.o = 1;
          this.openT0 = null;
        } else active = true;
      }
      for (let k = this.flips.length - 1; k >= 0; k--) {
        const f = this.flips[k];
        if (!f.drag && now >= f.t0 + f.dur) {
          if (f.p1 === 0) this.cur = f.from; // a dragged corner let go before halfway: the page falls back
          this.flips.splice(k, 1);
        }
      }
      if (this.flips.length) active = true;
      else if (this.pendHl != null) {
        this.hl = { i: this.pendHl, t0: now };
        this.pendHl = null;
      }
      if (this.hl?.t0 != null && now - this.hl.t0 < 1800) active = true;
      if (this.fadeT0 != null) {
        if (now - this.fadeT0 >= 260) this.fadeT0 = null;
        else active = true;
      }
      this.redraw();
      if (active && this.mounted) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private clearMarks() {
    this.hint = null;
    this.hl = null;
    this.pendHl = null;
  }
  private flip(from: number, to: number, dir: 1 | -1, t0: number, dur: number, riffle = false): Flip {
    return { from, to, dir, t0, dur, p0: 0, p1: 1, dragP: 0, riffle };
  }

  private turn(dir: 1 | -1) {
    if (this.o < 1 || !this.layout) return;
    const target = this.cur + dir;
    if (target < 0 || target > this.views() - 1) return;
    const now = performance.now();
    this.clearMarks();
    if (this.reducedMotion) {
      this.flips = [];
      this.cur = target;
      this.fadeT0 = now;
      this.kick();
      return;
    }
    if (this.flips.length && this.flips[0].dir !== dir) this.flips = [];
    this.flips.push(this.flip(this.cur, target, dir, now, 560));
    this.cur = target;
    this.kick();
  }

  /** Goes to a view, riffling through the pages in between, then marks the entry asked for. */
  private jump(target: number, highlight: number | null) {
    if (!this.layout) return;
    if (this.o < 1) {
      // Searching or jumping while the cover is still opening: skip the rest of it.
      this.o = 1;
      this.openT0 = null;
    }
    target = Math.max(0, Math.min(this.views() - 1, target));
    const now = performance.now();
    const d = target - this.cur;
    this.clearMarks();
    if (this.reducedMotion) {
      this.flips = [];
      this.cur = target;
      this.fadeT0 = now;
      if (highlight != null) this.hl = { i: highlight, fixed: true };
      this.kick();
      return;
    }
    if (d === 0) {
      if (highlight != null) {
        this.flips = [];
        this.hl = { i: highlight, t0: now };
      }
      this.kick();
      return;
    }
    this.pendHl = highlight;
    const dir = d > 0 ? 1 : -1;
    this.flips = [];
    if (Math.abs(d) <= 1) this.flips.push(this.flip(this.cur, target, dir, now, 560));
    else {
      const n = Math.min(6, Math.abs(d));
      let prev = this.cur;
      for (let k = 1; k <= n; k++) {
        const to = Math.round(this.cur + (d * k) / n);
        if (to !== prev) {
          this.flips.push(this.flip(prev, to, dir, now + (k - 1) * 75, 330, true));
          prev = to;
        }
      }
    }
    this.cur = target;
    this.kick();
  }

  private pickWord(i: number) {
    if (!this.ents) return;
    this.setQuery(this.ents[i].w, false);
    this.jump(this.viewOf(i), i);
    this.redraw();
  }

  /* ---------- dragging a page corner (open book), swiping (single page) ---------- */

  private zone(e: PointerEvent<HTMLDivElement>): { x: number; z: Zone } {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    let z: Zone = null;
    if (y < 0.16 || y > 0.84) {
      if (x > 0.885 && x <= 1) z = y < 0.5 ? "tr" : "br";
      else if (x < 0.115 && x >= 0) z = y < 0.5 ? "tl" : "bl";
    }
    return { x, z };
  }
  private dragProgress(x: number, dir: 1 | -1) {
    const c = Math.max(-1, Math.min(1, dir > 0 ? 2 * x - 1 : 1 - 2 * x));
    return Math.acos(c) / Math.PI;
  }
  private onDown = (e: PointerEvent<HTMLDivElement>) => {
    this.closeSuggestions();
    if (this.geo.single) {
      this.swipe = { x: e.clientX, y: e.clientY };
      return;
    }
    if (this.o < 1 || this.reducedMotion) return;
    const h = this.zone(e);
    if (!h.z) return;
    const dir = h.z[1] === "r" ? 1 : -1;
    const target = this.cur + dir;
    if (target < 0 || target > this.views() - 1) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    this.flips = [];
    this.clearMarks();
    const f: Flip = { from: this.cur, to: target, dir, t0: 0, dur: 0, p0: 0, p1: 1, drag: true, dragP: this.dragProgress(h.x, dir) };
    this.flips.push(f);
    this.cur = target;
    this.drag = { f, dir };
    this.kick();
  };
  private onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (this.geo.single) return;
    const h = this.zone(e);
    if (this.drag) {
      this.drag.f.dragP = this.dragProgress(h.x, this.drag.dir);
      return;
    }
    let z = h.z;
    if (this.o < 1 || this.flips.length || this.reducedMotion) z = null;
    if (z && z[1] === "r" && this.cur >= this.views() - 1) z = null;
    if (z && z[1] === "l" && this.cur <= 0) z = null;
    if (z !== this.hint) {
      this.hint = z;
      this.redraw();
    }
  };
  private onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (this.swipe) {
      const dx = e.clientX - this.swipe.x;
      const dy = e.clientY - this.swipe.y;
      this.swipe = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) this.turn(dx < 0 ? 1 : -1);
      return;
    }
    if (!this.drag) return;
    const f = this.drag.f;
    this.drag = null;
    const p = f.dragP;
    f.drag = false;
    f.p0 = p;
    f.p1 = p > 0.5 ? 1 : 0;
    f.t0 = performance.now();
    f.dur = 160 + 400 * Math.abs(f.p1 - p);
    this.kick();
  };
  private onLeave = () => {
    this.swipe = null;
    if (this.drag || !this.hint) return;
    this.hint = null;
    this.redraw();
  };

  /* ---------- search ---------- */

  private setQuery(q: string, open: boolean) {
    this.q = q;
    this.sugOpen = open;
    this.sugIdx = 0;
    this.exact = this.ents ? searchExact(this.ents, q) : { raw: "", hits: [], isMaltese: false, malteseTop: false, via: {} };
    if (open && wantsRelated(this.exact) && this.related?.q !== this.exact.raw && this.relatedState !== "off") this.wantRelated(this.exact.raw);
  }
  private closeSuggestions() {
    if (!this.sugOpen) return;
    this.sugOpen = false;
    this.redraw();
  }
  /** Related words wait for a pause in typing; the first one also waits for the model to download. */
  private wantRelated(raw: string) {
    this.relatedWait = raw;
    clearTimeout(this.relatedTimer);
    this.relatedTimer = setTimeout(async () => {
      try {
        if (this.relatedState === "idle") {
          this.relatedState = "loading";
          this.redraw();
        }
        const engine = await loadRelated(this.ents!);
        this.relatedState = "ready";
        const ids = await engine.search(raw);
        if (this.relatedWait === raw) this.related = { q: raw, ids };
      } catch (e) {
        this.relatedState = "off";
        console.warn("[dizzjunarju] related words are off:", e);
      }
      if (this.relatedWait === raw) this.relatedWait = null;
      this.redraw();
    }, 350);
  }
  /** What the dropdown shows: direct matches, then related words that aren't already there. */
  private results() {
    const exact = this.exact.hits;
    let related: number[] = [];
    let head = "";
    if (wantsRelated(this.exact)) {
      if (this.related?.q === this.exact.raw) {
        related = this.related.ids.filter((i) => !exact.includes(i)).slice(0, 4);
        if (related.length) head = this.props.d.dictRelated;
      } else if (this.relatedState === "loading") head = this.props.d.dictRelatedLoading;
    }
    return { exact, related, head, all: [...exact, ...related] };
  }

  private onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === "INPUT") {
      const all = this.results().all;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.sugIdx = Math.min(all.length - 1, this.sugIdx + 1);
        this.redraw();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.sugIdx = Math.max(0, this.sugIdx - 1);
        this.redraw();
      } else if (e.key === "Enter") {
        if (all.length) {
          e.preventDefault();
          this.pickWord(all[Math.min(this.sugIdx, all.length - 1)]);
        }
      } else if (e.key === "Escape") this.closeSuggestions();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      this.turn(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.turn(-1);
    }
  };

  /* ---------- drawing ---------- */

  /** Light across a page as it lifts. */
  private light(onRight: boolean, s: number) {
    if (s < 0.01) return "none";
    return `linear-gradient(${onRight ? "to right" : "to left"}, ${ink(0.3 * s)} 0%, ${ink(0.08 * s)} 45%, rgb(255 255 255 / ${(0.55 * s).toFixed(3)}) 78%, ${ink(0.14 * s)} 100%)`;
  }
  /** The shadow a lifted page throws on the page under it. */
  private cast(onRight: boolean, angle: number | null) {
    if (angle == null) return "none";
    const rad = (angle * Math.PI) / 180;
    const d = this.geo.W * Math.cos(rad);
    return `linear-gradient(${onRight ? "to right" : "to left"}, ${ink(0)} ${Math.max(0, d - 8).toFixed(1)}px, ${ink(0.28 * Math.sin(rad))} ${d.toFixed(1)}px, ${ink(0)} ${(d + 120).toFixed(1)}px)`;
  }

  /** Every sheet to draw this frame: the pages lying flat, then any in the air. */
  private sheets(now: number): Sheet[] {
    const { single, W } = this.geo;
    const flat = (page: number | "cover", right: boolean, over: Partial<Sheet> = {}): Sheet => ({
      key: `flat-${page}`,
      page,
      right,
      left: right && !single ? W : 0,
      origin: "center center",
      transform: "none",
      z: 1,
      opacity: 1,
      shade: "none",
      blur: false,
      ...over,
    });
    const fl = this.flips.map((f) => ({ f, p: this.progress(f, now) }));
    const fade = this.fadeT0 != null ? Math.max(0.05, Math.min(1, (now - this.fadeT0) / 260)) : 1;
    const out: Sheet[] = [];

    if (single) {
      // One page: a turning page swings away about its left edge and fades as it goes.
      const forward = !fl.length || fl[0].f.dir > 0;
      const base = !fl.length ? this.cur : forward ? fl[fl.length - 1].f.to : fl[0].f.from;
      let lowest: number | null = null;
      const leaves = fl.map((x, k) => {
        const p = forward ? x.p : 1 - x.p;
        const a = 100 * p;
        if (a > 0.5 && (lowest == null || a < lowest)) lowest = a;
        return flat(forward ? x.f.from : x.f.to, true, {
          key: `leaf-${k}`,
          origin: "left center",
          transform: `rotateY(${(-a).toFixed(2)}deg)`,
          z: forward ? 200 - k : 200 + k,
          opacity: 1 - Math.max(0, (p - 0.55) / 0.45),
          shade: this.light(true, Math.sin((Math.min(a, 90) * Math.PI) / 180)),
          blur: !!x.f.riffle,
        });
      });
      out.push(flat(base, true, { opacity: fade, shade: this.cast(true, lowest) }), ...leaves);
      return out;
    }

    let L = this.cur * 2;
    let R = this.cur * 2 + 1;
    if (fl.length) {
      if (fl[0].f.dir > 0) {
        L = fl[0].f.from * 2;
        R = fl[fl.length - 1].f.to * 2 + 1;
      } else {
        R = fl[0].f.from * 2 + 1;
        L = fl[fl.length - 1].f.to * 2;
      }
    }
    let rs: number | null = null;
    let ls: number | null = null;
    const leaves = fl.map((x, k) => {
      const th = 180 * x.p;
      const front = th < 90;
      const a = front ? th : 180 - th;
      const fwd = x.f.dir > 0;
      const onRight = fwd === front;
      const page = fwd ? (front ? x.f.from * 2 + 1 : x.f.to * 2) : front ? x.f.from * 2 : x.f.to * 2 + 1;
      if (a > 0.5) {
        if (onRight) rs = rs == null || a < rs ? a : rs;
        else ls = ls == null || a < ls ? a : ls;
      }
      const last = k === fl.length - 1;
      return flat(page, page % 2 === 1, {
        key: `leaf-${k}`,
        left: onRight ? W : 0,
        origin: onRight ? "left center" : "right center",
        transform: `rotateY(${(onRight ? -a : a).toFixed(2)}deg)`,
        z: front ? 200 - k : 200 + k,
        shade: this.light(onRight, Math.sin((a * Math.PI) / 180)),
        blur: !!x.f.riffle && !(last && !front),
      });
    });
    out.push(flat(L, false, { shade: this.cast(false, ls), opacity: fade }), flat(R, true, { shade: this.cast(true, rs), opacity: fade }), ...leaves);
    return out;
  }

  private dots(tier: number, label: string) {
    return (
      <span role="img" aria-label={label} style={{ display: "flex", gap: 3, alignSelf: "center" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ width: 6, height: 6, borderRadius: 9999, background: tier >= n ? INK : "var(--color-limestone-400)" }} />
        ))}
      </span>
    );
  }

  private entryHead(word: string, hn: number, pos: string, root: string, tier: number, mark?: { width: string; background: string }, archaic = false) {
    const d = this.props.d;
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, height: 24, whiteSpace: "nowrap" }}>
        <span style={{ position: "relative", display: "inline-block" }}>
          {mark && <span aria-hidden style={{ position: "absolute", left: -3, top: 3, bottom: 0, width: mark.width, background: mark.background, borderRadius: 2 }} />}
          <span lang="mt" style={{ position: "relative", fontFamily: SERIF, fontWeight: 700, fontSize: 18, lineHeight: "24px", color: INK }}>
            {word}
          </span>
          {hn > 0 && <span style={{ position: "relative", top: -7, marginLeft: 1, fontWeight: 600, fontSize: 11, lineHeight: "12px", color: SOFT }}>{hn}</span>}
        </span>
        <span lang="mt" style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: SOFT }}>
          {pos}
          {archaic && (pos ? " " : "") + ARCHAIC_LABEL}
        </span>
        {root && (
          <span style={{ fontSize: 12, fontWeight: 500, color: SOFT }}>
            {d.dictRoot}: <span lang="mt">{root}</span>
          </span>
        )}
        <span style={{ flexGrow: 1 }} />
        {this.dots(tier, d.dictLevel(tier))}
      </div>
    );
  }

  private row(r: PageRow, k: number, now: number): ReactNode {
    if (r.kind === "opener")
      return (
        <div key={`o${k}`} style={{ height: OPENER_H, marginBottom: ROW_GAP, display: "flex", alignItems: "center", gap: 16 }}>
          <div lang="mt" style={{ ...display, width: 72, height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: SEA, color: PAPER, border: `2px solid ${INK}`, borderRadius: 2, boxShadow: "var(--shadow-block)", fontSize: 30, lineHeight: 1 }}>
            {r.letter}
          </div>
          <div style={{ flexGrow: 1, height: 2, background: INK }} />
        </div>
      );
    const e = this.ents![r.i];
    let mark: { width: string; background: string } | undefined;
    if (this.hl?.i === r.i) {
      // The found word gets a highlighter stroke that sweeps across, then settles paler.
      let w = 1;
      let a = 0.5;
      if (!this.hl.fixed && this.hl.t0 != null) {
        const dt = now - this.hl.t0;
        w = 1 - Math.pow(1 - Math.max(0, Math.min(1, dt / 450)), 3);
        a = dt < 450 ? 0.55 : Math.max(0.2, 0.55 - ((dt - 450) / 1200) * 0.35);
      }
      mark = { width: `calc((100% + 6px) * ${w.toFixed(3)})`, background: `color-mix(in srgb, var(--color-tile-present) ${(a * 100).toFixed(1)}%, transparent)` };
    }
    return (
      <div key={r.i} style={{ height: r.h, marginBottom: ROW_GAP }}>
        {this.entryHead(e.w, e.hn, e.pos, e.root, e.tier, mark, e.archaic)}
        {e.forms.length > 0 && (
          <div lang="mt" style={{ height: FORMS_H, fontSize: 14, lineHeight: `${FORMS_H}px`, color: SOFT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {e.forms.map(([kind, forms], k) => (
              <span key={kind}>
                {k > 0 && " · "}
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13 }}>{FORM_LABEL[kind] ?? kind}</span> <span style={{ fontFamily: SERIF, color: INK }}>{forms}</span>
              </span>
            ))}
          </div>
        )}
        <div title={r.full || undefined}>
          {r.lines.map((line, n) => (
            <div key={n} style={{ height: 21, fontSize: 15, lineHeight: "21px", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    );
  }

  private frontPage() {
    const d = this.props.d;
    const small = this.geo.W < 440;
    return (
      <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: small ? "28px 22px 20px" : "56px 48px 0", display: "flex", flexDirection: "column", gap: small ? 16 : 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div lang="mt" style={{ ...display, fontSize: small ? 28 : 36, lineHeight: "40px" }}>
            {d.dictTitle}
          </div>
          <div style={{ fontSize: small ? 16 : 18, lineHeight: small ? "24px" : "29px", color: SOFT }}>{d.dictFrontBlurb}</div>
        </div>
        <div style={{ height: 2, flexShrink: 0, background: INK }} />
        <div style={{ ...display, fontSize: 20, lineHeight: "28px" }}>{d.dictHowTitle}</div>
        <div style={{ padding: 16, background: "var(--color-limestone-100)", border: `1px solid ${SOFT}`, borderRadius: 2 }}>
          {this.entryHead(d.dictSampleWord, 0, "n.m.", "k-t-b", 1)}
          <div style={{ fontSize: 15, lineHeight: "21px" }}>{d.dictSampleMeaning}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 15, lineHeight: "22px" }}>
          <div>
            {d.dictLegend.map(([abbr, name], k) => (
              <span key={abbr}>
                {k > 0 && " · "}
                <strong lang="mt">{abbr}</strong> {name}
              </span>
            ))}
          </div>
          {d.dictLegendNotes.map(([term, text]) => (
            <div key={term}>
              <strong>{term}</strong> — {text}
            </div>
          ))}
          <div style={{ color: SOFT }}>{d.dictLegendSource}</div>
        </div>
      </div>
    );
  }

  /** The face of the front cover. `glint` is the band of light crossing it as it lifts, 0..1. */
  private cover(glint = 0) {
    const d = this.props.d;
    const { W } = this.geo;
    const small = W < 440;
    const panel = small ? 150 : 216;
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: SEA, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: small ? 26 : 36 }}>
        <div aria-hidden style={{ position: "absolute", inset: small ? 14 : 20, border: `2px solid ${PAPER}`, borderRadius: 2 }} />
        <div lang="mt" style={{ ...display, fontSize: small ? 28 : 46, lineHeight: 1, color: PAPER }}>
          {d.dictTitle}
        </div>
        <div style={{ width: panel, height: panel, display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, border: `2px solid ${INK}`, borderRadius: 2, boxShadow: `6px 6px 0 0 ${ink(0.3)}` }}>
          <CatLogo className={small ? "size-[122px]" : "size-44"} title={d.dictCatAlt} />
        </div>
        <div style={{ ...display, fontSize: small ? 14 : 18, lineHeight: 1, color: PAPER }}>Kelma</div>
        {glint > 0 && glint < 1 && (
          <div aria-hidden style={{ position: "absolute", top: 0, left: -W / 2, width: W / 2, height: "100%", background: "linear-gradient(to right, rgb(248 242 226 / 0), rgb(248 242 226 / 0.3) 50%, rgb(248 242 226 / 0))", transform: `translateX(${(1.5 * W * glint).toFixed(1)}px)`, opacity: glint < 0.25 ? glint * 4 : 1 - 0.4 * (glint - 0.25), pointerEvents: "none" }} />
        )}
      </div>
    );
  }

  /**
   * The open book while its cover is still closed or opening (wide screens). The front of the
   * cover turns from flat to upright; then the left half of the book (board, page edges, first
   * page) comes down from upright on the same hinge, so there is one left page, not a copy.
   * Its last frame is the static open book.
   */
  private openingBook(now: number) {
    const d = this.props.d;
    const { W, H } = this.geo;
    const ph = this.opening(now);
    const hinge = W + 22;
    const peak = (x: number) => 1 - Math.abs(2 * x - 1);
    const board: CSSProperties = { position: "absolute", top: 0, height: H + 20, background: SEA_DEEP, border: `2px solid ${INK}` };
    const page = (index: number, left: number, right: boolean, fold: number): Sheet => ({ key: `open-${index}`, page: index, left, origin: "center center", transform: "none", z: 1, opacity: 1, shade: "none", blur: false, right, fold });
    const current = (this.layout && (this.layout.pageLetter[0] ?? this.layout.pageLetter[1])) || "a";
    const leftShown = ph.reduced ? ph.fade > 0 : ph.landT > 0;
    const coverShown = ph.reduced ? ph.fade < 1 : ph.liftT < 1;
    return (
      <div style={{ position: "relative", width: 2 * W + 84, height: H + 20, flexShrink: 0, transform: `translateX(${((-W / 2) * (1 - ph.slide)).toFixed(1)}px)`, perspective: 2600, perspectiveOrigin: `${hinge}px 50%` }}>
        {/* shadow the cover throws to the left of the book as it comes down */}
        <div aria-hidden style={{ position: "absolute", left: hinge - 240, top: 10, width: 240, height: H, background: `linear-gradient(to left, ${ink(0.26)}, ${ink(0)})`, opacity: peak(ph.landT), pointerEvents: "none" }} />
        <div aria-hidden style={{ ...board, left: W, width: W + 44, borderLeft: 0, borderRadius: "0 2px 2px 0", boxShadow: `6px 6px 0 0 ${ink(0.18)}` }} />
        <div aria-hidden style={{ position: "absolute", left: W, top: 0, width: 2, height: H + 20, background: INK, opacity: ph.reduced ? 1 - ph.fade : 1 - clamp01((ph.landT * OPENING.land) / 120) }} />
        <div aria-hidden style={{ position: "absolute", top: 14, left: 2 * W + 22, width: 16, height: H - 8, background: PAGE_EDGES }} />
        {/* isolate: a page carries its own z-index, which must not lift it above the cover */}
        <div style={{ position: "absolute", left: 22, top: 10, width: 2 * W, height: H, isolation: "isolate" }}>{this.sheet(page(1, W, true, ph.reduced ? ph.fade : ph.land), now)}</div>
        {/* and onto the first page */}
        <div aria-hidden style={{ position: "absolute", left: hinge, top: 10, width: 300, height: H, background: `linear-gradient(to right, ${ink(0.34)}, ${ink(0)})`, opacity: peak(ph.swing), pointerEvents: "none" }} />

        <div style={{ position: "absolute", left: 0, top: 0, width: hinge, height: H + 20, transformOrigin: "100% 50%", transform: ph.reduced ? "none" : `rotateY(${(90 * (1 - ph.land)).toFixed(2)}deg)`, opacity: ph.reduced ? ph.fade : 1, visibility: leftShown ? "visible" : "hidden" }}>
          <div aria-hidden style={{ ...board, left: 0, width: W, borderRight: 0, borderRadius: "2px 0 0 2px" }} />
          <div aria-hidden style={{ position: "absolute", left: 6, top: H + 20, width: W, height: 6, background: ink(0.18) }} />
          <div aria-hidden style={{ position: "absolute", top: 14, left: 19, width: 3, height: H - 8, background: PAGE_EDGES }} />
          <div style={{ position: "absolute", left: 22, top: 10, width: W, height: H, isolation: "isolate" }}>{this.sheet(page(0, 0, false, 1), now)}</div>
          <div aria-hidden style={{ position: "absolute", inset: 0, background: INK, opacity: 0.42 * (1 - ph.land), pointerEvents: "none" }} />
        </div>

        {coverShown && (
          <div style={{ position: "absolute", left: hinge, top: 0, width: hinge, height: H + 20, background: SEA_DEEP, border: `2px solid ${INK}`, borderLeft: 0, borderRadius: "0 2px 2px 0", transformOrigin: "0 50%", transform: `rotateY(${(-90 * ph.lift).toFixed(2)}deg)`, opacity: ph.reduced ? 1 - ph.fade : 1 }}>
            <div style={{ position: "absolute", left: 0, top: 8, width: W, height: H }}>{this.cover(ph.liftT)}</div>
            <div aria-hidden style={{ position: "absolute", inset: 0, background: INK, opacity: 0.42 * ph.lift, pointerEvents: "none" }} />
          </div>
        )}

        <nav aria-label={d.dictJump} style={{ position: "absolute", left: 2 * W + 28, top: 10, height: H, display: "flex", flexDirection: "column", gap: 1, opacity: ph.tabs, transform: ph.reduced ? "none" : `translateX(${(-10 * (1 - ph.tabs)).toFixed(1)}px)`, visibility: ph.tabs > 0 ? "visible" : "hidden" }}>
          {ALPHABET.map((l) => this.letterTab(l, current, true))}
        </nav>
      </div>
    );
  }

  /** The same opening for one page: the cover lifts, then swings away off the left and fades. */
  private openingCover(now: number) {
    const { W, H } = this.geo;
    const ph = this.opening(now);
    const peak = (x: number) => 1 - Math.abs(2 * x - 1);
    const board: CSSProperties = { position: "absolute", top: -2, height: H + 16, background: SEA_DEEP, border: `2px solid ${INK}` };
    return (
      <>
        <div aria-hidden style={{ position: "absolute", left: 6, top: 6, width: Math.min(200, W), height: H, background: `linear-gradient(to right, ${ink(0.34)}, ${ink(0)})`, opacity: peak(ph.swing), pointerEvents: "none" }} />
        {!ph.reduced && ph.landT > 0 && ph.landT < 1 && (
          <div aria-hidden style={{ ...board, left: 6 - (W + 10), width: W + 10, borderRight: 0, borderRadius: "2px 0 0 2px", transformOrigin: "100% 50%", transform: `rotateY(${(90 - 78 * ph.land).toFixed(2)}deg)`, opacity: ph.landT < 0.55 ? 1 : 1 - (ph.landT - 0.55) / 0.45 }} />
        )}
        {(ph.reduced ? ph.fade < 1 : ph.liftT < 1) && (
          <div style={{ ...board, left: 6, width: W + 12, borderLeft: 0, borderRadius: "0 2px 2px 0", transformOrigin: "0 50%", transform: `rotateY(${(-90 * ph.lift).toFixed(2)}deg)`, opacity: ph.reduced ? 1 - ph.fade : 1 }}>
            <div style={{ position: "absolute", left: 0, top: 6, width: W, height: H }}>{this.cover(ph.liftT)}</div>
            <div aria-hidden style={{ position: "absolute", inset: 0, background: INK, opacity: 0.42 * ph.lift, pointerEvents: "none" }} />
          </div>
        )}
      </>
    );
  }

  private sheet(s: Sheet, now: number) {
    const { W, H, pad, single } = this.geo;
    const page = s.page === "cover" ? null : this.layout?.pages[s.page];
    // The fold: darker towards the spine, a hair of shadow at the outer edge.
    const towards = s.right ? "to right" : "to left";
    const away = s.right ? "to left" : "to right";
    const gutter = s.page === "cover" ? "none" : `linear-gradient(${towards}, ${ink(0.2)} 0%, ${ink(0.06)} 4%, ${ink(0)} 13%), linear-gradient(${away}, ${ink(0.07)} 0%, ${ink(0)} 3%)`;
    return (
      <div key={s.key} style={{ position: "absolute", top: 0, left: s.left, width: W, height: H, overflow: "hidden", transformOrigin: s.origin, transform: s.transform, zIndex: s.z, opacity: s.opacity, backgroundColor: PAPER, backgroundImage: PAPER_GRAIN }}>
        {s.page === "cover" && this.cover()}
        {page?.kind === "front" && this.frontPage()}
        {page?.kind === "dict" && (
          <div style={{ position: "absolute", inset: 0, padding: `18px ${pad}px 0`, filter: s.blur ? "blur(1.6px)" : "none" }}>
            <div style={{ height: 26, display: "flex", justifyContent: s.right && !single ? "flex-end" : "flex-start", alignItems: "flex-start", borderBottom: "1px solid var(--color-limestone-400)" }}>
              <span lang="mt" style={{ ...display, fontSize: 14, lineHeight: "18px", color: INK }}>
                {page.guide}
              </span>
            </div>
            <div style={{ paddingTop: 12 }}>{page.rows.map((r, k) => this.row(r, k, now))}</div>
            <div style={{ position: "absolute", left: pad, right: pad, bottom: 14, textAlign: s.right ? "right" : "left", fontSize: 12, lineHeight: "16px", fontWeight: 600, color: SOFT }}>{page.num}</div>
          </div>
        )}
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: gutter, opacity: s.fold ?? 1 }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: s.shade }} />
      </div>
    );
  }

  private arrow(dir: 1 | -1) {
    const d = this.props.d;
    const off = dir < 0 ? this.cur <= 0 : this.cur >= this.views() - 1;
    return (
      <button type="button" className="dict-btn" onClick={() => this.turn(dir)} aria-label={dir < 0 ? d.dictPrev : d.dictNext} aria-disabled={off} style={{ width: 48, height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, border: `2px solid ${INK}`, borderRadius: 2, boxShadow: "var(--shadow-block)", cursor: "pointer", opacity: off ? 0.4 : 1 }}>
        <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.25" strokeLinecap="square" strokeLinejoin="miter">
          <path d={dir < 0 ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"} />
        </svg>
      </button>
    );
  }

  private letterTab(l: string, current: string, side: boolean) {
    const d = this.props.d;
    const on = l === current;
    const go = () => {
      const p = this.layout?.letterPage[l];
      if (p != null) this.jump(Math.floor(p / this.per()), null);
    };
    const common: CSSProperties = { display: "flex", alignItems: "center", background: on ? SEA : PAPER, color: on ? PAPER : INK, border: `1px solid ${INK}`, fontSize: 12, fontWeight: 700, lineHeight: 1, textTransform: "uppercase", cursor: "pointer" };
    return side ? (
      <button key={l} type="button" lang="mt" className="dict-tab" onClick={go} aria-label={d.dictLetter(l.toUpperCase())} aria-current={on || undefined} style={{ ...common, flex: "1 1 0", minHeight: 0, width: on ? 52 : 40, padding: "0 8px 0 0", justifyContent: "flex-end", borderLeft: 0, borderRadius: "0 2px 2px 0" }}>
        {l}
      </button>
    ) : (
      <button key={l} type="button" lang="mt" onClick={go} aria-label={d.dictLetter(l.toUpperCase())} aria-current={on || undefined} style={{ ...common, flex: "0 0 auto", minWidth: 40, height: 44, padding: "0 6px", justifyContent: "center", borderRadius: 2, fontSize: 14 }}>
        {l}
      </button>
    );
  }

  private suggestion(i: number, k: number) {
    const e = this.ents![i];
    return (
      <button key={`${i}`} type="button" className="dict-sug" onClick={() => this.pickWord(i)} style={{ display: "flex", alignItems: "baseline", gap: 12, minHeight: 44, padding: "8px 12px", background: k === this.sugIdx ? "var(--color-limestone-200)" : "transparent", border: 0, borderRadius: 2, textAlign: "left", cursor: "pointer", color: INK }}>
        <span lang="mt" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 18, whiteSpace: "nowrap" }}>
          {e.w}
          {e.hn > 0 && <span style={{ position: "relative", top: -6, marginLeft: 1, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 11, color: SOFT }}>{e.hn}</span>}
          {/* found through another form of the word: say which, so "kotba" landing on ktieb makes sense */}
          {this.exact.via[i] && <span style={{ marginLeft: 8, fontWeight: 400, fontStyle: "italic", fontSize: 14, color: SOFT }}>({this.exact.via[i]})</span>}
        </span>
        <span style={{ fontSize: 14, lineHeight: "20px", color: SOFT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.gloss}</span>
      </button>
    );
  }

  private searchBar() {
    const d = this.props.d;
    const res = this.results();
    const hasQ = this.q.trim().length > 0;
    const showList = this.sugOpen && (res.all.length > 0 || res.head !== "");
    const showEmpty = this.sugOpen && hasQ && !showList && !this.relatedWait && !!this.ents;
    const panel: CSSProperties = { position: "absolute", left: 0, right: 0, top: 56, background: PAPER, border: `2px solid ${INK}`, borderRadius: 2, boxShadow: "var(--shadow-block)" };
    const square: CSSProperties = { width: 48, height: 48, flexShrink: 0, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${INK}`, borderRadius: 2, cursor: "pointer" };
    const icon = { "aria-hidden": true, width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2.25, strokeLinecap: "square" as const, strokeLinejoin: "miter" as const };
    return (
      <div style={{ width: "100%", maxWidth: 780, display: "flex", gap: 12, position: "relative", zIndex: 600 }}>
        <div style={{ position: "relative", flexGrow: 1, minWidth: 0 }}>
          <svg {...icon} stroke={INK} style={{ position: "absolute", left: 12, top: 12, pointerEvents: "none" }}>
            <rect x="4" y="4" width="11" height="11" />
            <path d="M15.5 15.5 20 20" />
          </svg>
          <input
            type="text"
            className="dict-input"
            aria-label={d.dictSearch}
            placeholder={d.dictSearch}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={this.q}
            onChange={(e) => {
              this.setQuery(e.target.value, true);
              this.redraw();
            }}
            onFocus={() => {
              if (hasQ && !this.sugOpen) {
                this.sugOpen = true;
                this.redraw();
              }
            }}
            style={{ width: "100%", height: 48, padding: "0 16px 0 46px", background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 2, boxShadow: "var(--shadow-block-sm)", fontSize: 16, fontWeight: 500 }}
          />
          {showList && (
            <div style={{ ...panel, padding: 4, display: "flex", flexDirection: "column" }}>
              {res.exact.map((i, k) => this.suggestion(i, k))}
              {res.head && (
                <div style={{ ...display, marginTop: res.exact.length ? 4 : 0, padding: "10px 12px 6px", borderTop: res.exact.length ? "1px solid var(--color-limestone-400)" : 0, fontSize: 12, lineHeight: "16px", color: SOFT }}>{res.head}</div>
              )}
              {res.related.map((i, k) => this.suggestion(i, res.exact.length + k))}
            </div>
          )}
          {showEmpty && (
            <div style={{ ...panel, padding: 20, display: "flex", alignItems: "center", gap: 20 }}>
              <CatLogo className="size-20 shrink-0" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ ...display, fontSize: 20, lineHeight: "28px" }}>{d.dictEmptyTitle}</div>
                <div style={{ fontSize: 16, lineHeight: "24px", color: SOFT }}>{d.dictEmptyBody}</div>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="dict-btn"
          aria-label={d.dictRandom}
          title={d.dictRandom}
          onClick={() => {
            if (!this.ents || !this.layout) return;
            const i = Math.floor(Math.random() * this.ents.length);
            this.setQuery("", false);
            this.jump(this.viewOf(i), i);
            this.redraw();
          }}
          style={{ ...square, background: SEA, boxShadow: "var(--shadow-block)" }}
        >
          <svg {...icon} stroke={PAPER}>
            <path d="M12 2.5 20.5 7.25v9.5L12 21.5l-8.5-4.75v-9.5Z" />
            <path strokeLinecap="butt" d="M3.5 7.25 12 12l8.5-4.75M12 12v9.5" />
            <g fill={PAPER} stroke="none">
              <ellipse cx="12" cy="7.25" rx="1.5" ry="0.95" />
              <circle cx="6.1" cy="12.3" r="1.05" />
              <circle cx="9.4" cy="16.9" r="1.05" />
              <circle cx="14.4" cy="17.3" r="1" />
              <circle cx="16.25" cy="14.4" r="1" />
              <circle cx="18.1" cy="11.5" r="1" />
            </g>
          </svg>
        </button>
      </div>
    );
  }

  render() {
    const d = this.props.d;
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    const { single, W, H, scale } = this.geo;
    const o = this.o;
    const ready = !!this.layout;
    const views = this.views();
    const progress = views > 1 ? this.cur / (views - 1) : 0;
    const per = this.per();
    const current = (this.layout && (this.layout.pageLetter[this.cur * per] ?? this.layout.pageLetter[this.cur * per + per - 1])) || "a";
    const stageHandlers = { onPointerDown: this.onDown, onPointerMove: this.onMove, onPointerUp: this.onUp, onPointerCancel: this.onUp, onPointerLeave: this.onLeave };
    const corner = (z: Zone) => (this.hint === z ? 36 : 0);
    const cornerStyle = (z: Zone, pos: CSSProperties, to: string): CSSProperties => ({ position: "absolute", zIndex: 150, width: corner(z), height: corner(z), background: curl(to), transition: "width .18s, height .18s", pointerEvents: "none", ...pos });
    const loadingPage = (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, color: SOFT, fontSize: 16 }}>{d.dictLoading}</div>
    );

    let book: ReactNode;
    if (single) {
      // One page, with the next pages' edges showing on the right.
      const rw = 3 + 9 * (1 - progress);
      book = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
          <nav aria-label={d.dictJump} style={{ display: "flex", gap: 4, maxWidth: "100%", overflowX: "auto", padding: "2px 2px 6px" }}>
            {ALPHABET.map((l) => this.letterTab(l, current, false))}
          </nav>
          <div style={{ position: "relative", width: W + 20, height: H + 16, background: SEA_DEEP, border: `2px solid ${INK}`, borderRadius: 2, boxShadow: "var(--shadow-block)", ...(o < 1 ? { perspective: 1600, perspectiveOrigin: "6px 50%" } : null) }}>
            <div aria-hidden style={{ position: "absolute", top: 10, left: 6 + W, width: rw, height: H - 8, background: PAGE_EDGES }} />
            <div {...stageHandlers} style={{ position: "absolute", left: 6, top: 6, width: W, height: H, perspective: 2200, touchAction: "pan-y" }}>
              {ready ? this.sheets(now).map((s) => this.sheet(s, now)) : loadingPage}
            </div>
            {o < 1 && this.openingCover(now)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {this.arrow(-1)}
            {this.arrow(1)}
          </div>
        </div>
      );
    } else {
      const lw = 3 + 13 * progress;
      const rw = 3 + 13 * (1 - progress);
      book = (
        <div style={{ width: FULL_WIDTH * scale, height: (H + 20) * scale }}>
          <div style={{ width: FULL_WIDTH, height: H + 20, transform: `scale(${scale})`, transformOrigin: "top left", display: "flex", alignItems: "center", gap: 20 }}>
            {this.arrow(-1)}
            {o < 1 ? (
              this.openingBook(now)
            ) : (
              <div style={{ position: "relative", width: 2 * W + 84, height: H + 20, flexShrink: 0 }}>
                <div aria-hidden style={{ position: "absolute", top: 0, left: 0, width: 2 * W + 44, height: H + 20, background: SEA_DEEP, border: `2px solid ${INK}`, borderRadius: 2, boxShadow: `6px 6px 0 0 ${ink(0.18)}` }} />
                <div aria-hidden style={{ position: "absolute", top: 14, left: 22 - lw, width: lw, height: H - 8, background: PAGE_EDGES, transition: "width .3s, left .3s" }} />
                <div aria-hidden style={{ position: "absolute", top: 14, left: 2 * W + 22, width: rw, height: H - 8, background: PAGE_EDGES, transition: "width .3s" }} />
                <nav aria-label={d.dictJump} style={{ position: "absolute", left: 2 * W + 28, top: 10, height: H, display: "flex", flexDirection: "column", gap: 1 }}>
                  {ALPHABET.map((l) => this.letterTab(l, current, true))}
                </nav>
                <div {...stageHandlers} style={{ position: "absolute", left: 22, top: 10, width: 2 * W, height: H, perspective: 2600 }}>
                  {this.sheets(now).map((s) => this.sheet(s, now))}
                  <div aria-hidden style={{ position: "absolute", left: W - 1, top: 0, width: 2, height: H, zIndex: 2, background: ink(0.22), pointerEvents: "none" }} />
                  <div aria-hidden style={cornerStyle("tr", { right: 0, top: 0 }, "top right")} />
                  <div aria-hidden style={cornerStyle("br", { right: 0, bottom: 0 }, "bottom right")} />
                  <div aria-hidden style={cornerStyle("tl", { left: 0, top: 0 }, "top left")} />
                  <div aria-hidden style={cornerStyle("bl", { left: 0, bottom: 0 }, "bottom left")} />
                </div>
              </div>
            )}
            {this.arrow(1)}
          </div>
        </div>
      );
    }

    return (
      <div ref={this.box} className="dict-root" tabIndex={0} onKeyDown={this.onKey} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: single ? 10 : 32, outline: "none", overflow: "hidden", padding: "0 0 8px" }}>
        {/* The meanings are measured in this font before the pages are laid out. */}
        <span ref={this.probe} aria-hidden className="font-sans" style={{ position: "absolute", visibility: "hidden", pointerEvents: "none" }} />
        <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "0 12px" }}>{this.searchBar()}</div>
        {book}
      </div>
    );
  }
}
