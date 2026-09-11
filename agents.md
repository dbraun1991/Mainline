# agents.md — Mainline

## What This Is

Mainline is a client-side webapp for book authors: lay out storylines as
swimlanes, plot events (date + time) on them, and see the whole
manuscript's timeline at a glance. See `README.md` for the full product
framing. (Named Storylane through early development — renamed to avoid a
collision with an unrelated, unaffiliated product of that name already
live on the web. Hosted on GitHub as `Mainline`, matching the current
name; see the note on `vite.config.js`'s `base` below.)

**Current status: working end to end for v1, plus a round of polish.** Vite
dev/build pipeline, the data model + validation, the SVG swimlane renderer,
add/edit/delete for both storylines and events (via promise-based modal
dialogs, not native `confirm`/`alert`/`prompt`), localStorage autosave, and
JSON export/import are all built and wired up. On top of that: a
resizable, persistent sidebar for holding and switching between several
plots (ADR-0007, ADR-0009), a themed HTML event tooltip (ADR-0008), UUID
ids (ADR-0010), a self-hosted signature-style wordmark font (ADR-0012), and
a doc-only DSL for LLM-assisted plot import (ADR-0011, no in-app parser),
a second, pre-filled way to add an event by clicking directly on a
storyline's line (ADR-0013), branching — a storyline can fork from a
specific event on another storyline via a two-step picker, forming a tree
instead of only independent lanes (ADR-0014, ADR-0015), and an in-app
"How Mainline works" overlay behind a header info button (`helpDialog`
in `js/dialog.js`, no ADR — UI copy, not an architectural decision). One
example project (`public/data/example.json`) seeds a first run when local
storage is empty.

## Development

```
npm install
npm run dev      # http://localhost:5173/Mainline/
npm run build    # production build to dist/
npm run preview  # serve that build locally
```

**Deployment**: `.github/workflows/deploy-pages.yml` deploys `dist/` to
GitHub Pages on every push to `main` (ADR-0006), once Pages is enabled in
the repo's settings (Settings → Pages → Source: GitHub Actions).
`vite.config.js`'s `base: '/Mainline/'` matches the actual GitHub repo
name (ADR-0016); update it again if the repo is ever renamed.

## Architecture

```
storylines: [{ id, name, color, forksFrom?: { storylineId, date, time? } }]
events:     [{ id, storylineId, title, date, time?, description? }]
```
One JSON project document (ADR-0003). `js/data-model.js` validates it and
derives a sortable `instant` (Date) per event from `date`+`time`, and per
storyline `forksFrom` (ADR-0014), stripped back off before saving.

```
project state (App.project, js/app.js)
        |
        v
js/layout-engine.js  -- computes lane y-positions + a shared linear
        |                time axis, maps each event to an (x, y)
        v
js/swimlane-renderer.js -- draws it all as one SVG: lane bands/lines,
                            axis gridlines, event nodes
```
Every mutation goes through `js/editor-actions.js` (add/edit/delete a
storyline or event, each driven by a `js/dialog.js` modal), then `app.js`
autosaves (`js/file-manager.js`, localStorage) and re-renders the whole
chart — no partial diffing, see ADR-0005 for why that's fine at this
project's scale.

The visualization is deliberately simpler than a metro-map-style renderer:
storylines don't share track the way metro lines do,
so there's still no route-finding or true collision avoidance — just lanes
stacked vertically (in fork-tree order, ADR-0014) and events placed on a
shared time axis (ADR-0002). A storyline may now fork from another
(ADR-0014), rendered as a short connector, but the tree-shaped constraint
that makes this safe without a routing solver is exactly what keeps
"no route-finding" true even with forking — see ADR-0014's own
"Relationship to ADR-0002" section for the precise boundary.

## Key Docs

| File | Role |
|------|------|
| `README.md` | Product framing — what Mainline is, what it does |
| `docs/adr/README.md` | ADR index — numbered, append-only decision log |
| `docs/adr/0001-*.md` – `0015-*.md` | Individual decisions — see the index for titles |
| `docs/llm-import-dsl.md` | Self-contained instructions for an LLM converting a source text into an importable Mainline project JSON file, via a compact intermediate notation |

## Module Layout

| Path | Role | ADR |
|------|------|-----|
| `js/app.js` | Entry point: loads/holds project state and the active plot, wires header buttons, re-renders after every mutation | 0004, 0005, 0007, 0013 |
| `js/data-model.js` | Load/validate/normalize project JSON, derive per-event `instant` and per-storyline `forksFrom.instant`, reject fork cycles | 0003, 0014 |
| `js/layout-engine.js` | Lane y-positions (fork-tree DFS order) + linear time axis, maps events to pixel (x, y) and back (`instantForX`) | 0002, 0013, 0014 |
| `js/swimlane-renderer.js` | Draws the SVG chart: lanes, axis, event nodes, fork connectors; wires click-to-edit, the event tooltip, and click-line-to-add-event | 0002, 0005, 0008, 0013, 0014 |
| `js/tooltip.js` | `EventTooltip` — floating HTML card shown on event hover | 0008 |
| `js/editor-actions.js` | Add/edit/delete a storyline (incl. forking, via a two-step picker) or event, each backed by a `dialog.js` modal | 0003, 0013, 0014, 0015 |
| `js/dialog.js` | Promise-based `formDialog`/`confirmDialog`/`alertDialog`/`helpDialog` — no native browser dialogs; `formDialog` fields support an optional cascading `onChange` | 0005, 0015 |
| `js/file-manager.js` | localStorage autosave (now per-plot) + JSON export/import | 0004, 0007 |
| `js/plot-sidebar.js` | `PlotSidebar` — renders the plot list, reports clicks | 0007 |
| `js/sidebar-resize.js` | Drag-to-resize the plot sidebar | 0009 |
| `js/color-utils.js` | Palette cycled through for new storylines | — |
| `js/utils.js` | Date/time combining + formatting, UUID id generation, date/time-input helpers | 0010, 0013 |
| `css/style.css` | All styling — CSS custom properties, `prefers-color-scheme` dark palette, self-hosted wordmark font | 0012 |
| `public/data/example.json` | Bundled example project, seeded on first run | 0003, 0004 |
| `docs/llm-import-dsl.md` | LLM-facing conversion instructions — source text → importable project JSON | 0011 |
| `index.html` | The whole page's markup — header (incl. the info button), plot sidebar, one `#chart` container | 0005, 0007 |

## Conventions

Mainline's brief named a metro-map-style renderer directly as the visual
precedent to look at (see ADR-0002 for why the actual rendering approach
ends up simpler); it uses an npm + Vite build with GitHub Pages deployment
(ADR-0001, ADR-0006) and a no-reactive-framework UI approach (ADR-0005).

Conventions used throughout this project:

- **ADRs are append-only** (`docs/adr/README.md`) — a changed decision
  gets a new ADR that supersedes the old one, never an edit to the old
  ADR's Decision section.
- **One module per concern** in both CSS and JS.
- **No framework-default `confirm`/`alert`/`prompt`.** A promise-based
  custom dialog module (`js/dialog.js`) instead.
- **Theme via CSS custom properties**, though Mainline currently only
  follows OS-level `prefers-color-scheme` (light/dark) rather than
  offering an in-app toggle — no user preference to persist yet, since
  there's nothing else to toggle.

## Features & Future Work

Everything below needs direction clarified before implementing rather than
guessing at exact behavior.

- **In-app theme toggle**, a light/dark switch — currently
  OS-preference-only (see above). Worth
  adding only once it's clear it's wanted, since it's a small addition on
  top of the existing CSS custom properties.
- **Dense-event handling on a lane.** ADR-0002 flags overlapping labels
  for closely-timed events on the same storyline as unaddressed — no
  offsetting, stacking, or zoom control yet.
- **git-backed history**, if/when git support for this repo actually lands
  (per the original brief, "git will follow later") — currently only
  export/re-import stands in for versioning (ADR-0004).
- **Non-linear/variable time-axis scale** for stories spanning a very wide
  date range — the axis is a fixed pixels-per-day scale today
  (ADR-0002).
- **Merging storylines back together.** [ADR-0014](docs/adr/0014-branching-storylines.md)
  shipped forking (one storyline splitting off another) but explicitly
  cut merging (two storylines converging back into one) — what "the
  merged line's own events" would mean going forward is genuinely
  unclear. Additive later if forking alone proves useful.
- **A line-click shortcut for forking**, mirroring
  [ADR-0013](docs/adr/0013-click-line-event-creation.md)'s shortcut for
  events. Deliberately deferred in ADR-0014 until the form-based "Forks
  from" flow has been used for real.

## What It Does NOT Do (yet)

- No git-backed history/versioning — only manual export/re-import.
- No backend of any kind (ADR-0004) — fully client-side.
- No handling for dense event clusters on one lane beyond letting labels
  overlap (ADR-0002).
