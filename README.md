# Kelma

A daily Maltese word game: five letters, six guesses, two modes (Normali and Diffiċli; the code and URL still call it `tqila`), each with its own daily word.

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

The lists are built by how hard each word is to solve, not just how common it is. `scripts/kelma-difficulty.mjs` (about 5 minutes) has a solver play every candidate and writes `data/source/kelma-difficulty.json`; `scripts/build-kelma.mjs --from N` then fills days N–364. Normali takes tier 1–2 words only, every tier-1 word before any tier-2 word, and within a tier the easiest to solve (few repeats, few unusual letters such as X, Ż or Q, few one-letter-off traps); Diffiċli takes the hardest that the solver still gets in 6 guesses. Days before N are never changed, so pass tomorrow's day index. Words you approve by hand go in `data/source/kelma-approved.json` (`{ word, tier, gloss, note }`): they join the candidates with that spelling and meaning even if the sheet flags them or has no meaning, and must also be in `valid-guesses.json`. Words you reject by hand go in `data/source/kelma-rejected.json` (`{ word, note }`): they are never answers in either mode.

```bash
node scripts/kelma-difficulty.mjs
node scripts/build-kelma.mjs --from 17
```

`npm run build` runs `scripts/validate-data.mjs` first. It fails the build if an answer is missing from the guess list, a word isn't 5 characters, a day repeats or skips, or an entry has extra fields.

Words and meanings come from Ġabra (University of Malta, MLRS), CC BY 4.0. Ġabra's site (`mlrs.research.um.edu.mt`) has redirected to `um.edu.mt` since at least 29 Sep 2026, so the credit links to the MLRS GitHub (`GABRA_URL` in `lib/site.ts`). Keep a safe copy of the lexicon dump: the pipeline can no longer re-download it.

