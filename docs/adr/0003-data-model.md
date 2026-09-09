# ADR-0003: Data model — one JSON document, storylines + events

- Status: Accepted
- Date: 2026-09-07

## Context

A Mainline project needs to represent a set of storylines (swimlanes) and
a set of events, each belonging to exactly one storyline and carrying a
date and an optional time.

## Decision

A project is a single JSON document with three top-level fields:

```json
{
  "meta": { "title": "..." },
  "storylines": [
    { "id": "sl-1", "name": "Main Plot", "color": "#3b82f6" }
  ],
  "events": [
    {
      "id": "ev-1",
      "storylineId": "sl-1",
      "title": "...",
      "date": "2024-03-01",
      "time": "08:00",
      "description": "..."
    }
  ]
}
```

- `storylines` and `events` are flat arrays; an event references its
  storyline by `storylineId`, not by nesting — this keeps both collections
  independently sortable/filterable without walking a tree.
- `date` is required (`YYYY-MM-DD`); `time` (`HH:MM`) and `description` are
  optional. `js/data-model.js` derives a sortable `instant` (a `Date`) from
  `date`+`time` on load and strips it back off before saving — it's never
  persisted, only computed.
- Every storyline and event carries its own generated `id`
  (`js/utils.js`'s `uid()`), so a rename never breaks the reference between
  an event and its storyline.

## Consequences

**Positive**

- Trivial to hand-author or hand-edit (see `public/data/example.json`) —
  no nested structure to get wrong.
- `data-model.js`'s `validateAndNormalize` fails fast (unknown
  `storylineId`, missing arrays, invalid date/time) rather than rendering a
  broken chart from malformed data.

**Negative / risks**

- No schema versioning field yet. Fine for a single-author, single-format
  v1; would need a `version`/migration story if the schema changes after
  real projects exist in the wild.

## Alternatives considered

- **Events nested inside their storyline** (`storylines[].events[]`).
  Rejected: makes "all events near this date, across storylines" (exactly
  what the time-axis renderer needs, ADR-0002) require flattening on every
  read instead of being the storage shape already.
