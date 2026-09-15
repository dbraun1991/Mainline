# Architecture Decision Records

Numbered, append-only decision log for Mainline. A changed decision gets a
new ADR that supersedes the old one — never an edit to an old ADR's Decision
section. A superseded ADR gets a one-line forward pointer in its metadata
header only.

| ADR | Decision |
|-----|----------|
| [0001](0001-frontend-build-tooling-vite.md) | Frontend build tooling: npm + Vite |
| [0002](0002-swimlane-visualization.md) | Visualization: SVG swimlanes with a shared linear time axis, not a metro-map layout |
| [0003](0003-data-model.md) | Data model: one JSON document, `storylines` + `events`, referenced by id |
| [0004](0004-persistence.md) | Persistence: localStorage autosave + manual JSON export/import, no backend |
| [0005](0005-vanilla-js-no-framework.md) | UI implementation: vanilla JS/HTML/CSS, no reactive framework |
| [0006](0006-static-hosting-github-pages.md) | Static hosting: GitHub Pages via GitHub Actions |
| [0007](0007-multi-plot-sidebar.md) | Multi-plot sidebar: a plot store + a persistent list-style switcher |
| [0008](0008-event-tooltip.md) | Event tooltip: a custom HTML card, not native SVG `<title>` |
| [0009](0009-sidebar-resize-handle.md) | Plot sidebar: drag-to-resize handle |
| [0010](0010-uuid-ids.md) | Ids: RFC 4122 UUIDs via `crypto.randomUUID()`, kept prefixed |
| [0011](0011-llm-import-dsl.md) | LLM import path: a self-contained doc, not an in-app DSL parser |
| [0012](0012-wordmark-font.md) | Wordmark font: self-hosted open-source webfont, imported from CSS |
| [0013](0013-click-line-event-creation.md) | Click-line-then-node: a second, pre-filled entry point into event creation |
| [0014](0014-branching-storylines.md) | Branching storylines: a fork tree, snapshot-anchored to an event, not independent lanes only |
| [0015](0015-two-step-fork-picker.md) | "Forks from" picker: two steps (storyline, then event), not one flat list |
| [0016](0016-github-repo-name-mainline.md) | GitHub repo name: `Mainline`, correcting the `storylane-local` base-path assumption |
| [0017](0017-local-scratch-directory.md) | `local/`: a gitignored scratch directory for LLM-produced story files |
