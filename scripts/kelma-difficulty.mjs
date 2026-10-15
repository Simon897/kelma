// Scores how hard each answer candidate is to solve, for scripts/build-kelma.mjs.
//
//   node scripts/kelma-difficulty.mjs      (about 5 minutes)
//
// Writes data/source/kelma-difficulty.json: [{ word, steps, traps }] for every 5-tile candidate.
// - steps: guesses a human-like solver needs. It knows every valid guess, opens with the best
//   common-letter word, then always plays a word that is still possible, picking the one that
//   splits the remaining words most evenly. A relative measure, not what a person would need.
// - traps: valid guesses one tile away from the word in place (the _ARRA problem).
import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));

/** Tiles as Kelma shows them: one per character (GĦ and IE are two tiles, as in lib/game.ts). */
export const tiles = (word) => Array.from(word);

/** Wordle feedback as one number (0 grey, 1 present, 2 correct per tile, base 3). */
function feedback(guess, answer) {
  const res = [0, 0, 0, 0, 0];
  const left = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) res[i] = 2;
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] !== 2 && left[guess[i]] > 0) {
      res[i] = 1;
      left[guess[i]]--;
    }
  }
  return res[0] + 3 * res[1] + 9 * res[2] + 27 * res[3] + 81 * res[4];
}

/** Lower is better: the sum of n·log2(n) over feedback groups. */
function split(guess, pool) {
  const groups = new Map();
  for (const a of pool) {
    const f = feedback(guess, a);
    groups.set(f, (groups.get(f) || 0) + 1);
  }
  let s = 0;
  for (const n of groups.values()) s += n * Math.log2(n);
  return s;
}

if (process.argv[1]?.endsWith("kelma-difficulty.mjs")) {
  const guesses = read("kelma/valid-guesses.json").map(tiles).filter((t) => t.length === 5);
  const join = (t) => t.join("");

  const presence = {};
  for (const t of guesses) for (const l of new Set(t)) presence[l] = (presence[l] || 0) + 1;
  const common = guesses
    .filter((t) => new Set(t).size === 5)
    .sort((a, b) => b.reduce((s, l) => s + presence[l], 0) - a.reduce((s, l) => s + presence[l], 0))
    .slice(0, 300);
  const sample = guesses.filter((_, i) => i % 4 === 0);
  let opener = common[0];
  let best = Infinity;
  for (const g of common) {
    const s = split(g, sample);
    if (s < best) [best, opener] = [s, g];
  }

  const solve = (answer) => {
    let pool = guesses;
    let guess = opener;
    let n = 1;
    while (join(guess) !== join(answer) && n < 12) {
      const f = feedback(guess, answer);
      pool = pool.filter((w) => feedback(guess, w) === f);
      let b = Infinity;
      for (const c of pool) {
        const s = split(c, pool);
        if (s < b) [b, guess] = [s, c];
      }
      n++;
    }
    return n;
  };
  const traps = (answer) => guesses.filter((w) => w.reduce((d, l, i) => d + (l !== answer[i]), 0) === 1).length;

  const out = read("source/answer-candidates.json")
    .filter((c) => tiles(c.word).length === 5)
    .map((c) => {
      const t = tiles(c.word);
      return { word: c.word, steps: solve(t), traps: traps(t) };
    });
  writeFileSync(new URL("../data/source/kelma-difficulty.json", import.meta.url), JSON.stringify(out) + "\n");
  console.log(`opener ${join(opener)}; scored ${out.length} candidates`);
}
