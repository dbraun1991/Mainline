# ADR-0017: `local/` — a gitignored scratch directory for LLM-produced story files

- Status: Accepted
- Date: 2026-09-15
- Relates to: [ADR-0011](0011-llm-import-dsl.md), [ADR-0004](0004-persistence.md)

## Context

ADR-0011 gives an LLM a self-contained recipe for converting a manuscript
or outline into an importable Mainline project JSON file, but never says
*where on disk* that file should land. Left unspecified, an agent doing
this conversion has to guess a path each time — the repo root, `docs/`,
next to the source material — none of which are actually right, since the
result is a personal working file (someone's in-progress plot), not part
of Mainline's own source, its ADRs, or its bundled
`public/data/example.json`.

## Decision

Add `local/`, a plain directory at the repo root holding a `README.md`
that tells both human contributors and LLM agents that local story files
— chiefly the JSON output of the ADR-0011 conversion — belong there. The
directory is gitignored (`local/*` with a `!local/README.md` exception in
`.gitignore`) so the README itself is tracked and explains the convention,
but files placed inside stay untracked, the same way `dist/` holds
build output without being part of the source tree.

## Consequences

**Positive**

- Gives LLM agents (and humans) one obvious, documented answer to "where
  do I put this converted plot file" instead of guessing a path per
  conversion.
- Keeps personal in-progress plot files out of the repo's history by
  default, consistent with them being scratch/working data, not shipped
  source or example content.
- Zero new code — a directory and a README, matching ADR-0011's own
  "no new app surface" stance.

**Negative / risks**

- A file left in `local/` is not backed up by git — losing the working
  copy (disk failure, accidental `rm`) loses the plot unless it was
  separately exported/committed elsewhere, same exposure as any other
  gitignored scratch content.
- Relies on an LLM agent actually reading this README/ADR rather than
  saving a converted file elsewhere; nothing enforces the convention
  programmatically.

## Alternatives considered

- **No dedicated directory — let files land wherever an agent chooses.**
  Rejected: this is the status quo being fixed; it produces inconsistent,
  hard-to-find output locations across conversions.
- **Track `local/`'s contents in git.** Rejected: these are personal
  working files, not project source or example data — committing them by
  default would pull unrelated manuscript content into the repo's history
  for every user of this project.
