"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { filWeekIndex } from "@/lib/day-index";
import {
  WORDS_PER_HINT,
  apply,
  canHint,
  isSolved,
  judge,
  lockedTiles,
  newFilState,
  takeHint,
  touchTile,
  type FilState,
} from "@/lib/fil/game";
import { releasedPuzzles, type FilPuzzle } from "@/lib/fil/puzzles";
import { isFilSolved, loadFilState, saveFilState } from "@/lib/fil/store";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { applySettings, loadSettings } from "@/lib/settings";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";
import { CatLogo } from "../CatLogo";
import { HelpIcon, TickIcon } from "../Icons";
import { LangToggle } from "../LangToggle";
import { Modal } from "../Modal";
import { FilBoard } from "./FilBoard";


const iconBtn = "inline-flex size-11 items-center justify-center rounded-tile text-ink hover:bg-limestone-200 active:translate-y-px";
const ctrl = "btn-block relative inline-flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-tile border-2 border-ink px-2 font-bold";

/** Fil: the weekly theme word search. This week's puzzle opens; earlier weeks stay playable from the tabs. */
export function FilGame({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [puzzles, setPuzzles] = useState<FilPuzzle[] | null>(null);
  const [puzzle, setPuzzle] = useState<FilPuzzle | null>(null);
  const [state, setState] = useState<FilState>(newFilState);
  const [solvedWeeks, setSolvedWeeks] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState<number[]>([]);
  const [shake, setShake] = useState<{ tiles: number[]; key: number } | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [help, setHelp] = useState(false);
  const timers = useRef<number[]>([]);
  const gesture = useRef<{ start: number; startedIn: boolean; moved: boolean } | null>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const say = useCallback(
    (text: string, ms = 1600) => {
      const id = Date.now();
      setToast({ id, text });
      setAnnounce(text);
      later(() => setToast((c) => (c?.id === id ? null : c)), ms);
    },
    [later],
  );

  const refreshTicks = useCallback((list: FilPuzzle[]) => setSolvedWeeks(new Set(list.filter(isFilSolved).map((p) => p.week))), []);

  const open = useCallback((p: FilPuzzle) => {
    setPuzzle(p);
    setState(loadFilState(p));
    setSel([]);
    setShake(null);
  }, []);

  // Date and storage only after mount.
  useEffect(() => {
    applySettings(loadSettings());
    const list = releasedPuzzles(filWeekIndex());
    setPuzzles(list);
    refreshTicks(list);
    if (list.length) open(list[list.length - 1]);
    if (!readJSON<boolean>(KEYS.filSeenHelp)) {
      writeJSON(KEYS.filSeenHelp, true);
      setHelp(true);
    }
  }, [open, refreshTicks]);

  const locked = useMemo(() => (puzzle ? lockedTiles(puzzle, state) : new Set<number>()), [puzzle, state]);
  const solved = puzzle ? isSolved(puzzle, state) : false;
  const total = puzzle ? puzzle.words.length : 0;

  const commit = useCallback(
    (p: FilPuzzle, next: FilState) => {
      setState(next);
      saveFilState(p, next);
      if (puzzles) refreshTicks(puzzles);
    },
    [puzzles, refreshTicks],
  );

  const submit = useCallback(
    (path: number[]) => {
      setSel([]);
      if (!puzzle || solved || path.length < 2) return;
      const v = judge(puzzle, state, path);
      const next = apply(state, v);
      if (v.kind === "short" || v.kind === "invalid") {
        setShake({ tiles: path, key: Date.now() });
        say(v.kind === "short" ? d.filTooShort : d.filNotWord);
        return;
      }
      if (v.kind === "already") return say(d.filAlready);
      commit(puzzle, next);
      if (v.kind === "bonus") return say(d.filBonus(v.word), 2000);
      say(d.filFoundWord(v.word));
      if (isSolved(puzzle, next)) {
        track("game_end", { game: "fil", week: puzzle.week, hints: next.hintsUsed, bonus: next.bonus.length });
        later(() => setAnnounce(d.filDone), 300);
      }
    },
    [commit, d, later, puzzle, say, solved, state],
  );

  // Pointer gestures: a press that doesn't move is a tap; one that moves across tiles is a drag,
  // which is confirmed when the finger lifts. Moves come faster than renders, so the gesture reads
  // and writes the selection through a ref.
  const selRef = useRef<number[]>([]);
  selRef.current = sel;
  const pick = useCallback((next: number[]) => {
    selRef.current = next;
    setSel(next);
  }, []);
  const tap = useCallback(
    (tile: number) => {
      const next = touchTile(selRef.current, tile, locked, true);
      if (next === "submit") submit(selRef.current);
      else pick(next);
    },
    [locked, pick, submit],
  );
  const handlers = useMemo(
    () => ({
      onDown: (tile: number) => {
        const startedIn = selRef.current.includes(tile);
        gesture.current = { start: tile, startedIn, moved: false };
        // A new tile joins (or starts) the selection at once; one already in it waits to see if it's a tap.
        if (!startedIn) tap(tile);
      },
      onMove: (tile: number) => {
        const g = gesture.current;
        if (!g) return;
        let base = selRef.current;
        if (!g.moved) {
          if (tile === g.start) return;
          // A drag from a tile already in the selection carries on from that tile.
          if (g.startedIn) base = base.slice(0, base.indexOf(g.start) + 1);
        }
        if (tile === base[base.length - 1]) return;
        const next = touchTile(base, tile, locked, false);
        if (next === "submit" || next === base) return;
        g.moved = true;
        pick(next);
      },
      onUp: () => {
        const g = gesture.current;
        gesture.current = null;
        if (!g) return;
        if (g.moved) {
          if (selRef.current.length >= 2) submit(selRef.current);
        } else if (g.startedIn) tap(g.start);
      },
      onKeyTap: tap,
    }),
    [locked, pick, submit, tap],
  );

  // The hint button only works when it's full (it's disabled otherwise), as in the prototype.
  const hint = useCallback(() => {
    if (!puzzle || !canHint(puzzle, state)) return;
    const next = takeHint(puzzle, state);
    commit(puzzle, next);
    const w = puzzle.words.find((x) => x.word === next.hint);
    if (w) say(d.filHintShown(Array.from(w.word).length), 2200);
  }, [commit, d, puzzle, say, state]);

  const selWord = puzzle ? sel.map((c) => puzzle.grid[c]).join("") : "";
  const hintReady = puzzle ? canHint(puzzle, state) : false;
  const fill = Math.min(1, state.credit / WORDS_PER_HINT);

  let body: React.ReactNode;
  if (puzzles === null) body = <div className="flex-1" />;
  else if (!puzzle) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h2 className="display-caps text-2xl">{d.filNoPuzzleTitle}</h2>
        <p className="mt-3 max-w-xs text-ink-soft">{d.filNoPuzzleBody}</p>
      </div>
    );
  } else {
    body = (
      <>
        {/* Weeks: this week's puzzle opens; ticks for finished ones. */}
        {puzzles.length > 1 && (
          <nav aria-label={d.filWeeksLabel} className="flex gap-1.5 overflow-x-auto px-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {puzzles.map((p) => (
              <button
                key={p.week}
                type="button"
                aria-pressed={p.week === puzzle.week}
                onClick={() => open(p)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-tile border-2 border-ink px-3 text-sm font-bold ${p.week === puzzle.week ? "bg-ink text-limestone-50" : "bg-limestone-50 text-ink hover:bg-limestone-200"}`}
              >
                {d.filWeek(p.week)}
                {solvedWeeks.has(p.week) && <TickIcon className="size-4" />}
                {solvedWeeks.has(p.week) && <span className="sr-only">{` (${d.filSolved})`}</span>}
              </button>
            ))}
          </nav>
        )}

        {/* The banner: the theme, and how many words are found. */}
        <section className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-tile border-2 border-ink bg-luzzu px-4 py-2.5 text-limestone-50 shadow-block-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{d.filThemeLabel}</p>
            <p className="text-lg font-extrabold leading-tight">{puzzle.theme[lang]}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-extrabold tabular-nums" aria-label={d.filFoundAria(state.found.length, total)}>
              {d.filFound(state.found.length, total)}
            </p>
            <div aria-hidden className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-limestone-50/30">
              <div className="h-full origin-left bg-limestone-50 transition-transform duration-300" style={{ transform: `scaleX(${state.found.length / total})` }} />
            </div>
          </div>
        </section>

        <div className="relative px-3">
          <p aria-hidden className="flex h-10 items-center justify-center text-2xl font-extrabold tracking-wide">
            {selWord}
          </p>
          <span className="sr-only" aria-live="polite">
            {selWord && d.filSelected(selWord)}
          </span>
          <FilBoard puzzle={puzzle} state={state} sel={sel} locked={locked} shake={shake} d={d} handlers={handlers} />
          {/* Toasts float at the top of the board, as in the other games. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
            {toast && (
              <p key={toast.id} className="mx-4 rounded-tile bg-ink px-4 py-2.5 text-center text-sm font-bold text-limestone-50 shadow-block">
                {toast.text}
              </p>
            )}
          </div>
        </div>

        {!solved && (
          <div className="mx-auto mt-3 flex w-full max-w-[26rem] gap-2 px-3">
            <button type="button" onClick={() => pick([])} disabled={!sel.length} className={`${ctrl} bg-limestone-50 text-ink disabled:opacity-50`}>
              {d.filClear}
            </button>
            <button type="button" onClick={() => submit(sel)} disabled={sel.length < 2} className={`${ctrl} bg-sea text-limestone-50 disabled:opacity-50`}>
              {d.filConfirm}
            </button>
            <button
              type="button"
              onClick={hint}
              disabled={!hintReady}
              aria-label={d.filHintAria(state.credit, WORDS_PER_HINT)}
              className={`${ctrl} ${hintReady ? "bg-ochre text-ink" : "bg-limestone-50 text-ink disabled:opacity-60"}`}
            >
              {/* Progress: the button fills as bonus words are found, 3 to a hint. */}
              <span aria-hidden className="absolute inset-0 origin-left bg-ochre/40 transition-transform duration-300" style={{ transform: `scaleX(${hintReady ? 0 : fill})` }} />
              <span className="relative">{d.filHint}</span>
            </button>
          </div>
        )}

        {/* Other words found, which count towards hints. */}
        {!solved && (
          <p className="mx-auto mt-3 min-h-5 w-full max-w-[26rem] px-3 pb-[max(16px,env(safe-area-inset-bottom))] text-center text-sm text-ink-soft">
            {state.bonus.length > 0 && d.filBonusList(state.bonus.join(", "))}
          </p>
        )}

        {/* Finished: every word with its meaning. */}
        {solved && (
          <section className="mx-auto mt-4 w-full max-w-[26rem] px-3 pb-[max(20px,env(safe-area-inset-bottom))]">
            <p className="text-center font-bold">{d.filDone}</p>
            <h2 className="mb-2 mt-4 text-lg font-extrabold">{d.filWordsTitle}</h2>
            <ul className="grid gap-1">
              {puzzle.words.map((w) => (
                <li key={w.word} className="flex justify-between gap-3 rounded-tile bg-limestone-50 px-3 py-1.5">
                  <b className="font-extrabold">{w.word}</b>
                  <span className="text-right text-sm text-ink-soft">{w.gloss}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-[500px] shrink-0 items-center gap-1 border-b-2 border-ink/80 px-2">
        <Link href={href("home", lang)} aria-label={d.homeAria} className={`${iconBtn} -ml-1`}>
          <CatLogo className="size-9" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate whitespace-nowrap pl-1 leading-none">
          <span className="display-caps text-[0.85rem] tracking-normal">{puzzle ? d.filTitle(puzzle.week) : "Fil"}</span>
        </h1>
        <button type="button" className={iconBtn} aria-label={d.helpAria} onClick={() => setHelp(true)}>
          <HelpIcon className="size-6" />
        </button>
        <LangToggle lang={lang} page="fil" />
      </header>

      <main className="relative mx-auto flex w-full max-w-[500px] flex-1 flex-col">{body}</main>
      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>

      <Modal open={help} onClose={() => setHelp(false)} title={d.helpTitle} closeLabel={d.close}>
        <div className="space-y-3">
          <p>{d.filHelpIntro}</p>
          <p>{d.filHelpTrace}</p>
          <p>{d.filHelpHints}</p>
          <p>{d.filHelpLetters}</p>
        </div>
      </Modal>
    </div>
  );
}
