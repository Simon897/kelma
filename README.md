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

## Permanent things (don't change after launch)

- `EPOCH` in `lib/day-index.ts` (day 0). Changing it shifts every saved game and streak.
- Storage keys in `lib/storage.ts`: `kelma:{normali,tqila}:{state,stats}`, `kelma:{lang,settings,seen-help}`.

## Open items before launch

- **Epoch:** currently a provisional `2026-09-29`; set the real launch date.
- **Maltese copy:** every string in `lib/i18n/mt.ts` is marked `// REVIEW` for a native speaker, as are the day and month names in `lib/day-index.ts`.
- **Real content:** the placeholder answers (7 days per mode) get replaced by the monthly pipeline, which writes the same files. The `SBULA` note is a placeholder.
- **Analytics:** `lib/analytics.ts` `track()` is a no-op stub. Pick a cookieless provider.
- **Site URL:** set `NEXT_PUBLIC_SITE_URL` so canonical/hreflang URLs point at the real domain.

## Checking contrast

`scripts/contrast-audit.js` can be pasted into the browser console on any page. It resolves colours through a canvas, blends alpha over the parents, and lists WCAG failures.
