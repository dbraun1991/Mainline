# ADR-0011: LLM import path — a self-contained doc, not an in-app DSL parser

- Status: Accepted
- Date: 2026-09-09
- Relates to: [ADR-0003](0003-data-model.md), [ADR-0004](0004-persistence.md), [ADR-0005](0005-vanilla-js-no-framework.md)

## Context

A book author's actual source material — a manuscript draft, an outline,
loose notes — isn't Mainline's JSON shape, and typing every storyline and
event into the add/edit forms by hand is exactly the kind of tedious
transcription an LLM is well-suited to doing instead: read the source
text, produce a valid Mainline project file. Two shapes of solution were
on the table: build an in-app importer that parses some intermediate
format, or write the conversion instructions down for an LLM to carry out
directly, with no new code in the app at all.

## Decision

`docs/llm-import-dsl.md` is a self-contained set of instructions for an
LLM: it defines a compact line-based notation (`L <key> "<Name>"
<#color>` for a storyline, `E <key> <date> [<time>] "<Title>" [|
<description>]` for an event) for the LLM to work through a long source
text with at minimal output-token cost, then the exact rules for
converting that notation into Mainline's real JSON schema (ADR-0003) —
including generating real `sl-`/`ev-` UUIDs itself (ADR-0010), since the
LLM should never be trusted to hand-copy or invent a `storylineId`
reference correctly across a long document.

Nothing in the app reads this notation — there is no DSL parser and none
is planned. The LLM's final output is a plain `.json` file, loaded through
the **existing** Import JSON button (ADR-0004). The compact notation is
scratch work the LLM does on its own, not a file format Mainline needs
to understand.

## Consequences

**Positive**

- Zero new code, zero new UI surface, zero new import path to maintain —
  consistent with ADR-0005's "keep the UI-state surface small" stance and
  ADR-0004's "no backend" stance alike, since this adds neither.
- The compact notation minimizes LLM *output* tokens while it works
  through a long source, without Mainline's actual JSON schema (verbose
  by necessity — full field names, ids, nesting) needing to change at all
  to accommodate that.
- Works with any LLM capable of reading a markdown file and following
  instructions — nothing Mainline-specific about the tool doing the
  conversion.

**Negative / risks**

- No validation happens until the resulting JSON is actually imported —
  `data-model.js`'s `validateAndNormalize` is the only backstop against a
  malformed conversion (an unknown `storylineId`, a bad date), the same
  as any hand-edited import today.
- Depends on the LLM actually following the doc correctly — there's no
  programmatic guarantee an LLM's output matches the target schema, unlike
  a real parser that would simply reject invalid input up front.

## Alternatives considered

- **An in-app DSL importer** — a textarea + a `js/dsl-parser.js` that
  parses the compact notation directly, similar to the existing Import
  JSON flow. Rejected: it would add a whole new module, a grammar to keep
  in sync between the parser and its own documentation, and a UI surface
  — for a capability a plain doc already delivers today, with the LLM
  itself doing the "parsing" as part of following written instructions.
- **Skip the compact notation, just tell the LLM to emit JSON directly.**
  Rejected: the notation exists specifically to cut the LLM's own
  scratch-work token cost while it works through a long source — going
  straight to verbose JSON as the *only* format documented would remove
  that benefit for no gain, since the final output is still checked
  against the same schema either way.
