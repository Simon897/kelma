import { en } from "./en";
import { mt } from "./mt";

export type Lang = "mt" | "en";

/** Widen mt's literal types so en must have exactly the same keys and shapes. */
type Widen<T> = T extends (...args: infer A) => string
  ? (...args: A) => string
  : T extends readonly string[]
    ? string[]
    : T extends string
      ? string
      : { [K in keyof T]: Widen<T[K]> };

export type Dict = { [K in keyof typeof mt]: Widen<(typeof mt)[K]> };

// mt must also satisfy Dict (keeps the two directions honest).
const MT: Dict = mt;

export const dictionaries: Record<Lang, Dict> = { mt: MT, en };

export function t(lang: Lang): Dict {
  return dictionaries[lang];
}
