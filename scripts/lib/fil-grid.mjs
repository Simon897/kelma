// Fil's grid: 6 columns × 8 rows, every tile in exactly one word. Shared by the build script
// (scripts/build-fil.mjs), the checker (scripts/validate-fil.mjs) and the tests.
//
// Rules a finished puzzle keeps (checkPuzzle below tests every one):
// - Each word is a path through neighbouring tiles (8 directions), one letter per tile.
// - The 48 tiles are each used exactly once.
// - No two steps cross diagonally: a step (r,c)→(r+1,c+1) and a step (r,c+1)→(r+1,c) can't both exist,
//   whether they belong to two words or to the same one.
// - Each word can be traced on only one set of tiles, so the game can check the tiles, not the order.
// Tiles are single characters, as in Kelma: GĦ and IE take two tiles.

export const COLS = 6;
export const ROWS = 8;
export const N = COLS * ROWS;

export const chars = (w) => [...w];
const rowOf = (c) => Math.floor(c / COLS);
const colOf = (c) => c % COLS;

export const NEIGHBOURS = Array.from({ length: N }, (_, i) => {
  const out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = rowOf(i) + dr, c = colOf(i) + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) out.push(r * COLS + c);
    }
  return out;
});
export const adjacent = (a, b) => a !== b && Math.abs(rowOf(a) - rowOf(b)) <= 1 && Math.abs(colOf(a) - colOf(b)) <= 1;
const edgeKey = (a, b) => (a < b ? a * N + b : b * N + a);
/** The other diagonal of the 2×2 square a diagonal step a→b cuts across, or null for a straight step. */
function crossingKey(a, b) {
  if (rowOf(a) === rowOf(b) || colOf(a) === colOf(b)) return null;
  return edgeKey(rowOf(a) * COLS + colOf(b), rowOf(b) * COLS + colOf(a));
}

/** Seeded random numbers, so a build is repeatable. */
export function rng(seed) {
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return { rand, shuffle };
}

/** How many different sets of tiles in the grid spell w (order inside a set doesn't count). */
export function tileSets(grid, word) {
  const w = chars(word), L = w.length, used = new Array(N).fill(false), path = [], sets = new Set();
  const go = (c, i) => {
    if (grid[c] !== w[i]) return;
    path.push(c);
    if (i === L - 1) sets.add([...path].sort((a, b) => a - b).join(","));
    else {
      used[c] = true;
      for (const y of NEIGHBOURS[c]) if (!used[y]) go(y, i + 1);
      used[c] = false;
    }
    path.pop();
  };
  for (let c = 0; c < N; c++) go(c, 0);
  return sets.size;
}

/**
 * Lay out the theme words. Returns { grid, paths: [path per word] } or null. Words are placed one
 * at a time, always covering the first empty tile, so no gaps are left behind.
 */
export function layOut(words, { shuffle }, deadline) {
  const owner = new Array(N).fill(-1), letters = new Array(N), edges = new Set();
  const all = words.map(chars);
  const paths = new Array(all.length);
  const remaining = words.map((_, i) => i);

  const usable = (prev, nx) => {
    if (owner[nx] !== -1) return false;
    const x = crossingKey(prev, nx);
    return x === null || !edges.has(x);
  };
  const put = (wi, p) => {
    p.forEach((c, j) => ((owner[c] = wi), (letters[c] = all[wi][j])));
    const added = [];
    for (let i = 1; i < p.length; i++) {
      const e = edgeKey(p[i - 1], p[i]);
      edges.add(e);
      added.push(e);
    }
    paths[wi] = p;
    return () => {
      added.forEach((e) => edges.delete(e));
      p.forEach((c) => ((owner[c] = -1), (letters[c] = undefined)));
      paths[wi] = undefined;
    };
  };
  // A placed word with a second route through filled tiles can never lose it: give up on this branch.
  const unique = () => paths.every((p, i) => !p || tileSets(letters, all[i].join("")) === 1);
  const gapsOk = () => {
    if (!remaining.length) return true;
    const min = Math.min(...remaining.map((i) => all[i].length));
    const seen = new Array(N).fill(false);
    for (let s = 0; s < N; s++) {
      if (owner[s] !== -1 || seen[s]) continue;
      let size = 0;
      const st = [s];
      seen[s] = true;
      while (st.length) {
        const x = st.pop();
        size++;
        for (const y of NEIGHBOURS[x]) if (owner[y] === -1 && !seen[y]) (seen[y] = true), st.push(y);
      }
      if (size < min) return false;
    }
    return true;
  };

  // Paths for word w with letter k on `anchor`, grown both ways through empty tiles (at most `max`).
  // `own` holds the steps of the path so far, so a word can't cross itself either.
  function pathsThrough(w, k, anchor, max) {
    const L = w.length, path = new Array(L), out = [], own = new Set();
    path[k] = anchor;
    owner[anchor] = -2;
    const grow = (i, dir) => {
      if (out.length >= max) return;
      if (dir > 0 && i === L) return grow(k - 1, -1);
      if (dir < 0 && i < 0) return void out.push(path.slice());
      const prev = path[i - dir];
      for (const nx of shuffle([...NEIGHBOURS[prev]])) {
        if (!usable(prev, nx)) continue;
        const x = crossingKey(prev, nx);
        if (x !== null && own.has(x)) continue;
        const e = edgeKey(prev, nx);
        path[i] = nx;
        owner[nx] = -2;
        own.add(e);
        grow(i + dir, dir);
        own.delete(e);
        owner[nx] = -1;
      }
    };
    grow(k + 1, 1);
    owner[anchor] = -1;
    return out;
  }

  function solve() {
    if (Date.now() > deadline) return false;
    if (!remaining.length) return true;
    const first = owner.indexOf(-1);
    for (const ri of shuffle([...remaining.keys()])) {
      const wi = remaining[ri], w = all[wi];
      for (const k of shuffle([...w.keys()])) {
        for (const p of pathsThrough(w, k, first, 24)) {
          const undo = put(wi, p);
          remaining.splice(ri, 1);
          if (unique() && gapsOk() && solve()) return true;
          remaining.splice(ri, 0, wi);
          undo();
        }
      }
    }
    return false;
  }

  return solve() ? { grid: letters.slice(), paths: paths.slice() } : null;
}

