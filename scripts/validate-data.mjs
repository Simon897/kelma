// Build-time content check. Runs before `next build` and fails it on any broken contract.
import { readFileSync } from "node:fs";
import { validateData, validateWordOfDay } from "../lib/validate-data.ts";
import { validateSellum } from "../lib/sellum/validate.ts";
import { validateGherq } from "../lib/gherq/validate.ts";

const read = (f, dir = "kelma") => JSON.parse(readFileSync(new URL(`../data/${dir}/${f}`, import.meta.url), "utf8"));

const errors = [
  ...validateData({ normali: read("normali.json"), tqila: read("tqila.json") }, read("valid-guesses.json")),
  ...validateWordOfDay(read("word-of-day.json")),
  ...validateSellum(read("puzzles.json", "sellum"), read("valid-guesses.json")),
  ...validateGherq(read("puzzles.json", "gherq"), read("lexicon.json", "gherq")),
];

if (errors.length) {
  console.error(`Kelma data check failed (${errors.length}):\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log("Kelma data check passed.");
