# ADR-0004: Persistence — localStorage autosave + manual JSON export/import

- Status: Accepted
- Date: 2026-09-07
- Relates to: [ADR-0007](0007-multi-plot-sidebar.md) — the "no in-app
  project switcher/list" gap named below is closed there; the
  localStorage-autosave-plus-export/import decision itself is unchanged,
  just scoped per-plot instead of to one global project.

## Context

Mainline is a single-author, client-side tool (the brief says git support
will follow later, and only for the project's own source — not as a
per-book-project storage backend). It needs to survive a page reload
without the author re-entering their storylines and events, and needs a way
to move a project's data around (backups, sharing with a co-author,
committing it alongside a manuscript).

## Decision

- Every edit autosaves the current project as JSON into `localStorage`
  (`js/file-manager.js`), keyed under one fixed key — Mainline holds one
  project per browser profile at a time.
- **Export JSON** downloads the current project as a `.json` file;
  **Import JSON** loads one, replacing the current project after
  `data-model.js` validates it.
- No backend, no server-side storage. `public/data/example.json` is the
  bundled example loaded only when `localStorage` is empty (first run).

## Consequences

**Positive**

- Matches a "no need to clone, run a server, or install anything"
  client-side-first convention, and needs no data-model versioning
  coordination with a server.
- Export/import doubles as the multi-device/multi-project story: a book
  author can keep a project's `.json` file in whatever folder (or later,
  git repo) holds the rest of their manuscript.

**Negative / risks**

- One project per browser profile — switching projects means exporting the
  current one first, then importing another; there's no in-app project
  switcher/list.
- No real versioning/undo beyond "re-import an earlier export." Acceptable
  for a single-author tool without git-backed history yet.

## Alternatives considered

- **Git-backed client-side persistence**, using an `isomorphic-git`/
  IndexedDB approach. Rejected as premature: that solves multi-view
  history and cross-project copy, neither of which Mainline has; it's a
  meaningfully heavier dependency for a single flat JSON document.
- **A real backend.** Out of scope per the brief (no server mentioned); the
  export/import flow is the deliberate stand-in until multi-device access
  is an actual requirement.
