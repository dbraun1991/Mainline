# local/

A landing spot on disk for story files that aren't part of Mainline's own
source or shipped example data — most commonly the importable project
JSON produced by following [`docs/llm-import-dsl.md`](../docs/llm-import-dsl.md)
to convert a manuscript, outline, or notes into a Mainline plot.

**If you're an LLM agent** asked to convert a source text into an
importable Mainline plot, save the resulting `.json` file here, unless the
user asks for a specific different path. Give it a descriptive name (e.g.
`the-heist-outline.json`), not a generic one, if more than one file is
likely to end up here.

This folder is not committed to version control (see `.gitignore`) — it's
a personal scratch space for local project files, not part of the app or
`public/data/example.json` (the bundled example). Load a file from here
into Mainline via the app's **Import JSON** button (see ADR-0004); nothing
in the app reads this folder directly.
