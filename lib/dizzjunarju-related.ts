import type { Entry } from "./dizzjunarju-book";
import { asset } from "./site";

/**
 * "Related words": finds entries whose meaning is close to what the reader typed, even with no
 * word in common ("physician" finds tabib, whose meaning says "doctor").
 *
 * It runs in the browser. The first search downloads a small language model (about 25 MB, cached
 * by the browser afterwards) from Hugging Face, the library that runs it from jsDelivr, and the
 * site's own vectors (public/dizzjunarju-search/embeddings.bin, built by
 * scripts/build-dizzjunarju-embeddings.mjs with the same model). If any of that fails, the search
 * simply has no related words.
 */
const LIBRARY = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js";
const MODEL = "Xenova/all-MiniLM-L6-v2";
const DIM = 384;
/** Below this similarity a meaning isn't related enough to show. Maltese words typed in score under it. */
const MIN_SIMILARITY = 0.55;

export interface Related {
  /** Entry indexes, closest meaning first. */
  search(query: string): Promise<number[]>;
}

type Embedder = (text: string, options: { pooling: "mean"; normalize: boolean }) => Promise<{ data: Float32Array }>;

let promise: Promise<Related> | null = null;

export function loadRelated(ents: Entry[]): Promise<Related> {
  promise ??= load(ents).catch((e) => {
    promise = null;
    throw e;
  });
  return promise;
}

async function load(ents: Entry[]): Promise<Related> {
  const library = LIBRARY;
  const [mod, buf] = await Promise.all([
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ library) as Promise<{ pipeline: (task: string, model: string, options: { dtype: string }) => Promise<Embedder> }>,
    fetch(asset("/dizzjunarju-search/embeddings.bin")).then((r) => {
      if (!r.ok) throw new Error("no vectors file");
      return r.arrayBuffer();
    }),
  ]);
  const view = new DataView(buf);
  const entries = view.getUint32(0, true);
  const senses = view.getUint32(4, true);
  if (entries !== ents.length || buf.byteLength !== 8 + senses * 2 + senses * DIM) throw new Error("the vectors don't match the word list");
  const owner = new Uint16Array(buf.slice(8, 8 + senses * 2));
  const vectors = new Int8Array(buf, 8 + senses * 2);
  // The vectors are indexed by row of words.json; the book works in sorted order.
  const sorted = new Int32Array(entries);
  ents.forEach((e, i) => (sorted[e.ri] = i));
  const embed = await mod.pipeline("feature-extraction", MODEL, { dtype: "q8" });

  return {
    async search(query) {
      const q = (await embed(query, { pooling: "mean", normalize: true })).data;
      const best = new Map<number, number>();
      for (let i = 0; i < senses; i++) {
        let s = 0;
        const o = i * DIM;
        for (let j = 0; j < DIM; j++) s += q[j] * vectors[o + j];
        s /= 127;
        if (s < MIN_SIMILARITY) continue;
        const id = sorted[owner[i]];
        if ((best.get(id) ?? 0) < s) best.set(id, s);
      }
      // Closest meaning first; between near-equal ones, the more common word.
      const rank = (id: number) => best.get(id)! - 0.015 * ents[id].tier;
      return [...best.keys()].sort((a, b) => rank(b) - rank(a)).slice(0, 12);
    },
  };
}
