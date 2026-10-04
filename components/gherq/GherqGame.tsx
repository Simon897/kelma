"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gherqDayIndex } from "@/lib/day-index";
import { normaliseKey } from "@/lib/game";
import {
  MAX_LETTERS,
  bonusPoints,
  bonusWords,
  byLengthThenAlpha,
  classifyEntry,
  clueOrder,
  coreFound,
  coreWords,
  earnedPoints,
  firstSense,
  hintLetter,
  isBonus,
  emptyGherqStats,
  gherqShareText,
  newGherqState,
  nextHint,
  nextStarIn,
  rootLabel,
  starsFor,
  tiles,
  totalPoints,
  type GherqPuzzle,
  type GherqState,
  type GherqStats,
  type Lexicon,
} from "@/lib/gherq/game";
import { loadLexicon } from "@/lib/gherq/lexicon";
import { getGherqPuzzle } from "@/lib/gherq/puzzles";
import { loadGherqState, loadGherqStats, saveGherqStars, saveGherqState, trackGherqOnce } from "@/lib/gherq/store";
import { t, type Lang } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { applySettings, loadSettings } from "@/lib/settings";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { CatLogo } from "../CatLogo";
import { Countdown } from "../Countdown";
import { ArrowIcon, CloseIcon, HelpIcon, ShareIcon, StatsIcon, TickIcon } from "../Icons";
import { Keyboard } from "../Keyboard";
import { LangToggle } from "../LangToggle";
import { Modal } from "../Modal";
import { CarobScene } from "./Art";
import type { CatHandle, CatPose } from "./Cat";
import { CatDebugPanel } from "./CatDebug";
import { GherqResult } from "./GherqResult";
import { ClueCard, EntryRow, FoundCard, Stars } from "./Parts";

type Panel = "none" | "help" | "stats";
const iconBtn = "inline-flex size-11 items-center justify-center rounded-tile text-ink hover:bg-limestone-200 active:translate-y-px";
const SEEN_HELP = "kelma:gherq:seen-help";
/** The end panel waits for the last leaf, the stars and the confetti, then about 1.2s more. */
const RESULT_DELAY_MS = 900 + 1200;

const HintIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="square">
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" />
  </svg>
);

