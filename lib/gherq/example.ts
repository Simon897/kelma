import type { GherqWord } from "./game.ts";

/**
 * The K-T-B family on Għerq's how-to-play page (glosses from Ġabra). Because the page shows it
 * in full, the generator never schedules k-t-b as a daily root.
 */
export const EXAMPLE_ROOT = ["K", "T", "B"];
export const EXAMPLE_ROOT_KEY = "k-t-b";
export const EXAMPLE_FAMILY: GherqWord[] = [
  { word: "KTIB", alts: [], pos: "NOUN", gloss: "writing", points: 1 },
  { word: "KITBA", alts: [], pos: "NOUN", gloss: "writing; written text", points: 1 },
  { word: "KITEB", alts: [], pos: "VERB", gloss: "to write; to enrol sb.", points: 1 },
  { word: "KTIEB", alts: [], pos: "NOUN", gloss: "book; ledger", points: 1 },
  { word: "NKITEB", alts: [], pos: "VERB", gloss: "to be written; to enrol oneself", points: 1 },
  { word: "KTEJJEB", alts: [], pos: "NOUN", gloss: "booklet", points: 1 },
  { word: "KITTIEB", alts: [], pos: "NOUN", gloss: "writer", points: 1 },
  { word: "KITTIEBI", alts: [], pos: "ADJ", gloss: "tending to write", points: 3 },
];
