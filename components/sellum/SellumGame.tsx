"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sellumDayIndex } from "@/lib/day-index";
import { normaliseKey } from "@/lib/game";
import validGuesses from "@/data/kelma/valid-guesses.json";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { applySettings, loadSettings } from "@/lib/settings";
import {
  MAX_LIVES,
  RESULT_DELAY_MS,
  STEP_MS,
  TARGET_REVEAL_MS,
  ladderWords,
  newState,
  submitWord,
  type LadderContext,
  type SellumState,
} from "@/lib/sellum/game";
import { buildGraph, distancesFrom, shortestRoutes } from "@/lib/sellum/graph";
import { getSellumPuzzle } from "@/lib/sellum/puzzles";
import { sellumShareText } from "@/lib/sellum/share";
import { emptySellumStats, type SellumStats } from "@/lib/sellum/stats";
import { completeSellum, loadSellumState, loadSellumStats, saveSellumState } from "@/lib/sellum/store";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";
import type { SellumPuzzle } from "@/lib/sellum/validate";
import { CatLogo } from "../CatLogo";
import { Countdown } from "../Countdown";
import { ArrowIcon, HelpIcon, ShareIcon, StatsIcon, TickIcon } from "../Icons";
import { Keyboard } from "../Keyboard";
import { LangToggle } from "../LangToggle";
import { Modal } from "../Modal";
import { LadderBoard, type RowView } from "./LadderBoard";
import { SellumResult } from "./SellumResult";

type Panel = "none" | "help" | "stats";
const iconBtn = "inline-flex size-11 items-center justify-center rounded-tile text-ink hover:bg-limestone-200 active:translate-y-px";
const SEEN_HELP = "kelma:sellum:seen-help";

