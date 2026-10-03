# Kelma

A daily Maltese word game: five letters, six guesses, two modes (Normali and Tqila), each with its own daily word.

There is no backend. All puzzle data is static JSON in `data/kelma/`, and the browser picks today's entry from the date in `Europe/Malta` (`lib/day-index.ts`). One build serves every day until the data runs out.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest unit tests
npm run build        # checks the data, then does the static export to out/
npm start            # serves out/ on http://localhost:4173 (clean URLs + 404)
```

## Data contract

```
data/kelma/normali.json        Normali answers, indexed by day
data/kelma/tqila.json          Tqila answers, indexed by day
data/kelma/valid-guesses.json  every accepted guess (flat uppercase array)
```

Each answer entry is `{ day, word, gloss, root?, note? }`. `word` is exactly 5 Unicode characters, uppercase (GĦ and IE are two tiles). No difficulty tiers ship to the client.

`npm run build` runs `scripts/validate-data.mjs` first. It fails the build if an answer is missing from the guess list, a word isn't 5 characters, a day repeats or skips, or an entry has extra fields.

Words and meanings come from Ġabra (University of Malta, MLRS), CC BY 4.0. Ġabra's site (`mlrs.research.um.edu.mt`) has redirected to `um.edu.mt` since at least 29 Sep 2026, so the credit links to the MLRS GitHub (`GABRA_URL` in `lib/site.ts`). Keep a safe copy of the lexicon dump: the pipeline can no longer re-download it.

## Kelma ta' kuljum (word of the day)

The home page shows one rare word a day from `data/kelma/word-of-day.json`: Ġabra final tier 5, with a meaning, no flags, any length. To rebuild it from an updated sheet:

```bash
node scripts/import-word-of-day.mjs path/to/gabra-word-tiers-general.xlsx
```

The import shuffles the list in a fixed order. Day N shows entry N mod length, and the list wraps around after about four years. A word that's also a Kelma answer (in either mode, on any day) is skipped, so the word of the day never gives a puzzle away. Re-importing changes the schedule from that day on.

## Sellum (word ladder)

A daily ladder from a start word to a target in exactly 4 one-letter steps, with 3 lives. Any shortest route is accepted: the browser runs one breadth-first search back from the target over the shared guess list, and a word is accepted only if it's still exactly the right number of steps away.

```
data/sellum/puzzles.json        one entry per day: { day, start, target, routes, example }
data/sellum/glosses.json        word -> gloss, or { lemma, gloss } for inflected forms (loaded at game end)
data/source/answer-candidates.json   generator input: [{ word, tier, gloss, flags }]
```

Regenerate the schedule (365 days) and the glosses:

```bash
node scripts/build-sellum.ts
node scripts/build-sellum-glosses.mjs path/to/Kelma-word-tiers.xlsx
```

A pair qualifies when start and target are tier 1–3 with no flags, they're exactly 4 steps apart, there are at least 3 shortest routes in total, and at least 2 of those use only dictionary words (tier 1–5, no flags). The bar of 3 dictionary routes gave only 115 days. Start and target words rest for 60 days, pairs never repeat, and consecutive days don't share a start or target first letter. The build checks every puzzle (words in the list, distance exactly 4, a legal example, the route count, and no gaps in the days).

Sellum has its own epoch, `SELLUM_EPOCH` in `lib/day-index.ts` (provisional), and its own storage keys: `kelma:sellum:state` and `kelma:sellum:stats`.

## Permanent things (don't change after launch)

- `EPOCH` in `lib/day-index.ts` (day 0). Changing it shifts every saved game and streak.
- Storage keys in `lib/storage.ts`: `kelma:{normali,tqila}:{state,stats}`, `kelma:{lang,settings,seen-help}`.

## Open items before launch

- **Epochs:** `EPOCH` (Kelma, provisional `2026-09-29`) and `SELLUM_EPOCH` (provisional `2026-09-30`); set the real launch dates.
- **Maltese copy:** every string in `lib/i18n/mt.ts` is marked `// REVIEW` for a native speaker, as are the day and month names in `lib/day-index.ts`.
- **Real content:** the placeholder answers (7 days per mode) get replaced by the monthly pipeline, which writes the same files. The `SBULA` note is a placeholder.
- **Analytics:** `lib/analytics.ts` `track()` is a no-op stub. Pick a cookieless provider.
- **Site URL:** set `NEXT_PUBLIC_SITE_URL` so canonical/hreflang URLs point at the real domain.

## Checking contrast

`scripts/contrast-audit.js` can be pasted into the browser console on any page. It resolves colours through a canvas, blends alpha over the parents, and lists WCAG failures.