## Kelma tal-llum (word of the day)

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
node scripts/build-sellum.ts --from 18   # tomorrow's day index
node scripts/build-sellum-glosses.mjs path/to/Kelma-word-tiers.xlsx
```

A pair qualifies when start and target are tier 1–3 with no flags, they differ in exactly 4 places and are 4 steps apart (so every step puts one of the target's letters in place, never a detour through a letter the target doesn't have), there are at least 2 shortest routes in total, and at least 1 of those uses only dictionary words (tier 1–5, no flags). That gives 418 pairs; until day 17 ladders could detour. `--from N` keeps days before N. Start and target words rest for 45 days, pairs never repeat, and consecutive days don't share a start or target first letter. The build checks every puzzle (words in the list, distance exactly 4, a legal example, the route count, and no gaps in the days).

Sellum has its own epoch, `SELLUM_EPOCH` in `lib/day-index.ts` (provisional), and its own storage keys: `kelma:sellum:state` and `kelma:sellum:stats`.

## Għerq (root words)

Each day gives one root (K-T-B). The player finds the dictionary words that grow from it, scoring points by rarity (tiers 1–2: 1, tier 3: 2) towards five stars. Uncommon and rare words (tiers 4–5, or no data) are bonus words: 3 points and a golden pod if found, but never needed for the stars, never hinted and not in the length counts. There are no lives or time limit. Hints reveal the meaning of the lowest-point word not yet found. Giving up shows the whole family; of the bonus words, only those found are listed, with a count of the rest. A plural, feminine or verb form of one of today's words gets a hint towards its dictionary form instead of "not a word".

```
data/gherq/puzzles.json   one entry per day: { day, root, words: [{ word, alts, pos, gloss, points }] }
data/gherq/lexicon.json     spelling -> root (or roots, or null): separates "not from this root" from "not a word"; lazy-loaded
data/gherq/forms.json       plural/feminine/verb form of a puzzle word -> { root: "pl" | "f" | "verb" }: "try the singular"; lazy-loaded
data/source/lexemes.json    generator input: [{ word, alts, root, pos, gloss, tier, flags }]
data/source/wordforms.json  generator input: { HEADWORD: { FORM: kind } }
data/source/word-sheet.json tiers and flags from the word-tiers sheet
```

```bash
node scripts/import-gabra.mjs path/to/gabra   # the unpacked dump folder (lexemes.bson, wordforms.bson)
node scripts/build-gherq.ts
```

The generator keeps plain three-letter roots (no weak J, W or ' in the middle or at the end, so no Ħ-J-N or B-N-J; a W or J at the start is fine) with 6–20 core (tier 1–3) noun/verb/adjective words, at least 3 of them worth 1 point; bonus words come on top. The build rejects any other root. It puts easier roots early in the week, never lets consecutive days share a radical, and never repeats a root within 365 days. It skips k-t-b, which the how-to-play page shows in full.

`lexemes.json` is every verified Ġabra headword (not pending, archaic, hypothetical, multi-word, a proper noun or a place name) with its alternative spellings, from the dump `gabra_data_2026-06-01.tar.gz`. Tiers and flags come from `word-sheet.json` (`node scripts/placeholder-gherq-lexemes.mjs <xlsx>`); a word the sheet doesn't have has no tier, so it is a bonus word. Core words still need a tier, which is why there are 57 days. Days already in `puzzles.json` keep their root when rebuilding, so played puzzles don't change. Ġabra's site no longer serves the dump: keep a safe copy.

Many sheet words have no root. To fill the gaps by hand:

```bash
node scripts/make-root-review.mjs     # writes gherq-root-review.xlsx: a suggested root per word, to approve or reject
node scripts/apply-root-review.mjs    # reads the answers into data/source/root-review.json and lexemes.json
node scripts/build-gherq.ts           # rebuilds the puzzles
```

Answers in `data/source/root-review.json` (word -> root, or null for no root) are kept: a re-import of the sheet applies them again, and answered words aren't asked again.

Għerq has its own epoch, `GHERQ_EPOCH` in `lib/day-index.ts` (provisional), and storage keys `kelma:gherq:{state,stats,tracked,visited,seen-help}`.

The cat in the scene has idles and reactions (`components/gherq/Cat.tsx`, scheduled by `lib/gherq/cat-scheduler.ts`). In `npm run dev`, add `?catdebug` to `/gherq` for a panel that forces each pose and plays each idle and reaction.

## The street on the home page

`components/StreetScene.tsx` animates a felt-and-paper Maltese street: parallax on desktop (sky, far roofs, street and pavement move at different depths with the mouse), one plate on phones, and over it the sun, clouds, bunting, washing, the bell and pigeons, butterflies, the lantern, Daisy (blinks, ears, tail) and the neighbour who waters her geraniums. The art is in `data/source/street-scene/` (made in ChatGPT); `node scripts/build-street-scene.mjs` cuts it into `public/media/scene/` and measures every point the animation uses into `components/street-scene-geometry.json`. Replace a source image and run it again; the street must keep its layout (2000×750, door in the same place), since the window, lantern and bell are measured at fixed spots in the script.

## Dizzjunarju (the dictionary)

`/dizzjunarju` is the whole word list as a book: pages that turn, letter tabs, a search, a random-word button. Wide screens show the open book, scaled to fit; under 900px it shows one page at a time, sized to the screen. The cover is `public/media/dizzjunarju-cover.webp` (2:3, no lettering: the title is set over it in the page), and the book's green is `--color-book` / `--color-book-deep` in `app/globals.css`, sampled from that art. The book always closes on an end page, `public/media/dizzjunarju-end.webp` (the cat asleep on a pile of books), with "It-Tmiem" set over it. Each visit starts with the closed book opening (about 2 seconds; searching or jumping to a letter skips it, and with reduced motion it is a short cross-fade). The timings are `OPENING` at the top of `components/dizzjunarju/DictionaryBook.tsx`.

```
data/dizzjunarju/words.json          one row per entry: [word, label, meaning, root, tier, number, forms to show?]
data/dizzjunarju/forms.json          for each row, every other form of the word (for the search; loaded after the entries)
data/source/dizzjunarju-forms.json   forms added by hand: [{ word, pos?, kind, form, note }]
public/dizzjunarju-search/embeddings.bin    vectors for the "related words" search (6.9 MB, loaded on demand)
```

```bash
node scripts/build-dizzjunarju.mjs path/to/gabra     # the unpacked dump folder
npm install --no-save @huggingface/transformers       # once, for the next step only
node scripts/build-dizzjunarju-embeddings.mjs
```

Only clean sheet rows go in (`data/source/word-sheet.json`: no flags, with a meaning), and each must match a verified Ġabra entry exactly or the build stops. A row whose only flag is "archaic" goes in as well, labelled `ark.` after its part of speech and given tier 5 (the sheet's tier counts the spelling, and an old word often shares its spelling with a common one). Hypothetical rows stay out. No proper nouns and no English-only words: the few that the sheet doesn't flag are listed, with reasons, in `EXCLUDE` at the top of the build script. The word is spelt as Ġabra spells it (Malti, Ingliż). Nouns get their gender from Ġabra (the entry's own, or the word form spelt like the headword); where Ġabra gives none or both, the label is plain "n.". Words spelt the same are numbered, most common first. Meanings are the sheet's, word for word.

Each entry carries the word's other forms from Ġabra. Ġabra mixes collected forms with ones built by rule (it gives *badtejn* as the dual of *bajd*) and nothing marks which is which, so an entry prints only the safest, one of each: a noun's plural (`pl.`), unless the headword is a collective, and an adjective's feminine (`f.`), plural and comparative (`komp.`). Everything else is searchable but not printed: single items of collectives, collectives, further plurals, a noun's other-gender form, and a verb's plain conjugation (no object or negative endings). So typing kotba, tifla or jikteb finds ktieb, tifel or kiteb, and the suggestion shows the form that matched. Ġabra's duals are not used at all, even for the search.

Forms you add by hand in `data/source/dizzjunarju-forms.json` are always printed, under their kind (`sing` one of a collective, `coll`, `f`, `m`, `pl`, `dual`, `comp`): that is how bebbux shows *sing.* bebbuxu, bebbuxa.

Rebuild the vectors whenever `words.json` changes: they are indexed by row, and the page ignores a file whose counts don't match. A test checks the two agree.

The search gives direct matches at once (Maltese words, typed with or without ġ ħ ż ċ, and English meanings), then "related words": entries whose meaning is close to the query even with no word in common. That part runs in the browser with the model `all-MiniLM-L6-v2`. The first related search downloads the model (about 25 MB) from Hugging Face and its library from jsDelivr (`lib/dizzjunarju-related.ts`); if either fails, the search just has no related words. It is skipped for queries that are Maltese words.

Unverified ("pending") sheet words are not in the dictionary. `node scripts/make-dictionary-review.mjs` writes `dizzjunarju-review.xlsx` to approve, correct or reject them; its "Archaic?" column marks an approved word for the `ark.` label. Running it again keeps the answers already in the sheet. The step that applies the answers isn't written yet.

The page used to show Maltese words for everyday things, one carousel per category. That is kept but not shown: `data/words/`, the drawings in `public/{hwawar,frott-u-haxix,id-dar,annimali,hut}/`, `lib/dizzjunarju.ts` and `components/dizzjunarju/WordCarousel.tsx`.

The suggestion box under the book (`components/dizzjunarju/SuggestBox.tsx`) lets anyone suggest a missing word, with an optional description. When a search has no exact match, the results end with a link that fills the box in. Suggestions are anonymous and go to a Google Sheet through a Google Apps Script web app: `scripts/suggestion-box.gs` holds the script and its setup steps, and its URL goes in `SUGGEST_URL` in `lib/site.ts`. Each word gets one row, with a count of how many times it was suggested.

## Fil (weekly theme word search)

A new puzzle every Sunday at midnight (Malta time): a 6×8 grid where every tile belongs to a word on the theme, which the banner shows ("Il-familja"). Earlier weeks stay playable from the week tabs, which tick once solved. Tiles are single characters, as in Kelma: GĦ and IE take two.

Players drag across tiles or tap them one by one (tap the last one again, or press Ikkonferma, to confirm); dragging back onto the tile before steps back. A wrong trace shakes; a word already found says "Diġà sibtha". Every 3 other words of 4+ letters fill the Ħjiel button, and a hint outlines the tiles of one unfound word, picked at random; the next hint waits until that word is found. The other words found are listed under the buttons. Found words turn green, and when the puzzle is solved every word is listed with its English meaning.

```
data/source/fil-themes.json   one theme per week: id, theme (mt/en), candidate words
data/fil/puzzles.json         built puzzles: grid, words with paths and meanings, bonus words
```

```bash
node scripts/build-fil.mjs      # lays out new or failing puzzles; keeps every layout that passes
node scripts/validate-fil.mjs   # also runs in npm run build (scripts/validate-data.mjs)
```

The check (`scripts/lib/fil-grid.mjs`, `checkPuzzle`) requires: all 48 tiles used exactly once, no two steps crossing diagonally (a word crossing itself counts too), every word spelt along neighbouring tiles, and each word traceable on only one set of tiles (the game checks tiles, not order). A puzzle that passes keeps its layout on rebuild, so a published week never changes; one that fails is laid out again with exactly the same words. A new week takes 6–9 of its theme's words adding up to 48 letters. Theme words must be Dizzjunarju headwords (their meanings come from `data/dizzjunarju/words.json`). Bonus words are the clean word-sheet words of 4+ letters that can be traced in that grid.

The five puzzles in `data/fil/puzzles.json` last until Sunday 13 December 2026 (week 5); add themes to `data/source/fil-themes.json` and run the build before then. Until a new week is added, the game keeps showing the last one.

Progress is saved per week (`kelma:fil:week:N`): found words, bonus words, hint credit, the outlined word and hints used.

## Permanent things (don't change after launch)

- `EPOCH` in `lib/day-index.ts` (day 0). Changing it shifts every saved game and streak.
- Storage keys in `lib/storage.ts`: `kelma:{normali,tqila}:{state,stats}`, `kelma:{lang,settings,seen-help}`, Fil's `kelma:fil:week:N`, `kelma:fil:seen-help`.
- `FIL_EPOCH` in `lib/day-index.ts` (week 0, Sunday `2026-11-15`, when Fil went live). Changing it renumbers every week.

## Open items before launch

- **Epochs:** `EPOCH` (Kelma, provisional `2026-09-29`), `SELLUM_EPOCH` (provisional `2026-09-29`), `GHERQ_EPOCH` (provisional `2026-09-30`); set the real launch dates. (`FIL_EPOCH` is set: Sunday `2026-11-15`.)
- **Maltese copy:** every string in `lib/i18n/mt.ts` is marked `// REVIEW` for a native speaker, as are the day and month names in `lib/day-index.ts`.
- **Real content:** the placeholder answers (7 days per mode) get replaced by the monthly pipeline, which writes the same files. The `SBULA` note is a placeholder.
- **Analytics:** `lib/analytics.ts` `track()` is a no-op stub. Pick a cookieless provider.
- **Suggestion box:** deploy `scripts/suggestion-box.gs` and set `SUGGEST_URL`; until then the form shows an error.
- **Site URL:** set `NEXT_PUBLIC_SITE_URL` so canonical/hreflang URLs point at the real domain.

## Checking contrast

`scripts/contrast-audit.js` can be pasted into the browser console on any page. It resolves colours through a canvas, blends alpha over the parents, and lists WCAG failures.