export function GherqGame({ lang }: { lang: Lang }) {
  const d = t(lang);
  const reduce = usePrefersReducedMotion();
  const [puzzle, setPuzzle] = useState<GherqPuzzle | null | undefined>(undefined);
  const [day, setDay] = useState(0);
  const [state, setState] = useState<GherqState>(() => newGherqState(0));
  const [stats, setStats] = useState<GherqStats>(emptyGherqStats);
  const [lexicon, setLexicon] = useState<Lexicon | null>(null);
  const [entry, setEntry] = useState<string[]>([]);
  const [flying, setFlying] = useState<{ letters: string[]; key: number; dy: number } | null>(null);
  const sceneBox = useRef<HTMLDivElement>(null);
  const entryBox = useRef<HTMLDivElement>(null);
  /** How far the found word's tiles fly to reach the tree's canopy (layouts differ by screen). */
  const flightTo = () => {
    const s = sceneBox.current?.getBoundingClientRect();
    const e = entryBox.current?.getBoundingClientRect();
    return s && e ? s.top + s.height * 0.4 - (e.top + e.height / 2) : -160;
  };
  /** Brings a clue card into view in whichever list is showing (the phone list scrolls). */
  const showCard = useCallback(
    (word: string) => {
      const card = [...document.querySelectorAll<HTMLElement>(`[data-clue="${word}"]`)].find((el) => el.offsetParent !== null);
      card?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    },
    [reduce],
  );
  const [fresh, setFresh] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [panel, setPanel] = useState<Panel>("none");
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [starsAnnounce, setStarsAnnounce] = useState("");
  const [copied, setCopied] = useState(false);
  const [newDay, setNewDay] = useState(false);
  const [intro, setIntro] = useState(false);
  /** The first-visit note has done its job (first word found, dismissed, or help opened): never again. */
  const endIntro = useCallback(() => {
    setIntro(false);
    writeJSON(SEEN_HELP, true);
  }, []);
  const timers = useRef<number[]>([]);
  const cat = useRef<CatHandle>(null);
  const [debugPose, setDebugPose] = useState<CatPose | null>(null);

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

  // Date and storage only after mount; the lexicon loads after first paint.
  useEffect(() => {
    applySettings(loadSettings());
    const today = gherqDayIndex();
    const p = getGherqPuzzle(today);
    setDay(today);
    setPuzzle(p);
    writeJSON(KEYS.gherqVisited, true);
    setStats(loadGherqStats());
    if (!p) return;
    setState(loadGherqState(today));
    // First visit: a two-line note above the clues instead of a pop-up over the game.
    if (!readJSON<boolean>(SEEN_HELP)) setIntro(true);
    const id = window.setTimeout(() => void loadLexicon().then(setLexicon), 0);
    return () => window.clearTimeout(id);
  }, []);

  const found = useMemo(() => new Set(state.found), [state.found]);
  const total = puzzle ? totalPoints(puzzle) : 0;
  const earned = puzzle ? earnedPoints(puzzle, found) : 0;
  const bonus = puzzle ? bonusPoints(puzzle, found) : 0;
  const coreCount = puzzle ? coreWords(puzzle).length : 0;
  const bonusCount = puzzle ? bonusWords(puzzle).length : 0;
  const bonusFound = puzzle ? bonusWords(puzzle).filter((w) => found.has(w.word)).length : 0;
  const stars = starsFor(earned, total, found.size);
  const finished = state.revealed || stars === 5;
  const toNext = nextStarIn(earned, total, found.size);

  // Leave with progress -> that day's game_end is sent (once).
  useEffect(() => {
    if (!puzzle) return;
    const onHide = () => {
      if (found.size > 0) trackGherqOnce({ day, stars, found: coreFound(puzzle, found), total: coreCount, hints: state.hints, revealed: state.revealed });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [coreCount, day, found, puzzle, stars, state.hints, state.revealed]);

  const commit = useCallback(
    (next: GherqState) => {
      setState(next);
      saveGherqState(next);
    },
    [],
  );

  const submitWord = useCallback(
    async (word: string) => {
      if (!puzzle || finished) return;
      let r = classifyEntry(word, puzzle, found, lexicon);
      if (r.kind === "pending") {
        showToast(d.checkingWord);
        const lex = await loadLexicon();
        setLexicon(lex);
        r = classifyEntry(word, puzzle, found, lex);
      }
      switch (r.kind) {
        case "short":
          setShakeKey((k) => k + 1);
          return;
        case "not-word":
          cat.current?.react("wrong");
          setShakeKey((k) => k + 1);
          showToast(d.gherqNotAWord);
          setEntry([]);
          return;
        case "wrong-root":
          cat.current?.react("wrong");
          showToast(d.notFromRoot);
          setEntry([]);
          return;
        case "excluded":
          showToast(d.gherqNotToday);
          setEntry([]);
          return;
        case "repeat":
          showToast(d.alreadyFound);
          setEntry([]);
          return;
      }
      // Accepted: the entry tiles fly up to the tree, a leaf unfolds and the card slides in.
      const w = puzzle.words.find((x) => x.word === r.word)!;
      const next: GherqState = { ...state, found: [...state.found, w.word] };
      commit(next);
      setFlying({ letters: tiles(word), key: Date.now(), dy: flightTo() });
      later(() => showCard(w.word), 450);
      setEntry([]);
      setFresh(w.word);
      if (intro) endIntro();
      setAnnounce(d.wordFound(w.word, w.gloss, w.points));
      if (isBonus(w)) showToast(d.bonusFound, d.wordFound(w.word, w.gloss, w.points));
      const nextFound = new Set(next.found);
      const newStars = starsFor(earnedPoints(puzzle, nextFound), total, nextFound.size);
      // The cat: a one-off stir at the first star, otherwise a reaction (bigger for a golden pod).
      cat.current?.react(stars === 0 && newStars === 1 ? "stir" : w.points === 3 ? "rare" : "found");
      if (newStars > stars) {
        setStats(saveGherqStars(day, newStars));
        setStarsAnnounce(d.starsOf(newStars));
      }
      if (newStars === 5) {
        trackGherqOnce({ day, stars: 5, found: coreFound(puzzle, nextFound), total: coreCount, hints: next.hints, revealed: false });
        later(() => {
          void import("canvas-confetti").then(({ default: confetti }) =>
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.35 },
              colors: ["#c9921e", "#d9a527", "#0e6b8c", "#427a35", "#b3372b", "#f8f2e2"],
              disableForReducedMotion: true,
            }),
          );
        }, 600);
        later(() => setPanel("stats"), RESULT_DELAY_MS);
      }
    },
    [commit, coreCount, d, day, endIntro, found, finished, intro, later, lexicon, puzzle, showCard, showToast, stars, state, total],
  );

  const onKey = useCallback(
    (key: string) => {
      if (!puzzle || finished) return;
      if (key === "ENTER") return void submitWord(entry.join(""));
      if (key === "BACKSPACE") return setEntry((e) => e.slice(0, -1));
      setEntry((e) => (e.length < MAX_LETTERS ? [...e, key] : e));
    },
    [entry, finished, puzzle, submitWord],
  );

  // Physical keyboard, same rules as the other games.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return;
      if (document.querySelector("dialog[open]")) return;
      const active = document.activeElement as HTMLElement | null;
      const onOther = active && active !== document.body && !active.closest("[data-keyboard]");
      if (e.key === "Enter") {
        if (onOther) return;
        e.preventDefault();
        active?.blur();
        onKey("ENTER");
        return;
      }
      if (e.key === "Backspace") {
        if (onOther && active?.tagName === "INPUT") return;
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

  const takeHint = useCallback(() => {
    if (!puzzle || finished) return;
    const w = nextHint(puzzle, found, state.hinted);
    if (!w) return showToast(d.hintNone);
    commit({ ...state, hints: state.hints + 1, hinted: [...state.hinted, w.word] });
    cat.current?.react("hint");
    const h = hintLetter(w.word, puzzle.root);
    const msg = d.hintAnnounce(firstSense(w.gloss), h.index + 1, h.letter);
    showToast(msg, msg, 3200);
    showCard(w.word);
  }, [commit, d, finished, found, puzzle, showCard, showToast, state]);

  const giveUp = useCallback(() => {
    if (!puzzle) return;
    commit({ ...state, revealed: true });
    trackGherqOnce({ day, stars, found: coreFound(puzzle, found), total: coreCount, hints: state.hints, revealed: true });
  }, [commit, coreCount, day, found, puzzle, stars, state]);

  const share = useCallback(async () => {
    if (!puzzle) return;
    const text = gherqShareText({
      day,
      root: puzzle.root,
      stars,
      found: coreFound(puzzle, found),
      total: coreCount,
      bonus: bonusWords(puzzle).filter((w) => found.has(w.word)).length,
      hints: state.hints,
      lang,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(d.copied);
      later(() => setCopied(false), 2000);
    } catch {
      showToast(d.copyFailed);
    }
  }, [coreCount, d, day, found, lang, later, puzzle, showToast, stars, state.hints]);

  const clues = useMemo(() => (puzzle ? clueOrder(puzzle) : []), [puzzle]);
  const hintLeft = !!puzzle && !!nextHint(puzzle, found, state.hinted);

  // Phones: the clue list fades at the bottom while more clues are below it.
  const phoneList = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const checkMore = useCallback(() => {
    const el = phoneList.current;
    if (el) setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  useEffect(() => {
    const el = phoneList.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    checkMore();
    const ro = new ResizeObserver(checkMore);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [checkMore, puzzle]);
  // Bonus words aren't listed as clues; once found they join the list underneath.
  const foundBonus = useMemo(
    () => (puzzle ? bonusWords(puzzle).filter((w) => found.has(w.word)).sort((a, b) => byLengthThenAlpha(a.word, b.word)) : []),
    [found, puzzle],
  );
  const sceneKinds = useMemo(
    () => (puzzle ? state.found.map((w) => (puzzle.words.find((x) => x.word === w)?.points === 3 ? "pod" : "leaf") as "leaf" | "pod") : []),
    [puzzle, state.found],
  );
  const catState: CatPose = debugPose ?? (stars >= 5 ? "happy" : stars >= 2 ? "awake" : "nap");

  const list = puzzle && (
    <div className="space-y-2">
      {intro && !finished && (
        <div className="stone flex items-start gap-1 rounded-tile border-2 border-ink bg-limestone-50 py-2 pl-3 pr-1 text-sm shadow-block-sm">
          <p className="min-w-0 flex-1 leading-snug">
            <strong className="block">{d.gherqIntroTitle(rootLabel(puzzle.root))}</strong>
            {d.gherqIntroBody}{" "}
            <button
              type="button"
              onClick={() => {
                endIntro();
                setPanel("help");
              }}
              className="font-bold text-sea-deep underline underline-offset-2"
            >
              {d.helpTitle}
            </button>
          </p>
          <button type="button" onClick={endIntro} aria-label={d.gherqIntroDismiss} className="-my-1 inline-flex size-11 shrink-0 items-center justify-center rounded-tile text-ink hover:bg-limestone-200">
            <CloseIcon className="size-5" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 px-1 text-xs">
        <span className="font-bold">{d.cluesTitle(coreFound(puzzle, found), coreCount)}</span>
        {bonusCount > 0 && (
          <span aria-label={d.bonusCountAria(bonusFound, bonusCount)} className="rounded-tile border border-star px-1.5 py-0.5 font-semibold text-ink">
            {d.bonusCount(bonusFound, bonusCount)}
          </span>
        )}
        {/* Hint sits on the clues it fills in, within thumb reach; the hit area is 44px tall. */}
        {!finished && (
          <button
            type="button"
            onClick={takeHint}
            disabled={!hintLeft}
            className="relative ml-auto inline-flex h-8 items-center gap-1 rounded-tile border-2 border-ink bg-limestone-50 px-2.5 text-sm font-bold text-ink shadow-block-sm before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[''] hover:bg-limestone-200 active:translate-y-px disabled:border-ink-soft/50 disabled:text-ink-soft disabled:shadow-none disabled:hover:bg-limestone-50"
          >
            <HintIcon className="size-4" />
            {d.hint}
          </button>
        )}
      </div>
      <ul className="space-y-1.5 md:space-y-2">
        {/* every clue stays in its place, easiest first; a found word fills its card in */}
        {clues.map((w) =>
          found.has(w.word) ? (
            <FoundCard key={w.word} word={w} d={d} fresh={w.word === fresh} />
          ) : (
            <ClueCard key={w.word} word={w} d={d} reveal={state.hinted.includes(w.word) ? hintLetter(w.word, puzzle.root) : null} />
          ),
        )}
        {foundBonus.map((w) => (
          <FoundCard key={w.word} word={w} d={d} fresh={w.word === fresh} />
        ))}
      </ul>
    </div>
  );

  let body: React.ReactNode;
  if (puzzle === null) {
    const before = day < 0;
    body = (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h2 className="display-caps text-2xl">{before ? d.gherqBeforeTitle : d.gherqAfterTitle}</h2>
        <p className="mt-3 max-w-xs text-ink-soft">{before ? d.gherqBeforeBody : d.gherqAfterBody}</p>
      </div>
    );
  } else if (!puzzle) {
    body = <div className="flex-1" />;
  } else {
    body = (
      <div className="flex min-h-0 flex-1 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-4 phone-landscape:grid phone-landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] phone-landscape:gap-3">
        <div className="relative flex min-h-0 flex-1 flex-col md:justify-center">
          <div className="relative flex min-h-0 flex-1 flex-col md:flex-none">
            {/* phones: a short scene so the clues fit; desktop: a sensible height, the game centred */}
            <div ref={sceneBox} className="relative h-[clamp(96px,22dvh,220px)] flex-none md:h-[clamp(200px,calc(100dvh-400px),560px)] phone-landscape:h-[clamp(56px,18dvh,88px)]">
              <CarobScene
                found={sceneKinds}
                freshIndex={fresh ? state.found.indexOf(fresh) : null}
                catState={catState}
                catRef={cat}
                root={puzzle.root}
                className="absolute inset-0"
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-3 pt-2">
              <Stars stars={stars} d={d} />
              {/* One line of progress: how far the next star is (the stars carry the rest). */}
              <p className="text-right text-sm font-semibold leading-tight text-ink">
                {found.size === 0 ? d.firstStar : toNext === null ? d.allStars : d.nextStar(toNext)}
              </p>
            </div>
            {/* phones: the clues between the tree and the keyboard */}
            <div
              ref={phoneList}
              onScroll={checkMore}
              className={`min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-2 md:hidden phone-landscape:hidden ${
                moreBelow ? "[mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]" : ""
              }`}
            >
              {list}
            </div>
          </div>

          {finished ? (
            <div className="mx-auto w-full max-w-[500px] shrink-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
              <div className="flex items-center justify-between gap-3 rounded-tile border-2 border-ink bg-limestone-100 px-4 py-3 shadow-block-sm">
                <p className="text-sm font-semibold text-ink-soft">
                  {newDay ? d.gherqNewRootReady : d.nextRootIn}
                  <br />
                  {newDay ? (
                    <button type="button" onClick={() => window.location.reload()} className="text-base font-bold text-sea-deep underline underline-offset-2">
                      {d.playNew}
                    </button>
                  ) : (
                    <span className="text-lg font-bold text-ink">
                      <Countdown onElapsed={() => setNewDay(true)} />
                    </span>
                  )}
                </p>
                <button type="button" onClick={() => setPanel("stats")} className="btn-block inline-flex h-11 items-center gap-2 rounded-tile bg-sea px-4 font-bold text-limestone-50 hover:bg-sea-deep">
                  {d.seeResult}
                  <ArrowIcon className="size-5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div ref={entryBox} className="relative">
                <EntryRow letters={entry} shakeKey={shakeKey} placeholder={d.gherqTypePrompt} />
                {flying && !reduce && (
                  <motion.div
                    key={flying.key}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center justify-center gap-[3px]"
                    initial={{ y: 0, opacity: 1, scale: 1 }}
                    animate={{ y: flying.dy, opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.35, ease: [0.45, 0, 0.2, 1] }}
                  >
                    {flying.letters.map((l, i) => (
                      <span key={i} className="flex size-8 items-center justify-center rounded-tile border-2 border-ink bg-limestone-50 text-sm font-bold">
                        {l}
                      </span>
                    ))}
                  </motion.div>
                )}
              </div>
              <Keyboard states={{}} onKey={onKey} disabled={!puzzle} d={d} />
            </>
          )}
        </div>

        {/* desktop: the list beside the tree */}
        <aside className="hidden min-h-0 overflow-y-auto px-1 py-3 md:block phone-landscape:block" aria-label={puzzle ? d.cluesTitle(coreFound(puzzle, found), coreCount) : undefined}>
          {list}
        </aside>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="mx-auto flex h-14 w-full max-w-[900px] shrink-0 items-center gap-1 border-b-2 border-ink/80 px-2">
        <Link href={href("home", lang)} aria-label={d.homeAria} className={`${iconBtn} -ml-1`}>
          <CatLogo className="size-9" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate whitespace-nowrap pl-1 leading-none">
          <span className="display-caps text-[0.85rem] tracking-normal">{puzzle ? d.gherqNumber(day + 1) : "Għerq"}</span>
        </h1>
        <button type="button" className={iconBtn} aria-label={d.helpAria} onClick={() => setPanel("help")}>
          <HelpIcon className="size-6" />
        </button>
        <button type="button" className={iconBtn} aria-label={d.statsAria} onClick={() => setPanel("stats")}>
          <StatsIcon className="size-6" />
        </button>
        <LangToggle lang={lang} page="gherq" />
      </header>

      <main className="relative mx-auto flex min-h-0 w-full max-w-[900px] flex-1 flex-col">
        {body}
        {toast && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
            <p key={toast.id} className="mx-4 max-w-[26rem] rounded-tile bg-ink px-4 py-2.5 text-center text-sm font-bold text-limestone-50 shadow-block">
              {toast.text}
            </p>
          </div>
        )}
        {process.env.NODE_ENV === "development" && <CatDebugPanel cat={cat} pose={debugPose} setPose={setDebugPose} />}
      </main>
      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>
      <p className="sr-only" aria-live="polite">
        {starsAnnounce}
      </p>

      <Modal open={panel === "help"} onClose={() => setPanel("none")} title={d.helpTitle} closeLabel={d.close}>
        <div className="space-y-3">
          <p>{d.gherqHelpIntro}</p>
          <p>{d.gherqHelpCounts}</p>
          <p>{d.gherqHelpPoints}</p>
          <p>{d.gherqHelpFree}</p>
          <Link href={href("gherqHow", lang)} className="inline-flex min-h-11 items-center gap-2 font-bold text-sea-deep underline underline-offset-2">
            {d.helpMore}
            <ArrowIcon className="size-4" />
          </Link>
        </div>
      </Modal>

      <Modal
        open={panel === "stats"}
        onClose={() => setPanel("none")}
        title={finished ? (stars === 5 ? d.gherqDone : d.gherqRevealed) : d.statsFor("Għerq")}
        closeLabel={d.close}
      >
        {puzzle && (
          <GherqResult
            lang={lang}
            puzzle={puzzle}
            found={found}
            stars={stars}
            earned={earned}
            total={total}
            bonus={bonus}
            stats={stats}
            day={day}
            finished={finished}
            newDay={newDay}
            onElapsed={() => setNewDay(true)}
            onGiveUp={giveUp}
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
