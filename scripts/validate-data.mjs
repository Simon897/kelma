// Build-time content check. Runs before `next build` and fails it on any broken contract.
import { readFileSync } from "node:fs";
import { validateData, validateWordOfDay } from "../lib/validate-data.ts";

const read = (f) => JSON.parse(readFileSync(new URL(`../data/kelma/${f}`, import.meta.url), "utf8"));

const errors = [
  ...validateData({ normali: read("normali.json"), tqila: read("tqila.json") }, read("valid-guesses.json")),
  ...validateWordOfDay(read("word-of-day.json")),
];

if (errors.length) {
  console.error(`Kelma data check failed (${errors.length}):\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log("Kelma data check passed.");
