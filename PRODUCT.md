# Product

## Register

product

## Users

Maltese speakers and learners of Maltese, playing for about two minutes a day, mostly on a phone. Two groups matter equally: native and fluent speakers who want a real challenge (Kelma Tqila, Sellum), and learners at beginner or intermediate level (Kelma Normali). They arrive once a day, play, maybe share a result, and leave. The learner half is why every game ends by teaching: each word is shown with its Ġabra meaning.

## Product Purpose

A small site of daily Maltese word games: Kelma (a five-letter Wordle-style game in two modes) and Sellum (a word ladder, one letter at a time). Everything is static: puzzles are precomputed and the day is worked out from the date in Malta, so a new puzzle arrives at midnight Malta time with no backend. Success is a daily habit (streaks), words learned, and results shared, without the site ever feeling like a template.

## Brand Personality

Specific, tactile, warm without being twee. Three words: Maltese, mechanical, friendly. Every choice should trace back to something physically Maltese: globigerina limestone, the Blue Grotto, festa gold and bunting, luzzu paint, galleriji (enclosed timber balconies), terracotta pots, and the cat. Motion feels like a physical game (tiles flip, rows shake), never like a marketing site. Both games share one tile language, the same as Wordle's. Copy sounds like a Maltese person wrote it.

## Anti-references

- Generic SaaS: purple/blue gradients, glassmorphism, soft uniform corner radii, blurred drop shadows on everything, hero-metric layouts, fade-up-on-scroll.
- Tourist-brochure Malta: flags, maps, stock photography, Maltese-cross clip art.
- Default web fonts (Inter, Poppins, Manrope) and emoji standing in for icons (the share grid is the only exception).
- Anything that auto-rotates, auto-opens over the board, or moves buttons out from under a thumb.

## Design Principles

1. Specific over generic: if a detail could belong to any word game, replace it with something Maltese.
2. Teach at the end: every game closes on the meaning of its words, credited to Ġabra.
3. Mechanical and tactile: stone-block shadows, hard edges, stepped motion; no bounce, no glass.
4. Never cover the moment: result panels wait for the animation and can always be reopened.
5. Phone first, fits one screen: the whole game at 375×667 with no scrolling, and touch targets of 44px or more.

## Accessibility & Inclusion

WCAG 2.2 AA. Text contrast measured in code (4.5:1 for body and small bold text, 3:1 for large text), including every tile colour. A high-contrast (orange/blue) mode plus non-colour cues for correct and present letters. Full keyboard play with a visible 3px focus ring. prefers-reduced-motion respected everywhere (CSS override, Framer MotionConfig, confetti, the idle video, and Sellum's tile flips). Maltese letters (ġĠħĦżŻċĊ) must render correctly in every font.