/**
 * Check a finished puzzle against every rule. Returns a list of problems (empty when it's fine).
 * `p` is { id, grid, words: [{ word, path }] }.
 */
export function checkPuzzle(p) {
  const errors = [];
  const where = p.id ?? "?";
  if (!Array.isArray(p.grid) || p.grid.length !== N || p.grid.some((t) => typeof t !== "string" || chars(t).length !== 1))
    return [`${where}: the grid must be ${N} single-letter tiles`];
  const all = p.words ?? [];
  const seen = new Map();
  const edges = new Map();
  for (const w of all) {
    const ls = chars(w.word);
    const label = `${where}: ${w.word}`;
    if (!Array.isArray(w.path) || w.path.length !== ls.length) {
      errors.push(`${label}: its path has ${w.path?.length ?? 0} tiles for ${ls.length} letters`);
      continue;
    }
    w.path.forEach((c, i) => {
      if (!Number.isInteger(c) || c < 0 || c >= N) errors.push(`${label}: tile ${c} is off the grid`);
      else if (p.grid[c] !== ls[i]) errors.push(`${label}: letter ${i + 1} is ${ls[i]} but the tile says ${p.grid[c]}`);
      if (i > 0 && !adjacent(w.path[i - 1], c)) errors.push(`${label}: letters ${i} and ${i + 1} aren't on neighbouring tiles`);
      if (seen.has(c)) errors.push(`${label}: tile ${c} is also used by ${seen.get(c)}`);
      else seen.set(c, w.word);
    });
    for (let i = 1; i < w.path.length; i++) {
      const a = w.path[i - 1], b = w.path[i], x = crossingKey(a, b);
      if (x !== null && edges.has(x)) errors.push(`${label}: crosses ${edges.get(x)} diagonally`);
      edges.set(edgeKey(a, b), w.word);
    }
    if (tileSets(p.grid, w.word) !== 1) errors.push(`${label}: can be traced on more than one set of tiles`);
  }
  if (seen.size !== N) errors.push(`${where}: ${N - seen.size} tile(s) belong to no word`);
  return errors;
}

/** Pick 6–9 of a theme's words that add up to exactly 48 letters, or null. */
export function pickWords(candidates, { shuffle }, tries = 5000) {
  for (let t = 0; t < tries; t++) {
    const chosen = [];
    let sum = 0;
    for (const w of shuffle([...candidates])) {
      const L = chars(w).length;
      if (sum + L <= N) chosen.push(w), (sum += L);
      if (sum === N) break;
    }
    if (sum === N && chosen.length >= 6 && chosen.length <= 9) return chosen;
  }
  return null;
}

/** Every word in `dict` (a Set of uppercase words) that can be traced in the grid, 4+ letters. */
export function traceableWords(grid, dict, maxLen = 10) {
  const prefixes = new Set();
  for (const w of dict) {
    const ls = chars(w);
    for (let i = 1; i < ls.length; i++) prefixes.add(ls.slice(0, i).join(""));
  }
  const found = new Set(), used = new Array(N).fill(false);
  const go = (c, s, n) => {
    const t = s + grid[c];
    if (n >= 4 && dict.has(t)) found.add(t);
    if (n >= maxLen || !prefixes.has(t)) return;
    used[c] = true;
    for (const y of NEIGHBOURS[c]) if (!used[y]) go(y, t, n + 1);
    used[c] = false;
  };
  for (let c = 0; c < N; c++) go(c, "", 1);
  return found;
}
