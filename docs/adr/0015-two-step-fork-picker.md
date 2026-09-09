# ADR-0015: "Forks from" picker — two steps (storyline, then event), not one flat list

- Status: Accepted
- Date: 2026-09-09
- Partially supersedes: [ADR-0014](0014-branching-storylines.md) — only the
  "Editor" subsection's picker UI; the underlying fork semantics
  (event-anchored, snapshot on creation, cycle exclusion, "keep current")
  are unchanged.
- Relates to: [ADR-0014](0014-branching-storylines.md)

## Context

ADR-0014 shipped the "Forks from" field as one `<select>` listing every
event in the project, each labeled `<storyline>: <event title> (<date>)`.
That scales poorly as a project grows — a book with many storylines and
events turns it into a long, undifferentiated list the author has to read
every label of to find the right one, when picking the storyline first
would immediately cut that list down to just the events that matter.

## Decision

The single flat picker is replaced by two cascading `<select>` fields in
the same form step:

1. **"Forks from"** — a storyline (plus "— None —", and "Keep current" /
   "Make independent" when editing a storyline that already forks from
   something, unchanged from ADR-0014).
2. **"At event"** — populated live from whichever storyline is picked in
   step 1, showing only *that* storyline's events. Starts disabled with a
   placeholder until a real storyline is chosen in step 1.

This needed one small, generically useful addition to `js/dialog.js`'s
`formDialog`: an optional per-field `onChange(value, form)` hook, fired on
that field's `change` event, given the live form element so it can update
a sibling field's DOM directly. `js/editor-actions.js`'s step 1 uses it
(`populateForkEventSelect`) to rebuild step 2's `<option>`s via safe DOM
construction (`textContent`, not `innerHTML` — event titles are
user-authored content that could contain markup, e.g. from an imported
JSON file). Disabled `<select>` fields are exempt from `required`
validation and omitted from the submitted `FormData` by the browser
itself, so step 2 needs no special-casing while it's inactive.

`forkFields()` also now only offers a storyline as a step-1 candidate if
it actually has at least one event — a storyline with none can't be
forked from, so it's excluded rather than shown as a dead end that
produces an empty step 2.

## Consequences

**Positive**

- Step 2 is always short and relevant — never longer than the picked
  storyline's own event count, regardless of how large the project gets.
- The `onChange` hook on `formDialog` is a small, generic primitive (not
  fork-specific) — reusable for any future cascading-field need without
  formDialog itself knowing what depends on what.
- No change to the stored data shape, validation, or any of ADR-0014's
  other decisions — this is purely a picker-UI refinement.

**Negative / risks**

- Two fields and a click instead of one — a small added step for the
  common case of a project with only a handful of storylines, where the
  original flat list wasn't actually hard to scan.
- `formDialog` is slightly less "static rendering only" than before now
  that a field can mutate another's DOM after the fact — worth watching
  that this stays a narrow, well-contained exception rather than growing
  into a general reactive-forms system this app doesn't otherwise need
  (ADR-0005).

## Alternatives considered

- **Keep the flat list, just group it visually** (e.g. `<optgroup>` per
  storyline). Rejected: still shows every event up front regardless of
  which storyline the author actually wants, where the two-step version
  narrows the list before it's ever shown.
- **A generic "dependent field" declarative config** (e.g. `dependsOn:
  'forksFromStoryline'`) instead of a plain `onChange` callback. Rejected:
  more machinery than the one real use case justifies right now — a
  callback is simpler to read at the call site and equally reusable if a
  second use case shows up later.
