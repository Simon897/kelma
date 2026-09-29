import list from "../data/kelma/valid-guesses.json";

const VALID = new Set<string>(list as string[]);

export function isValidGuess(word: string): boolean {
  return VALID.has(word);
}
