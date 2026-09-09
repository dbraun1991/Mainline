# ADR-0012: Wordmark font — self-hosted open-source webfont, imported from CSS

- Status: Accepted
- Date: 2026-09-09
- Relates to: [ADR-0004](0004-persistence.md), [ADR-0005](0005-vanilla-js-no-framework.md)

## Context

The header's `.brand-wordmark` ("Mainline") called for a calligraphy/
signature look no system font provides — a real webfont was needed. Two
things needed deciding beyond just which face: how to source it without
depending on a third party at runtime (Mainline has been fully
client-side with no external calls since ADR-0004), and how to load it
without the page visibly flashing a fallback font in first and then
swapping — the actual symptom that surfaced once a font was wired in via
a plain JS `import` in `js/app.js`: the browser only discovers a
`@font-face` rule pulled in through the JS module graph after that whole
graph resolves, well after first paint, so the fallback (`cursive`)
rendered first and the real font visibly swapped in moments later.

## Decision

- **Source**: an `@fontsource/*` npm package (self-hosted, bundled by
  Vite at build time) rather than a `fonts.googleapis.com` `<link>` — no
  runtime request to a third party, keeping ADR-0004's fully-client-side
  posture intact for this asset too.
- **Face**: **Alex Brush** (SIL OFL), chosen after a side-by-side visual
  comparison of eight open-source signature/calligraphy candidates
  rendered in the app's actual gold-on-dark header style — picked for its
  bold, brush-pen weight over more delicate single-stroke alternatives.
- **Loading mechanism**: `@import '@fontsource/alex-brush';` at the top of
  `css/style.css` — not a JS import. `style.css` is already linked via a
  render-blocking `<link>` in `index.html`'s `<head>`, so the browser
  discovers the `@font-face` rule while parsing the initial stylesheet and
  starts fetching the font file immediately, in parallel with everything
  else, instead of only after `js/app.js`'s full module graph resolves.
- **Color**: a `--gold` custom property, tuned separately for light/dark
  (`css/style.css`'s existing `prefers-color-scheme` pattern, ADR-0002),
  rather than a single hardcoded hex that would read differently against
  each background.

## Consequences

**Positive**

- No external request at runtime for this asset, same posture as every
  other part of the app (ADR-0004).
- The CSS-level import measurably fixed the fallback-font flash — the
  `@font-face` rule is now available at initial CSS-parse time instead of
  after a full JS module resolution.
- `font-display: swap` (`@fontsource`'s default) still means the wordmark
  text is never invisible while the font loads, only using the fallback
  briefly if the file hasn't arrived yet.

**Negative / risks**

- A brief fallback-to-real-font swap can still happen on a slow
  connection — the CSS-level import gives the font file a much earlier
  head start on downloading, but doesn't eliminate the download itself.
  A `<link rel="preload">` for the exact font file would close this
  further but needs a stable, hand-known asset path/hash to target, which
  isn't a good fit for Vite's fingerprinted build output without added
  build tooling — left as unaddressed for now.
- One more npm dependency, small (a single-weight webfont), but not zero.

## Alternatives considered

- **A `fonts.googleapis.com` `<link>` in `index.html`.** Rejected: the
  most common way to reach for a Google Font, but a live third-party
  request on every page load — a step back from ADR-0004's fully
  client-side stance for the sake of avoiding a one-line `npm install`.
- **Leaving the font import in JS, adding `<link rel="preload">` by
  hand for the dev-server path only.** Rejected: dev and the production
  build serve the font from different, non-matching paths (Vite
  fingerprints the production asset), so a hand-written preload path
  would work in one and silently do nothing in the other — the CSS-level
  `@import` fix instead works identically in both.
