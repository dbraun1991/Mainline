# ADR-0018: `local/` is fully gitignored, including its own README

- Status: Accepted
- Date: 2026-09-15
- Relates to: [ADR-0017](0017-local-scratch-directory.md)

## Context

ADR-0017 gitignored `local/`'s contents (`local/*`) but carved out an
exception (`!local/README.md`) so the file explaining the convention
stayed tracked and committed alongside the rest of the docs. In practice
that means `local/` still shows up in `git status` and needs its own
commits whenever that README changes — friction for a directory whose
entire point is to hold personal, un-versioned working files untouched by
git.

## Decision

- `.gitignore` now lists a bare `local/`, replacing the
  `local/*` / `!local/README.md` pair from ADR-0017 — the whole directory
  is ignored, no exceptions.
- `local/README.md` is untracked (`git rm --cached`) but left in place on
  disk; it still documents the convention from ADR-0017 (LLM agents and
  humans save local/converted story files here) for anyone who has it
  locally, it's just no longer part of the repo's history going forward.

This supersedes only ADR-0017's gitignore mechanics (the `local/*` /
`!local/README.md` pair); its underlying decision — that `local/` is
where LLM-produced story files belong — stands unchanged.

## Consequences

**Positive**

- `local/` never appears in `git status` or needs a commit of its own,
  matching the fact that nothing in it is meant to be shared or versioned.
- One `.gitignore` line instead of a two-line ignore/exception pair.

**Negative / risks**

- A fresh clone of the repo no longer comes with `local/README.md` — the
  convention it documents now lives only in this ADR (and in `agents.md`,
  which still points at `local/README.md` as a Key Doc) rather than in a
  file every checkout gets automatically. Anyone setting up the repo from
  scratch needs to create `local/` and, optionally, its README themselves,
  or copy it from this ADR.

## Alternatives considered

- **Keep ADR-0017's exception, track the README.** Rejected per this
  ADR's whole premise: even a single tracked file under `local/` means
  the directory isn't purely personal/untouched, and the convention is
  documented well enough in `agents.md` and this ADR without also needing
  a live copy in every checkout.
