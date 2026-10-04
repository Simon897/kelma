// Suggests a Semitic root for a dictionary word that has none, for a human to approve.
//
// Two kinds of evidence, both needed for a confident suggestion:
// - Letters: the root's radicals appear in order among the word's consonants, with only the
//   extra letters Maltese word patterns add (M-/T-/N-/S- before, -T/-J/-N after, a T or J/W
//   inside), and weak radicals (J, W, ', GĦ) allowed to drop out.
// - Meaning: the word's English gloss shares words with the glosses of that root's family.

const VOWEL = /^[AEIOU]$/u;
const WEAK = new Set(["J", "W", "'", "GĦ", "H"]);
const PREFIX = new Set(["M", "T", "N", "S"]);
const SUFFIX = new Set(["T", "J", "N"]);
const INFIX = new Set(["T", "J", "W"]);
// Endings that mark Romance/English loanwords (which have no Semitic root).
const LOAN_END = /(ZZJONI|ZZJONIJIET|JONI|IŻMU|IST|ISTA|ISTI|ITÀ|ARJU|ARJA|ENT|ENTI|MENT|URA|ABBLI|IBBLI|IKU|IKA|ATUR|ETT|ISSIMU|U)$/u;

/** Maltese letters as tokens (GĦ is one letter), consonants only, doubled letters collapsed. */
export function skeleton(word) {
  const toks = word.toLocaleUpperCase("mt").match(/GĦ|IE|./gu) ?? [];
  const cons = toks.filter((t) => t !== "IE" && !VOWEL.test(t));
  return cons.filter((t, i) => t !== cons[i - 1]);
}

export const radicalsOf = (root) =>
  root
    .split("-")
    .map((r) => r.toLocaleUpperCase("mt"))
    .filter((r, i, a) => r !== a[i - 1]);

/**
 * How well the word's letters fit the root: null if they can't, otherwise a score
 * (3 = the radicals and nothing else; less for each pattern letter or dropped weak radical).
 */
export function letterFit(word, root) {
  const s = skeleton(word);
  const r = radicalsOf(root);
  let best = null;
  // Try every way of matching radicals to letters in order (words are short, so this is cheap).
  const walk = (ri, si, drops, used) => {
    if (ri === r.length) {
      const first = used.find((u) => u >= 0) ?? 0;
      const last = [...used].reverse().find((u) => u >= 0) ?? s.length - 1;
      const pre = s.slice(0, first);
      const post = s.slice(last + 1);
      const inner = s.slice(first, last + 1).filter((_, i) => !used.includes(first + i));
      if (pre.length > 2 || !pre.every((t) => PREFIX.has(t))) return;
      if (post.length > 2 || !post.every((t) => SUFFIX.has(t))) return;
      if (inner.length > 1 || !inner.every((t) => INFIX.has(t))) return;
      const score = 3 - 0.5 * (pre.length + post.length + inner.length) - drops;
      if (best === null || score > best) best = score;
      return;
    }
    for (let i = si; i < s.length; i++) if (s[i] === r[ri]) walk(ri + 1, i + 1, drops, [...used, i]);
    if (WEAK.has(r[ri]) && drops < 1) walk(ri + 1, si, drops + 1, [...used, -1]);
  };
  if (r.filter((x) => !WEAK.has(x)).length >= 2) walk(0, 0, 0, []);
  return best;
}

const STOP = new Set("to the a an of in on at for by with from as or and be is are was being been one sb sth sb. sth. it its into up out off over very not no that this which who someone something person thing things kind sort way make made do does get give take have has".split(" "));
/** Content words of a gloss, crudely stemmed. */
export function glossWords(gloss) {
  return new Set(
    (gloss ?? "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => w.replace(/(ings|ing|ness|ers|er|ies|ied|es|ed|ly|s)$/, "").replace(/(.)\1$/, "$1"))
      .filter((w) => w.length > 2),
  );
}

export const isLoanLike = (word) => LOAN_END.test(word.toLocaleUpperCase("mt"));

/**
 * Ranked root suggestions for a word: [{ root, letters, meaning, score, shared }].
 * `families`: root -> [{ word, gloss }].
 */
export function suggestRoots(word, gloss, families, familyWords) {
  const mine = glossWords(gloss);
  const out = [];
  for (const [root, members] of families) {
    const letters = letterFit(word, root);
    if (letters === null) continue;
    const shared = [...mine].filter((w) => familyWords.get(root).has(w));
    const meaning = Math.min(shared.length, 2);
    // P and V are almost never in native Semitic words; loanword endings count against too.
    const score = letters + 2 * meaning - (isLoanLike(word) ? 2 : 0) - (/[PV]/u.test(word) ? 1.5 : 0);
    out.push({ root, letters, meaning, score, shared, size: members.length });
  }
  return out.sort((a, b) => b.score - a.score || b.size - a.size);
}

/** High: letters and meaning both agree. Medium: one of them strongly. Otherwise not worth asking. */
export function confidence(s) {
  if (!s) return null;
  if (s.meaning >= 1 && s.letters >= 2 && s.score >= 4) return "high";
  if (s.meaning >= 1 && s.score >= 2.5) return "medium";
  if (s.letters >= 3 && s.score >= 3) return "medium";
  return null;
}
