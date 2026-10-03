"use client";

import { t, type Lang } from "@/lib/i18n";
import { EXAMPLE_LADDER } from "@/lib/sellum/example";
import { LadderBoard } from "./LadderBoard";

/** A finished ladder for the how-to-play page, drawn with the real board. */
export function ExampleLadder({ lang }: { lang: Lang }) {
  const [start, a, b, c, target] = EXAMPLE_LADDER;
  return (
    <div role="img" aria-label={EXAMPLE_LADDER.join(", ")} className="mx-auto h-[340px] max-w-[300px]">
      <div aria-hidden className="pointer-events-none flex h-full">
        <LadderBoard
          start={start}
          target={target}
          rows={[
            { kind: "locked", word: a },
            { kind: "locked", word: b },
            { kind: "locked", word: c },
          ]}
          flip={null}
          shakeKey={0}
          celebrate
          d={t(lang)}
        />
      </div>
    </div>
  );
}
