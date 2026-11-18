// Checks every Fil puzzle against the grid rules: all 48 tiles used exactly once, no diagonal
// crossings (a word crossing itself included), every word spelt along its path, and each
// word traceable on only one set of tiles. Also checks the fields the game reads.
//
//   node scripts/validate-fil.mjs                 (checks data/fil/puzzles.json)
//   node scripts/validate-fil.mjs other.json      (checks another file)
//
// Exits with 1 if any puzzle fails. scripts/build-fil.mjs regenerates the failing layouts.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { checkPuzzle } from "./lib/fil-grid.mjs";

/** All problems in a list of puzzles, each prefixed with the puzzle's week and id. */
export function validateFil(puzzles) {
  const errors = [];
  if (!Array.isArray(puzzles) || !puzzles.length) return ["Fil: no puzzles"];
  puzzles.forEach((p, i) => {
    const where = `Fil week ${i + 1} (${p.id ?? "?"})`;
    if (p.week !== i + 1) errors.push(`${where}: week is ${p.week}, expected ${i + 1}`);
    for (const k of ["mt", "en"]) {
      if (!p.theme?.[k]) errors.push(`${where}: no theme.${k}`);
    }
    for (const w of p.words ?? []) if (!w.gloss) errors.push(`${where}: ${w.word} has no English meaning`);
    errors.push(...checkPuzzle(p).map((e) => e.replace(/^[^:]+:/, `${where}:`)));
  });
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] ?? new URL("../data/fil/puzzles.json", import.meta.url);
  const puzzles = JSON.parse(readFileSync(file, "utf8"));
  const errors = validateFil(puzzles);
  const failing = new Set(errors.map((e) => e.match(/^Fil week (\d+)/)?.[1]).filter(Boolean));
  if (errors.length) {
    console.error(`Fil check failed: ${failing.size} of ${puzzles.length} puzzle(s), ${errors.length} problem(s):\n  ` + errors.join("\n  "));
    process.exit(1);
  }
  console.log(`Fil check passed: ${puzzles.length} puzzles.`);
}
