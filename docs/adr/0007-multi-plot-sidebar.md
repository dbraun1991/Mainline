# ADR-0007: Multi-plot sidebar — a plot store + a persistent list-style switcher

- Status: Accepted
- Date: 2026-09-09
- Relates to: [ADR-0003](0003-data-model.md), [ADR-0004](0004-persistence.md)

## Context

Mainline's persistence (ADR-0004) held exactly one project per browser
profile, flagged there as an explicit known gap: "no in-app project
switcher/list." An author working on more than one book (or starting a new
story without losing the last one) had no way to keep several projects
around and hop between them — only export the current one and import a
different file.

Mainline calls each of these an author-facing "plot": a self-contained set
of storylines and events. Switching between them is a cheap operation —
swap which JSON document is loaded and re-render one SVG chart, nothing
like a multi-panel workspace that would make a switcher expensive to keep
on screen. That scale is what makes a persistent sidebar the right shape
here: a plain list of items, an explicit "create new" action, and
click-to-select rows with the active one highlighted — no search field, no
collapsing/overlay behavior, since the expected number of plots for a
single author is small enough that a fixed list stays cheap to scan.

## Decision

- **Storage** (`js/file-manager.js`) moves from one `localStorage` entry
  holding a single project to one entry holding a store of
  `{ activeId, plots: [{ id, project }] }`. A one-time migration reads the
  old single-project key on first load, wraps it as one plot, and removes
  the old key — no existing browser-local project is lost by the upgrade.
- **Sidebar** (`index.html`'s `.plot-sidebar`, `js/plot-sidebar.js`) is a
  permanent left column next to the chart, holding a "+ New Plot" button
  and the plot list. `PlotSidebar` is purely presentational — it renders
  whatever list it's given and reports clicks; `js/app.js` owns which plot
  is actually active.
- **Creating a plot** (`App.handleNewPlot`) prompts for a title via the
  existing `formDialog` (`js/dialog.js`, the same primitive every other
  creation flow in this app already uses), then stores a new empty plot
  (no storylines/events yet) and makes it active.
- **Switching plots** (`App.handleSwitchPlot`) swaps `this.project` for the
  clicked plot's data and re-renders; the previously active plot's edits
  are already persisted (autosave keys off `activePlotId`, same
  autosave-on-every-edit behavior as ADR-0004), so nothing needs an
  explicit save-before-switch step.

## Consequences

**Positive**

- Directly closes the gap ADR-0004 called out: an author can now hold
  several plots and switch between them in-app, no export/import
  round-trip required.
- The storage migration means nobody's already-saved project silently
  disappears when this ships.
- `PlotSidebar` stays as thin as `SwimlaneRenderer` and the other
  renderers (ADR-0005) — render-and-report-clicks, no owned state — so it
  doesn't reopen the "no reactive framework" tradeoff ADR-0005 already
  settled.

**Negative / risks**

- No rename or delete affordance yet for a plot beyond its title (set once,
  at creation) — an author who wants to retitle or remove one has to edit
  the exported JSON's `meta.title` by hand, or just leave stray plots in
  the list. Left out deliberately for this pass; add it once it's clear
  whether rename/delete live on the plot item itself or reuse a form
  dialog like storylines/events already have.
- A permanently docked sidebar always costs some horizontal screen space
  next to the chart, even with a single plot. Acceptable at the expected
  scale (a handful of plots per author) — worth reconsidering only if
  Mainline's use grows toward workspaces heavy enough that the tradeoff
  stops being cheap.
- Plot list has no search/filter. Fine while the list is short; would need
  one if the number of plots for a single author grows large enough that
  scanning stops being quick.

## Alternatives considered

- **An overlay/modal picker** instead of a persistent sidebar (shown on
  demand, not permanently docked). Rejected for this scale: that tradeoff
  pays off when switching is a heavy jump between complex, multi-panel
  workspaces — plot-switching here is a cheap single-document swap, so
  keeping the list one click away costs little and saves the extra
  open/close step on every switch.
- **Reusing `meta.title` uniqueness as the plot identifier** instead of a
  generated id. Rejected: two plots can legitimately share a title (an
  author renaming a draft, or two working titles that happen to collide) —
  a generated id keeps switching and autosave correct regardless of what
  the title says.
