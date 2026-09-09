# Mainline Import DSL — for LLM-assisted conversion

You are converting a book author's source text (manuscript draft, outline,
notes — anything with a plot and dated/timed events in it) into a
**Mainline project JSON file**. This document is self-contained: read it,
then do the conversion. Your final answer must be **only the JSON**, not
the notation below — the notation exists to keep your own intermediate
reasoning compact while you work through a long source text, not as a file
Mainline itself reads.

## 1. Work through the source text using this compact notation

```
L <key> "<Name>" <#hexcolor>
E <key> <date> [<time>] "<Title>" [| <description>]
```

- `L` defines one storyline (swimlane) once. `<key>` is a short scratch
  label of your own choosing (e.g. `main`, `vil`, `rmc`) — used only within
  this notation to link events to their storyline; it is never written into
  the final JSON.
- `E` places one event on the storyline identified by `<key>`.
- `<date>` is `YYYY-MM-DD`, required. `<time>` is `HH:MM` (24h), optional —
  omit it entirely (no placeholder) if the source doesn't give one.
- `<Title>` and `<Name>` are double-quoted. Avoid a literal `"` inside
  them — rephrase instead of escaping.
- `<description>` is everything after ` | ` to the end of the line,
  optional, unquoted — a literal `|` inside it is fine, only the first
  ` | ` after the title ends the title.
- If the source doesn't suggest a color for a storyline, cycle through
  this palette in order, one per storyline: `#3b82f6, #ec4899, #ef4444,
  #10b981, #f59e0b, #8b5cf6, #06b6d4, #84cc16` (Mainline's own default
  palette, `js/color-utils.js`).

This notation is deliberately terse — no braces, no repeated field names,
no ids — so that walking through a long source and jotting down every
storyline and event costs you as few tokens as possible before you convert
to JSON.

## 2. Convert to Mainline's actual JSON schema

```json
{
  "meta": { "title": "<overall title, or your best guess from the source>" },
  "storylines": [
    { "id": "sl-<uuid>", "name": "<Name>", "color": "<#hexcolor>" }
  ],
  "events": [
    {
      "id": "ev-<uuid>",
      "storylineId": "sl-<uuid of that event's storyline>",
      "title": "<Title>",
      "date": "<date>",
      "time": "<time, or omit the field entirely>",
      "description": "<description, or omit the field entirely>"
    }
  ]
}
```

Rules for this step:

- Every `L` becomes one entry in `storylines`; every `E` becomes one entry
  in `events`, with `storylineId` set to the real id you generated for
  that `E` line's `<key>` — the scratch `<key>` itself never appears in
  the output.
- Generate a fresh id per storyline/event as `sl-` or `ev-` followed by a
  UUID-shaped string (8-4-4-4-12 hex digits, e.g.
  `sl-3f2a1c4e-9b7d-4a10-8e2f-6c1d4b9a0f33`). Exact cryptographic
  randomness isn't required for this use case — just make each one
  visibly different and correctly shaped; two ids colliding by chance at
  hand-authored-project scale is not a realistic concern.
- Omit `time`/`description` fields entirely when the source `E` line
  didn't have them — don't emit `null` or an empty string.
- Sort order doesn't matter; Mainline sorts `events` by date/time itself
  on load.
- This is exactly the shape documented in
  [ADR-0003](adr/0003-data-model.md) — match it precisely, since Mainline
  validates on import and rejects anything that doesn't.

## 3. Worked example

Source text:

> Elin gathers her crew at the Dockside tavern on the morning of March 1st,
> 2024, to plan the job. Meanwhile the Chancellor, growing suspicious,
> commissions a new vault on March 2nd to protect his ledger.

Your intermediate notation:

```
L main "Main Plot" #3b82f6
L vil  "The Chancellor's Scheme" #ec4899

E main 2024-03-01 "Heist crew assembles" | Elin recruits the crew at the Dockside tavern.
E vil  2024-03-02 "Chancellor commissions the vault" | Growing suspicious, he orders a new vault to protect the ledger.
```

Final answer (what you actually output):

```json
{
  "meta": { "title": "Untitled" },
  "storylines": [
    { "id": "sl-1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "name": "Main Plot", "color": "#3b82f6" },
    { "id": "sl-2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e", "name": "The Chancellor's Scheme", "color": "#ec4899" }
  ],
  "events": [
    {
      "id": "ev-3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f",
      "storylineId": "sl-1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      "title": "Heist crew assembles",
      "date": "2024-03-01",
      "description": "Elin recruits the crew at the Dockside tavern."
    },
    {
      "id": "ev-4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a",
      "storylineId": "sl-2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
      "title": "Chancellor commissions the vault",
      "date": "2024-03-02",
      "description": "Growing suspicious, he orders a new vault to protect the ledger."
    }
  ]
}
```

## 4. Using the result

Save your JSON output as a `.json` file and load it via Mainline's
**Import JSON** button — no separate tooling needed. This document is the
whole pipeline: there is no DSL parser in the app itself, and none is
planned; the notation in step 1 is a thinking aid for you, the LLM, not a
file format Mainline reads.
