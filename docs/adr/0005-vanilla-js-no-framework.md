# ADR-0005: UI implementation — vanilla JS/HTML/CSS, no reactive framework

- Status: Accepted
- Date: 2026-09-07
- Relates to: [ADR-0001](0001-frontend-build-tooling-vite.md)

## Context

The brief asks for an "easy html structure." Mainline's actual UI-state
surface is small: one project in memory, a handful of header buttons, and
modal forms for adding/editing a storyline or event — nothing like a
multi-panel shell (an item picker, multiple canvas engines, resizable
panels, history browsing) that would justify reaching for a reactive
framework like Alpine.js.

## Decision

Build the UI directly against the DOM (`js/app.js`, `js/swimlane-renderer.js`,
`js/dialog.js`), with no reactive framework — a plain-JS-module approach,
even though Mainline otherwise uses an npm + Vite build (ADR-0001) and
GitHub Pages hosting (ADR-0006).

- `js/app.js` holds the one piece of app state (`this.project`) and
  re-renders the whole chart (`js/swimlane-renderer.js`) after every
  mutation — simple enough that there's no partial-update/diffing problem
  to solve.
- `js/dialog.js` provides promise-based modal dialogs (`formDialog`,
  `confirmDialog`, `alertDialog`) in place of native `confirm()`/`alert()`/
  `prompt()`, without needing a framework to get there.

## Consequences

**Positive**

- Matches the "easy html structure" request directly — `index.html` is
  ~25 lines of markup, no directive-heavy templates to read.
- No framework learning curve for anyone extending this project later; the
  whole render path is `project state -> layout-engine -> renderer`.

**Negative / risks**

- Every mutation re-renders the entire SVG chart rather than patching the
  changed node — fine at the scale of one author's book (dozens to low
  hundreds of events), would need revisiting if that scale changes
  significantly.
- No declarative binding layer means new UI state (e.g. a future zoom
  level or filter) is wired up by hand in `app.js` rather than falling out
  of a framework's reactivity — an explicit tradeoff for keeping this
  project's surface small.

## Alternatives considered

- **Alpine.js.** Rejected: Mainline's UI-state surface doesn't have the
  multi-panel, multi-mode complexity that would make Alpine worth its
  cost.
