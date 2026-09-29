"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dayIndex } from "@/lib/day-index";
import {
  MAX_GUESSES,
  RESULT_DELAY_MS,
  REVEAL_MS,
  WORD_LENGTH,
  keyboardStates,
  normaliseKey,
  scoreGuess,
  tiles,
  type GameStatus,
} from "@/lib/game";
import { completeGame, loadState, loadStats, saveState } from "@/lib/game-store";
import { isValidGuess } from "@/lib/guesses";
import { t, type Lang } from "@/lib/i18n";
import { getEntry, otherMode, type Mode } from "@/lib/modes";
import { href } from "@/lib/routes";
import { applySettings, loadSettings, saveSettings, type Settings } from "@/lib/settings";
import { shareText } from "@/lib/share";
import { emptyStats, type Stats } from "@/lib/stats";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";
import type { AnswerEntry } from "@/lib/validate-data";
import { Board } from "./Board";
import { Countdown } from "./Countdown";
import { GameHeader } from "./GameHeader";
import { ArrowIcon, ShareIcon, TickIcon } from "./Icons";
import { Keyboard } from "./Keyboard";
import { Modal } from "./Modal";
import { StatsBlock } from "./StatsBlock";
import { Tile, stateLabel } from "./Tile";
import { WordEntry } from "./WordEntry";

type Panel = "none" | "help" | "stats" | "settings";

interface Loaded {
  day: number;
  entry: AnswerEntry | null;
}

