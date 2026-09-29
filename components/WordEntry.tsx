import { GABRA_URL, LICENCE_URL } from "@/lib/site";
import type { Dict } from "@/lib/i18n";
import type { AnswerEntry } from "@/lib/validate-data";

/** Today's word as a small dictionary entry: the one moment the game teaches something. */
export function WordEntry({
  entry,
  won,
  d,
  showLabel = true,
}: {
  entry: AnswerEntry;
  won: boolean;
  d: Dict;
  /** Off when the panel title already says "The word was". */
  showLabel?: boolean;
}) {
  return (
    <section className="stone rounded-tile border-2 border-ink bg-limestone-100 px-4 pb-3 pt-3 shadow-block-sm">
      {showLabel && <p className="mb-1 text-sm font-bold text-ink-soft">{won ? d.todaysWord : d.wordWas}</p>}
      <p className="display-caps text-4xl leading-none" lang="mt">
        {entry.word}
      </p>
      <p className="mt-2 text-base leading-snug">{entry.gloss}</p>
      {entry.root && (
        <p className="mt-1 text-sm text-ink-soft">
          {`${d.rootLabel}: `}
          <span lang="mt" className="font-bold tracking-wide text-ink">
            {entry.root}
          </span>
        </p>
      )}
      {entry.note && (
        <p className="mt-3 text-sm leading-snug">
          <span className="mr-1.5 inline-block rounded-tile bg-ochre px-1.5 py-px text-xs font-bold uppercase tracking-wide text-ink">
            {d.didYouKnow}
          </span>
          {entry.note}
        </p>
      )}
      <p className="mt-3 border-t border-limestone-300 pt-2 text-xs text-ink-soft">
        {`${d.meaningFrom} `}
        <a href={GABRA_URL} target="_blank" rel="noopener" className="font-semibold text-ink underline underline-offset-2">
          {d.credit}
        </a>
        {" · "}
        <a href={LICENCE_URL} target="_blank" rel="noopener license" className="underline underline-offset-2">
          CC BY 4.0
        </a>
      </p>
    </section>
  );
}