export function SellumGame({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [puzzle, setPuzzle] = useState<SellumPuzzle | null | undefined>(undefined);
  const [day, setDay] = useState(0);
  const [state, setState] = useState<SellumState>(() => newState(0));
  const [draft, setDraft] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [flip, setFlip] = useState<{ row: number; key: number } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [panel, setPanel] = useState<Panel>("none");
  const [stats, setStats] = useState<SellumStats>(emptySellumStats);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [copied, setCopied] = useState(false);
  const [newDay, setNewDay] = useState(false);
  const locked = useRef(false);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const showToast = useCallback(
    (text: string, spoken = text, ms = 1800) => {
      const id = Date.now();
      setToast({ id, text });
      setAnnounce(spoken);
      later(() => setToast((c) => (c?.id === id ? null : c)), ms);
    },
    [later],
  );

  // One graph for the session; the distance map is one BFS from today's target (milliseconds).
  const graph = useMemo(() => buildGraph(validGuesses as string[]), []);
  const ctx: LadderContext | null = useMemo(() => {
    if (!puzzle) return null;
    return { start: puzzle.start, target: puzzle.target, toTarget: distancesFrom(graph, puzzle.target), isWord: (w) => graph.has(w) };
  }, [graph, puzzle]);

  // Date and storage only after mount.
  useEffect(() => {
    applySettings(loadSettings());
    const today = sellumDayIndex();
    const p = getSellumPuzzle(today);
    setDay(today);
    setPuzzle(p);
    if (!p) return;
    const saved = loadSellumState(today);
    setState(saved);
    setCelebrate(saved.status === "won");
    setStats(saved.status === "playing" ? loadSellumStats() : completeSellum(saved));
    if (!readJSON<boolean>(SEEN_HELP)) {
      writeJSON(SEEN_HELP, true);
      setPanel("help");
    }
  }, []);

  const finished = state.status !== "playing";

  const finish = useCallback(
    (next: SellumState) => {
      setStats(completeSellum(next));
      if (next.status === "won") {
        // The last step completes itself: the target row flips green, then confetti.
        later(() => setCelebrate(true), STEP_MS);
        later(() => {
          void import("canvas-confetti").then(({ default: confetti }) =>
            confetti({
              particleCount: 110,
              spread: 75,
              origin: { y: 0.55 },
              colors: ["#c9921e", "#d9a527", "#0e6b8c", "#427a35", "#b3372b", "#f8f2e2"],
              disableForReducedMotion: true,
            }),
          );
          setAnnounce(`${d.sellumWon} ${ladderWords(next, ctx!).join(", ")}`);
        }, STEP_MS + TARGET_REVEAL_MS);
        later(() => setPanel("stats"), RESULT_DELAY_MS);
      } else {
        later(() => setPanel("stats"), 1600);
      }
    },
    [ctx, d, later],
  );

  const submit = useCallback(() => {
    if (!ctx || finished || locked.current) return;
    // The player types the whole word; an unfinished one is a slip, like in Kelma.
    if (draft.length < 5) {
      setShakeKey((k) => k + 1);
      showToast(d.notEnough);
      return;
    }
    const word = draft.join("");
    const { state: next, result } = submitWord(state, word, ctx);
    if (result === "shape" || result === "used") {
      setShakeKey((k) => k + 1);
      showToast(result === "shape" ? d.changeOne : d.alreadyUsed);
      return;
    }
    if (result === "not-word" || result === "dead-end") {
      setState(next);
      saveSellumState(next);
      const msg = result === "not-word" ? d.notInList : d.deadEnd;
      showToast(msg, `${msg}. ${d.lifeLost(next.lives)}`);
      if (result === "not-word") setShakeKey((k) => k + 1);
      else setFlash(true);
      locked.current = true;
      later(() => {
        locked.current = false;
        setFlash(false);
        setDraft([]);
      }, 900);
      if (next.status === "lost") finish(next);
      return;
    }
    // Accepted: lock the row and flip it in, tile by tile.
    const row = state.words.length; // 0..2 -> rows 2..4
    setFlip({ row, key: Date.now() });
    setState(next);
    saveSellumState(next);
    setDraft([]);
    locked.current = true;
    setAnnounce(d.wordAccepted(word, row + 2));
    later(() => {
      locked.current = false;
    }, STEP_MS);
    if (next.status === "won") finish(next);
  }, [ctx, d, draft, finish, finished, later, showToast, state]);

  const onKey = useCallback(
    (key: string) => {
      if (!ctx || finished || locked.current) return;
      if (key === "ENTER") return submit();
      if (key === "BACKSPACE") return setDraft((dr) => dr.slice(0, -1));
      setDraft((dr) => (dr.length < 5 ? [...dr, key] : dr));
    },
    [ctx, finished, submit],
  );

  // Physical keyboard, same rules as Kelma.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return;
      if (document.querySelector("dialog[open]")) return;
      const active = document.activeElement as HTMLElement | null;
      const onOther = active && active !== document.body && !active.closest("[data-keyboard],[data-ladder]");
      if (e.key === "Enter") {
        if (onOther) return;
        e.preventDefault();
        active?.blur();
        onKey("ENTER");
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        onKey("BACKSPACE");
        return;
      }
      const letter = normaliseKey(e.key);
      if (letter) {
        e.preventDefault();
        onKey(letter);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey]);

  const share = useCallback(async () => {
    if (!puzzle) return;
    const text = sellumShareText({ day, start: puzzle.start, target: puzzle.target, livesLeft: state.lives });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(d.copied);
      later(() => setCopied(false), 2000);
    } catch {
      showToast(d.copyFailed);
    }
  }, [d, day, later, puzzle, showToast, state.lives]);

  const altRoute = useMemo(() => {
    if (!ctx || !finished) return null;
    const mine = ladderWords(state, ctx).join(" ");
    return shortestRoutes(graph, ctx.start, ctx.toTarget, () => true, 40).find((r) => r.join(" ") !== mine) ?? null;
  }, [ctx, finished, graph, state]);

  // Rows 2–4, the ones the player fills.
  const rows = [0, 1, 2].map((r): RowView => {
    if (r < state.words.length) return { kind: "locked", word: state.words[r] };
    if (r === state.words.length && !finished) return { kind: "active", draft, flash };
    return { kind: "empty" };
  }) as [RowView, RowView, RowView];

  const livesIcons = (
    <div className="mr-1 flex items-center gap-[4px]" aria-live="off">
      <span className="sr-only">{d.livesLeft(state.lives)}</span>
      {/* Lives as small tiles: filled while you have them, outlined once lost. */}
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={`inline-block size-[13px] rounded-tile border-2 transition-colors duration-300 ${
            i < state.lives ? "border-ink bg-ink" : "border-ink-soft bg-transparent"
          }`}
        />
      ))}
    </div>
  );

  let body: React.ReactNode;
  if (puzzle === null) {
    const before = day < 0;
    body = (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h2 className="display-caps text-2xl">{before ? d.noPuzzleBeforeTitle : d.noPuzzleAfterTitle}</h2>
        <p className="mt-3 max-w-xs text-ink-soft">{before ? d.noPuzzleBeforeBody : d.noPuzzleAfterBody}</p>
      </div>
    );
  } else if (!puzzle) {
    body = <div className="flex-1" />;
  } else {
    body = (
      <>
        <div data-ladder className="relative flex min-h-0 flex-1 flex-col">
          <LadderBoard
            start={puzzle.start}
            target={puzzle.target}
            rows={rows}
            flip={flip}
            shakeKey={shakeKey}
            celebrate={celebrate}
            d={d}
          />
          {!finished && <p className="sr-only">{d.floorOf(state.words.length + 2, 5)}</p>}
          {/* Toasts appear at the top, as in Kelma. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
            {toast && (
              <p key={toast.id} className="mx-4 rounded-tile bg-ink px-4 py-2.5 text-center text-sm font-bold text-limestone-50 shadow-block">
                {toast.text}
              </p>
            )}
          </div>
        </div>
        {finished ? (
          <div className="mx-auto w-full max-w-[500px] shrink-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
            <div className="flex items-center justify-between gap-3 rounded-tile border-2 border-ink bg-limestone-100 px-4 py-3 shadow-block-sm">
              <p className="text-sm font-semibold text-ink-soft">
                {newDay ? d.newWordReady : d.nextWordIn}
                <br />
                {newDay ? (
                  <button type="button" onClick={() => window.location.reload()} className="text-base font-bold text-sea-deep underline underline-offset-2">
                    {d.playNew}
                  </button>
                ) : (
                  <Countdown onElapsed={() => setNewDay(true)} className="text-lg font-bold text-ink" />
                )}
              </p>
              <button type="button" onClick={() => setPanel("stats")} className="btn-block inline-flex h-11 items-center gap-2 rounded-tile bg-sea px-4 font-bold text-limestone-50 hover:bg-sea-deep">
                {d.seeResult}
                <ArrowIcon className="size-5" />
              </button>
            </div>
          </div>
        ) : (
          <Keyboard states={{}} onKey={onKey} disabled={!ctx} d={d} />
        )}
      </>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="mx-auto flex h-14 w-full max-w-[500px] shrink-0 items-center gap-1 border-b-2 border-ink/80 px-2">
        <Link href={href("home", lang)} aria-label={d.homeAria} className={`${iconBtn} -ml-1`}>
          <CatLogo className="size-9" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate whitespace-nowrap pl-1 leading-none">
          <span className="display-caps text-[0.85rem] tracking-normal">{puzzle ? d.sellumNumber(day + 1) : "Sellum"}</span>
        </h1>
        {puzzle && livesIcons}
        <button type="button" className={iconBtn} aria-label={d.helpAria} onClick={() => setPanel("help")}>
          <HelpIcon className="size-6" />
        </button>
        <button type="button" className={iconBtn} aria-label={d.statsAria} onClick={() => setPanel("stats")}>
          <StatsIcon className="size-6" />
        </button>
        <LangToggle lang={lang} page="sellum" />
      </header>

      <main className="relative mx-auto flex min-h-0 w-full max-w-[500px] flex-1 flex-col">
        {body}
        {/* Without a building (no puzzle today), toasts fall back to the top. */}
        {!puzzle && toast && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
            <p key={toast.id} className="mx-4 rounded-tile bg-ink px-4 py-2.5 text-center text-sm font-bold text-limestone-50 shadow-block">
              {toast.text}
            </p>
          </div>
        )}
      </main>
      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>

      <Modal open={panel === "help"} onClose={() => setPanel("none")} title={d.helpTitle} closeLabel={d.close}>
        <div className="space-y-3">
          <p>{d.sellumHelpIntro}</p>
          <p>{d.sellumHelpEdit}</p>
          <p>{d.sellumHelpLives}</p>
          <p>{d.sellumHelpGreen}</p>
          <Link href={href("sellumHow", lang)} className="inline-flex min-h-11 items-center gap-2 font-bold text-sea-deep underline underline-offset-2">
            {d.helpMore}
            <ArrowIcon className="size-4" />
          </Link>
        </div>
      </Modal>

      <Modal
        open={panel === "stats"}
        onClose={() => setPanel("none")}
        title={finished ? (state.status === "won" ? d.sellumWon : d.sellumLost) : d.statsFor("Sellum")}
        closeLabel={d.close}
      >
        {puzzle && ctx && (
          <SellumResult
            lang={lang}
            puzzle={puzzle}
            state={state}
            ladder={ladderWords(state, ctx)}
            altRoute={altRoute}
            stats={stats}
            day={day}
            finished={finished}
            newDay={newDay}
            onElapsed={() => setNewDay(true)}
            shareButton={
              <button type="button" onClick={share} className="btn-block inline-flex h-12 items-center gap-2 rounded-tile bg-sea px-5 font-bold text-limestone-50 hover:bg-sea-deep">
                {copied ? <TickIcon className="size-5" /> : <ShareIcon className="size-5" />}
                {copied ? d.copiedShort : d.share}
              </button>
            }
          />
        )}
      </Modal>
    </div>
  );
}