export function Game({ lang, mode }: { lang: Lang; mode: Mode }) {
  const d = t(lang);

  // Date and storage are read only after mount, so server HTML stays stable.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [settings, setSettings] = useState<Settings>({ highContrast: false });
  const [revealRow, setRevealRow] = useState<number | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [panel, setPanel] = useState<Panel>("none");
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [newDay, setNewDay] = useState(false);
  const [copied, setCopied] = useState(false);
  const locked = useRef(false);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const showToast = useCallback(
    (text: string, ms = 1600, spoken = text) => {
      const id = Date.now();
      setToast({ id, text });
      setAnnounce(spoken);
      later(() => setToast((cur) => (cur?.id === id ? null : cur)), ms);
    },
    [later],
  );

  useEffect(() => {
    const day = dayIndex();
    const entry = getEntry(mode, day);
    const s = loadSettings();
    applySettings(s);
    setSettings(s);
    setLoaded({ day, entry });
    if (!entry) return;
    const saved = loadState(mode, day);
    setGuesses(saved.guesses);
    setStatus(saved.status);
    // Finished before a reload: completeGame is idempotent, so stats and analytics still fire once.
    if (saved.status !== "playing") {
      setStats(completeGame(mode, day, entry.word, saved.status === "won", saved.guesses.length));
    } else {
      setStats(loadStats(mode));
    }
    if (!readJSON<boolean>(KEYS.seenHelp)) {
      writeJSON(KEYS.seenHelp, true);
      setPanel("help");
    }
  }, [mode]);

  const solution = loaded?.entry?.word ?? null;
  const finished = status !== "playing";

  // Keyboard colours update only once a row has finished flipping.
  const settledGuesses = revealRow === null ? guesses : guesses.slice(0, revealRow);
  const keyStates = useMemo(
    () => (solution ? keyboardStates(settledGuesses, solution) : {}),
    [settledGuesses, solution],
  );

  const submit = useCallback(() => {
    if (!loaded?.entry || !solution) return;
    if (current.length < WORD_LENGTH) {
      setShakeKey((k) => k + 1);
      showToast(d.notEnough);
      return;
    }
    const word = current.join("");
    if (!isValidGuess(word)) {
      setShakeKey((k) => k + 1);
      showToast(d.notInList);
      return;
    }
    const next = [...guesses, word];
    const won = word === solution;
    const nextStatus: GameStatus = won ? "won" : next.length >= MAX_GUESSES ? "lost" : "playing";
    const row = next.length - 1;

    locked.current = true;
    setGuesses(next);
    setCurrent([]);
    setRevealRow(row);
    setStatus(nextStatus);
    saveState(mode, { day: loaded.day, guesses: next, status: nextStatus });
    const newStats = nextStatus !== "playing" ? completeGame(mode, loaded.day, solution, won, next.length) : null;

    later(() => {
      locked.current = false;
      setRevealRow(null);
      const detail = tiles(word)
        .map((l, i) => `${l} ${stateLabel(scoreGuess(word, solution)[i], d)}`)
        .join(", ");
      const spoken = d.guessAnnouncement(next.length, detail);
      setAnnounce(spoken);
      if (newStats) setStats(newStats);
      if (won) {
        const msg = d.winToasts[row] ?? d.winToasts[5];
        showToast(msg, 2200, `${spoken}. ${msg}`);
        void import("canvas-confetti").then(({ default: confetti }) =>
          confetti({
            particleCount: 110,
            spread: 75,
            origin: { y: 0.45 },
            colors: ["#c9921e", "#d9a527", "#0e6b8c", "#427a35", "#b3372b", "#f8f2e2"],
            disableForReducedMotion: true,
          }),
        );
      } else if (nextStatus === "lost") {
        showToast(d.lostToast, 2200, `${spoken}. ${d.wordWas} ${solution}.`);
      }
    }, REVEAL_MS);

    // Let the player see the finished board before anything covers it.
    if (nextStatus !== "playing") later(() => setPanel("stats"), RESULT_DELAY_MS);
  }, [current, d, guesses, later, loaded, mode, showToast, solution]);

  const onKey = useCallback(
    (key: string) => {
      if (locked.current || finished || !loaded?.entry) return;
      if (key === "ENTER") return submit();
      if (key === "BACKSPACE") return setCurrent((c) => c.slice(0, -1));
      setCurrent((c) => (c.length < WORD_LENGTH ? [...c, key] : c));
    },
    [finished, loaded, submit],
  );

  // Physical keyboard.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return; // allow AltGr (ctrl+alt) layouts
      if (document.querySelector("dialog[open]")) return;
      const active = document.activeElement as HTMLElement | null;
      const inKeyboard = !!active?.closest("[data-keyboard]");
      const onOtherControl = active && active !== document.body && !inKeyboard;
      if (e.key === "Enter") {
        if (onOtherControl) return; // Enter on a link or header button keeps its normal job
        e.preventDefault();
        active?.blur(); // so a focused on-screen key isn't also clicked
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
    if (!loaded || !solution) return;
    const text = shareText({
      mode,
      day: loaded.day,
      guesses,
      solution,
      won: status === "won",
      highContrast: settings.highContrast,
    });
    try {
      await navigator.clipboard.writeText(text);
      showToast(d.copied);
      setCopied(true);
      later(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      showToast(ok ? d.copied : d.copyFailed);
      if (ok) {
        setCopied(true);
        later(() => setCopied(false), 2000);
      }
    }
  }, [d, guesses, later, loaded, mode, settings.highContrast, showToast, solution, status]);

  const other = otherMode(mode);
  const modeName = (m: Mode) => (m === "normali" ? d.modeNormali : d.modeTqila);
  const onElapsed = useCallback(() => setNewDay(true), []);

  let body: React.ReactNode;
  if (loaded && !loaded.entry) {
    const before = loaded.day < 0;
    body = (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h2 className="display-caps text-2xl">{before ? d.noPuzzleBeforeTitle : d.noPuzzleAfterTitle}</h2>
        <p className="mt-3 max-w-xs text-ink-soft">{before ? d.noPuzzleBeforeBody : d.noPuzzleAfterBody}</p>
        <p className="mt-5 text-sm font-semibold">
          {`${d.nextWordIn} `}
          <Countdown />
        </p>
      </div>
    );
  } else {
    body = (
      <>
        <Board
          guesses={guesses}
          current={current}
          solution={solution}
          revealRow={revealRow}
          shakeKey={shakeKey}
          d={d}
          lang={lang}
        />
        {finished && revealRow === null && loaded?.entry ? (
          <ResultBar
            entry={loaded.entry}
            won={status === "won"}
            newDay={newDay}
            onElapsed={onElapsed}
            onOpen={() => setPanel("stats")}
            d={d}
          />
        ) : (
          <Keyboard states={keyStates} onKey={onKey} disabled={!loaded || finished} d={d} />
        )}
      </>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <GameHeader
        lang={lang}
        mode={mode}
        d={d}
        onHelp={() => setPanel("help")}
        onStats={() => setPanel("stats")}
        onSettings={() => setPanel("settings")}
      />
      <main className="relative mx-auto flex min-h-0 w-full max-w-[500px] flex-1 flex-col">
        {loaded?.entry && (
          <p className="sr-only">{d.puzzleNumber(loaded.day + 1)}</p>
        )}
        {body}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          {toast && (
            <p key={toast.id} className="rounded-tile bg-ink px-4 py-2.5 text-sm font-bold text-limestone-50 shadow-block">
              {toast.text}
            </p>
          )}
        </div>
      </main>
      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>

      <Modal open={panel === "help"} onClose={() => setPanel("none")} title={d.helpTitle} closeLabel={d.close}>
        <HelpBody d={d} lang={lang} />
      </Modal>

      <Modal
        open={panel === "stats"}
        onClose={() => setPanel("none")}
        title={finished ? (status === "won" ? d.resultTitleWon : d.wordWas) : d.statsFor(modeName(mode))}
        closeLabel={d.close}
      >
        <div className="space-y-5">
          {finished && loaded?.entry && <WordEntry entry={loaded.entry} won={status === "won"} d={d} showLabel={status === "won"} />}
          {finished && <h3 className="text-sm font-bold">{d.statsFor(modeName(mode))}</h3>}
          <StatsBlock
            stats={stats}
            today={loaded?.day ?? 0}
            d={d}
            highlight={status === "won" ? guesses.length - 1 : undefined}
          />
          {finished && (
            <>
              <div className="flex items-center justify-between gap-3 border-t-2 border-limestone-300 pt-4">
                <div>
                  <p className="text-xs font-semibold text-ink-soft">{newDay ? d.newWordReady : d.nextWordIn}</p>
                  {newDay ? (
                    <button type="button" onClick={() => window.location.reload()} className="mt-1 font-bold text-sea-deep underline underline-offset-2">
                      {d.playNew}
                    </button>
                  ) : (
                    <Countdown onElapsed={onElapsed} className="text-2xl font-bold" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={share}
                  className="btn-block inline-flex h-12 items-center gap-2 rounded-tile bg-sea px-5 font-bold text-limestone-50 hover:bg-sea-deep"
                >
                  {copied ? <TickIcon className="size-5" /> : <ShareIcon className="size-5" />}
                  {copied ? d.copiedShort : d.share}
                </button>
              </div>
              <Link
                href={href(other, lang)}
                className="flex min-h-11 items-center justify-between rounded-tile border-2 border-ink px-4 py-2 font-bold hover:bg-limestone-200"
              >
                {d.tryOther[mode]}
                <ArrowIcon className="size-5" />
              </Link>
            </>
          )}
        </div>
      </Modal>

      <Modal open={panel === "settings"} onClose={() => setPanel("none")} title={d.settingsTitle} closeLabel={d.close}>
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span>
            <span className="block font-bold">{d.highContrast}</span>
            <span className="mt-1 block text-sm text-ink-soft">{d.highContrastBody}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.highContrast}
            onChange={(e) => {
              const s = { ...settings, highContrast: e.target.checked };
              setSettings(s);
              saveSettings(s);
            }}
            className="peer mt-1 size-6 shrink-0 cursor-pointer accent-sea"
          />
        </label>
        <div className="mt-4 flex gap-1.5" aria-hidden>
          {(["correct", "present", "absent"] as const).map((s, i) => (
            <Tile key={s} letter={["K", "E", "L"][i]} state={s} lang={lang} className="size-11 text-xl" />
          ))}
        </div>
      </Modal>
    </div>
  );
}

function ResultBar({
  entry,
  won,
  newDay,
  onElapsed,
  onOpen,
  d,
}: {
  entry: AnswerEntry;
  won: boolean;
  newDay: boolean;
  onElapsed: () => void;
  onOpen: () => void;
  d: ReturnType<typeof t>;
}) {
  // Replaces the keyboard once the game is over, so the board stays in view.
  return (
    <div className="mx-auto w-full max-w-[500px] shrink-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-1">
      <div className="stone flex min-h-[168px] flex-col justify-between rounded-tile border-2 border-ink bg-limestone-100 px-4 py-3 shadow-block-sm">
        <div>
          <p className="text-xs font-bold text-ink-soft">{won ? d.todaysWord : d.wordWas}</p>
          <p className="display-caps text-3xl leading-tight" lang="mt">
            {entry.word}
          </p>
          <p className="line-clamp-2 text-sm leading-snug">{entry.gloss}</p>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-xs font-semibold text-ink-soft">
            {newDay ? d.newWordReady : d.nextWordIn}
            <br />
            {newDay ? (
              <button type="button" onClick={() => window.location.reload()} className="text-base font-bold text-sea-deep underline underline-offset-2">
                {d.playNew}
              </button>
            ) : (
              <Countdown onElapsed={onElapsed} className="text-lg font-bold text-ink" />
            )}
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="btn-block inline-flex h-11 items-center gap-2 rounded-tile bg-sea px-4 font-bold text-limestone-50 hover:bg-sea-deep"
          >
            {d.seeResult}
            <ArrowIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function HelpBody({ d, lang }: { d: ReturnType<typeof t>; lang: Lang }) {
  const rows: { word: string; at: number; state: "correct" | "present" | "absent"; text: string }[] = [
    { word: "BAĦAR", at: 0, state: "correct", text: d.helpCorrect },
    { word: "KAMRA", at: 2, state: "present", text: d.helpPresent },
    { word: "SKOLA", at: 2, state: "absent", text: d.helpAbsent },
  ];
  return (
    <div className="space-y-4">
      <p>{d.helpIntro}</p>
      {rows.map((r) => (
        <div key={r.word}>
          <div className="flex gap-1" lang="mt">
            {tiles(r.word).map((l, i) => (
              <Tile key={i} letter={l} state={i === r.at ? r.state : "tbd"} lang={lang} className="size-10 text-lg" />
            ))}
          </div>
          <p className="mt-1.5 text-sm">{r.text}</p>
        </div>
      ))}
      <Link href={href("how", lang)} className="inline-flex min-h-11 items-center gap-2 font-bold text-sea-deep underline underline-offset-2">
        {d.helpMore}
        <ArrowIcon className="size-4" />
      </Link>
    </div>
  );
}
