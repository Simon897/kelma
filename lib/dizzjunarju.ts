import herbsSpices from "../data/words/herbs-spices.json";
import { asset } from "./site";

/**
 * The Dizzjunarju: everyday things whose Maltese names lose out to the English word, one list per
 * category. Only entries the editor has checked are shown; each has a drawing at public/<dir>/<key>.svg.
 */
export type CategoryKey = "herbs-spices";

export interface DictWord {
  key: string;
  en: string;
  mt: string;
  alts: string[];
  /** the drawing's URL, base path included */
  src: string;
}

interface Entry {
  key: string;
  en: string;
  mt: string | null;
  alts: string[];
  checked: boolean;
}

/** Categories in picker order, each with the folder its drawings live in. */
const CATEGORIES: { key: CategoryKey; dir: string; words: Entry[] }[] = [{ key: "herbs-spices", dir: "hwawar", words: herbsSpices.words as Entry[] }];

export const CATEGORY_KEYS: CategoryKey[] = CATEGORIES.map((c) => c.key);

export function categoryWords(key: CategoryKey): DictWord[] {
  const c = CATEGORIES.find((x) => x.key === key)!;
  return c.words
    .filter((w): w is Entry & { mt: string } => w.checked && w.mt !== null)
    .map((w) => ({ key: w.key, en: w.en, mt: w.mt, alts: w.alts, src: asset(`/${c.dir}/${w.key}.svg`) }));
}

/** First letter up, as the cards show it: "kurrat irqieq" -> "Kurrat irqieq". */
export const capitalise = (s: string) => s.charAt(0).toLocaleUpperCase("mt") + s.slice(1);
