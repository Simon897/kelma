/**
 * The Sellum word graph: words are nodes, and two words are neighbours when they differ in
 * exactly one tile. Dependency-free so the browser, the build-time validator and the puzzle
 * generator all share it. Tiles follow Kelma's rule: one Unicode character each (GĦ, IE = 2).
 */

export const LADDER_STEPS = 4;

export const tilesOf = (word: string): string[] => Array.from(word);

/** Number of positions where two words differ, or -1 if their lengths differ. */
export function diffCount(a: string, b: string): number {
  const x = tilesOf(a);
  const y = tilesOf(b);
  if (x.length !== y.length) return -1;
  let n = 0;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) n++;
  return n;
}

export interface WordGraph {
  has(word: string): boolean;
  neighbours(word: string): string[];
}

/** Builds the graph with wildcard buckets ("B*ĦAR"), so neighbour lookups are fast. */
export function buildGraph(words: Iterable<string>): WordGraph {
  const set = new Set(words);
  const buckets = new Map<string, string[]>();
  const keys = (w: string) => {
    const t = tilesOf(w);
    return t.map((_, i) => `${i}:${[...t.slice(0, i), "*", ...t.slice(i + 1)].join("")}`);
  };
  for (const w of set) {
    for (const k of keys(w)) {
      const b = buckets.get(k);
      if (b) b.push(w);
      else buckets.set(k, [w]);
    }
  }
  const cache = new Map<string, string[]>();
  return {
    has: (w) => set.has(w),
    neighbours(w) {
      let n = cache.get(w);
      if (!n) {
        n = [];
        for (const k of keys(w)) for (const v of buckets.get(k) ?? []) if (v !== w) n.push(v);
        cache.set(w, n);
      }
      return n;
    },
  };
}

/** Breadth-first search from `from`, up to `maxDepth`. Returns word -> shortest distance. */
export function distancesFrom(graph: WordGraph, from: string, maxDepth = LADDER_STEPS): Map<string, number> {
  const dist = new Map<string, number>([[from, 0]]);
  let frontier = [from];
  for (let d = 1; d <= maxDepth && frontier.length; d++) {
    const next: string[] = [];
    for (const w of frontier) {
      for (const v of graph.neighbours(w)) {
        if (!dist.has(v)) {
          dist.set(v, d);
          next.push(v);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

/**
 * All shortest routes from `start` to the target whose distance map is `toTarget`,
 * optionally only through words that pass `allow`. Routes include both ends.
 */
export function shortestRoutes(
  graph: WordGraph,
  start: string,
  toTarget: ReadonlyMap<string, number>,
  allow: (w: string) => boolean = () => true,
  limit = Infinity,
): string[][] {
  const out: string[][] = [];
  const d0 = toTarget.get(start);
  if (d0 === undefined) return out;
  const walk = (path: string[]) => {
    if (out.length >= limit) return;
    const here = path[path.length - 1];
    const d = toTarget.get(here)!;
    if (d === 0) {
      out.push([...path]);
      return;
    }
    for (const v of graph.neighbours(here)) {
      if (toTarget.get(v) === d - 1 && allow(v)) {
        path.push(v);
        walk(path);
        path.pop();
      }
    }
  };
  walk([start]);
  return out;
}

/** Counts shortest routes without listing them (dynamic programming over distance layers). */
export function countShortestRoutes(
  graph: WordGraph,
  start: string,
  toTarget: ReadonlyMap<string, number>,
  allow: (w: string) => boolean = () => true,
): number {
  const memo = new Map<string, number>();
  const count = (w: string): number => {
    const d = toTarget.get(w);
    if (d === undefined) return 0;
    if (d === 0) return 1;
    const m = memo.get(w);
    if (m !== undefined) return m;
    let n = 0;
    for (const v of graph.neighbours(w)) if (toTarget.get(v) === d - 1 && allow(v)) n += count(v);
    memo.set(w, n);
    return n;
  };
  return allow(start) || toTarget.get(start) === 0 ? count(start) : 0;
}
