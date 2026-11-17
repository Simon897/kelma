"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { SUGGEST_URL } from "@/lib/site";

const EVENT = "kelma:suggest";

/** Bring the suggestion box into view with a word already filled in (from the book's "not found" panel). */
export function openSuggestBox(word: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: word }));
}

type Status = { s: "idle" } | { s: "sending" } | { s: "sent"; word: string } | { s: "error"; busy: boolean };

/**
 * The suggestion box under the Dizzjunarju: anyone can suggest a word that's missing from the book,
 * with an optional description. Suggestions are anonymous and go to a Google Sheet through an Apps
 * Script web app (scripts/suggestion-box.gs, URL in SUGGEST_URL).
 */
export function SuggestBox({ d, lang }: { d: Dict; lang: Lang }) {
  const id = useId();
  const box = useRef<HTMLElement>(null);
  const wordInput = useRef<HTMLInputElement>(null);
  const descInput = useRef<HTMLTextAreaElement>(null);
  const [word, setWord] = useState("");
  const [description, setDescription] = useState("");
  const [trap, setTrap] = useState("");
  const [status, setStatus] = useState<Status>({ s: "idle" });

  useEffect(() => {
    const onSuggest = (e: Event) => {
      const w = (e as CustomEvent<string>).detail.trim();
      setStatus({ s: "idle" });
      if (w) setWord(w);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      box.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      // With the word filled in, the next thing to write is the description.
      (w ? descInput : wordInput).current?.focus({ preventScroll: true });
    };
    window.addEventListener(EVENT, onSuggest);
    return () => window.removeEventListener(EVENT, onSuggest);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const w = word.trim();
    if (!w || status.s === "sending") return;
    setStatus({ s: "sending" });
    try {
      if (!SUGGEST_URL) throw new Error("SUGGEST_URL is not set");
      // A form-encoded body keeps this a "simple" request, which Apps Script accepts without a CORS preflight.
      const res = await fetch(SUGGEST_URL, {
        method: "POST",
        body: new URLSearchParams({ word: w, description: description.trim(), lang, website: trap }),
      });
      const out = (await res.json()) as { ok: boolean; error?: string };
      if (!out.ok) throw new Error(out.error);
      setStatus({ s: "sent", word: w });
      setWord("");
      setDescription("");
    } catch (err) {
      setStatus({ s: "error", busy: err instanceof Error && err.message === "busy" });
    }
  };

  const field = "w-full rounded-tile border-2 border-ink bg-[#fffdf6] px-3 text-base font-medium text-ink shadow-[var(--shadow-block-sm)] placeholder:font-normal placeholder:text-ink-soft";

  return (
    <section ref={box} id="suggest" aria-labelledby={`${id}-title`} className="mx-auto mt-10 w-full max-w-[40rem] scroll-mt-6 px-4">
      <div className="felt-page rounded-[6px] px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-7">
        <h2 id={`${id}-title`} className="display-caps text-2xl leading-none sm:text-[1.75rem]">
          {d.suggestTitle}
        </h2>
        <p className="mt-2 text-sm leading-snug text-ink-soft sm:text-[0.9375rem]">{d.suggestBlurb}</p>

        {status.s === "sent" ? (
          <div role="status" className="mt-5 flex flex-col items-start gap-3">
            <p className="text-lg font-semibold">{d.suggestThanks(status.word)}</p>
            <button
              type="button"
              onClick={() => {
                setStatus({ s: "idle" });
                requestAnimationFrame(() => wordInput.current?.focus());
              }}
              className="min-h-11 font-bold text-sea-deep underline underline-offset-2"
            >
              {d.suggestAnother}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-word`} className="text-sm font-bold">
                {d.suggestWord} <span className="font-medium text-ink-soft">· {d.suggestWordHint}</span>
              </label>
              <input
                ref={wordInput}
                id={`${id}-word`}
                lang="mt"
                required
                maxLength={60}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                className={`${field} h-12`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-desc`} className="text-sm font-bold">
                {d.suggestDescription} <span className="font-medium text-ink-soft">· {d.suggestDescriptionHint}</span>
              </label>
              <textarea
                ref={descInput}
                id={`${id}-desc`}
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${field} resize-y py-2.5 leading-snug`}
              />
            </div>
            {/* Hidden from people; a bot that fills in every field gets quietly ignored (see the script). */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={trap} onChange={(e) => setTrap(e.target.value)} className="absolute -left-[9999px] size-px opacity-0" />

            <div className="flex flex-col items-start gap-3">
              <button
                type="submit"
                disabled={status.s === "sending"}
                className="btn-block inline-flex min-h-12 items-center justify-center rounded-tile border-2 border-ink bg-book px-5 text-limestone-50 hover:brightness-110 disabled:cursor-wait disabled:opacity-80"
              >
                <span className="button-caps text-base leading-none">{status.s === "sending" ? d.suggestSending : d.suggestSend}</span>
              </button>
              {status.s === "error" && (
                <p role="alert" className="text-sm font-semibold text-[#a1301f]">
                  {status.busy ? d.suggestBusy : d.suggestError}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
