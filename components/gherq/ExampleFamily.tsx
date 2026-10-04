"use client";

import { EXAMPLE_FAMILY, EXAMPLE_ROOT } from "@/lib/gherq/example";
import { byLengthThenAlpha } from "@/lib/gherq/game";
import { t, type Lang } from "@/lib/i18n";
import { FoundCard, RootTiles } from "./Parts";

/** The K-T-B family, drawn with the game's own root tiles and found-word cards. */
export function ExampleFamily({ lang }: { lang: Lang }) {
  const d = t(lang);
  const words = [...EXAMPLE_FAMILY].sort((a, b) => byLengthThenAlpha(a.word, b.word));
  return (
    <div className="space-y-3">
      <div className="rounded-tile bg-soil px-3 py-3">
        <RootTiles root={EXAMPLE_ROOT} onSoil />
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {words.map((w) => (
          <FoundCard key={w.word} word={w} d={d} />
        ))}
      </ul>
    </div>
  );
}
