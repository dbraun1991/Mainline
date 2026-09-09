# ADR-0014: Branching storylines — a fork tree, not independent lanes only

- Status: Accepted
- Date: 2026-09-09
- Partially superseded by: [ADR-0015](0015-two-step-fork-picker.md) — only
  the Editor section's "Forks from" picker UI (a flat event list → a
  two-step storyline-then-event picker); the fork data model and semantics
  below are unchanged.
- Partially supersedes: [ADR-0002](0002-swimlane-visualization.md) — see
  "Relationship to ADR-0002" below for exactly what changes vs. what still
  stands; this is not a full supersession.
- Relates to: [ADR-0003](0003-data-model.md), [ADR-0013](0013-click-line-event-creation.md)

## Context

Evaluated alongside [ADR-0013](0013-click-line-event-creation.md) as one of
two readings of "branching" — this is the larger one: storylines as an
actual tree, where a subplot can fork off a specific point in another
storyline, instead of every storyline being an independent lane starting
at the chart's own edge. A storyline remains free to just start on its own
with no relationship to any other — forking is opt-in per storyline, never
required.

ADR-0002 deliberately avoided route-finding/collision-avoidance because
independent lanes never share space. Branching reopens that question in
principle — but only in principle, if the tree stays a strict tree (see
"Relationship to ADR-0002" below for how this plan avoids actually needing
a route-finding solver).

## Decision

### Data model (extends ADR-0003)

A storyline gains one optional field:

```json
{ "id": "sl-2", "name": "Elin & Cato", "color": "#ec4899",
  "forksFrom": { "storylineId": "sl-1", "date": "2024-03-04", "time": "19:00" } }
```

- Absent `forksFrom` → root storyline, unchanged behavior from ADR-0002.
- `forksFrom.date`/`time` are a **snapshot**, not a live reference to the
  event that inspired them. Creating a fork through the editor picks an
  existing *event* to fork from, and its `date`/`time` are copied in — but
  nothing is stored that still points at that event's id. Editing or
  deleting that event later never breaks the fork; there's nothing to
  break. `js/data-model.js` derives `forksFrom.instant` via the same
  `toInstant` helper events already use, and strips it back off before
  saving, mirroring how an event's own `instant` is handled.
- **Strictly a tree, not a DAG**: at most one parent per storyline, any
  number of children. No merge nodes (two lines converging into one) — see
  "Non-goals" below.
- **Cycle prevention**: `data-model.js` walks every storyline's ancestor
  chain on load and rejects if it doesn't terminate at a root.

### Layout (`js/layout-engine.js`)

- Storyline rows are no longer assigned in raw array order. A DFS from
  each root storyline (visiting a node's children immediately after it)
  produces the row order, so a parent and its whole subtree always occupy
  a **contiguous** run of rows.
- The axis's min/max instant scan now also considers every storyline's
  `forksFrom.instant`, not just event instants — a fork point outside the
  current event spread still gets a properly-ranged axis.
- A child storyline's own line starts at `xForInstant(forksFrom.instant)`
  (offset by a small fixed reach for the connector curve, see below)
  instead of the chart's left edge; a root's still starts at
  `laneLabelWidth`, unchanged.

### Rendering (`js/swimlane-renderer.js`)

- The lane **band** (alternating background stripe) still spans the full
  chart width for every row — scannability of "which row is which"
  shouldn't depend on whether a storyline happens to be a root or a child.
  Only the storyline's own colored line (and its ADR-0013 hit-line) start
  partway through, at its fork point.
- **Connector**: a short cubic-bezier curve from the parent's line at the
  fork instant down (or up) to the child's row, then the child's straight
  line continues from where the curve ends. Chosen over a right-angle
  elbow specifically because a curve reads as "split off from," where an
  elbow reads as "reports to" — the wrong relationship to imply between
  two storylines. A small dot, colored like the child, marks the exact
  origin point on the parent's line.
- **Labels stay in the shared left column**, exactly like a root
  storyline's — not repositioned to sit near the fork point. Keeps "scan
  down the left edge for every storyline" intact regardless of how many
  are forked, at the cost of a label not sitting spatially next to where
  its line visually begins. A forked storyline's label gets a small `↳`
  prefix and a native tooltip ("Forked from X on <date>") to make the
  relationship legible without moving it.

### Editor (`js/editor-actions.js`)

- The storyline form (new and edit) gains a **"Forks from"** select. Its
  options are every event in the project (labeled `<storyline>: <event
  title> (<date>)`), plus `"— None (independent storyline) —"`. Picking an
  event derives `forksFrom` from it directly — there's no separate
  date/time field to fill in by hand, so a fork point can never drift from
  a real narrative beat at creation time.
- Editing a storyline that already forks from something shows an extra
  `"Keep current (forks from X on <date>)"` option, selected by default —
  since only a snapshot is stored (not a live event id), the form can't
  know which original event it came from to re-select it, so a distinct
  "keep as-is" option exists specifically to avoid the form silently
  reading as "detach this" the moment it's reopened.
- The options list excludes the storyline being edited and all of its own
  descendants — the same cycle rule `data-model.js` enforces, just kept
  out of the UI before it can ever be submitted.
- **Deleting a storyline that has children**: children are auto-promoted
  to roots (their `forksFrom` is simply removed) rather than being
  cascade-deleted or blocking the deletion. A parent's own data going away
  should never silently destroy a subplot's own name, color, and events —
  the confirm message names how many storylines will be detached, the same
  way it already names how many events will go with the parent itself.

## Relationship to ADR-0002

**Still stands, unchanged**: one shared linear time axis; a storyline's
own timeline is still a single straight line (never bent along its own
length); no metro-map routing or true collision-avoidance between
*unrelated* storylines.

**Changes**: "each storyline is its own independent lane" is no longer
universally true — a storyline may now start partway through the chart,
connected to another. The DFS row-ordering above is what keeps this from
reopening the actual expensive problem ADR-0002 avoided: because every
storyline still gets exactly one exclusive row, and a subtree is always a
contiguous run of rows, **two connectors can never cross, and a connector
can never cross an unrelated lane** — by construction, not by a solver.
The one new kind of "bend" in the whole system is a fixed-shape, one-time
curve per fork point; nothing routes around anything else.

## Non-goals (v1)

- **No merging** — two storylines converging back into one. What
  "the merged line's own events" would mean going forward is genuinely
  unclear, and it's additive later if forking alone proves useful.
- **No enforcement** that a child's own events postdate its fork point. An
  event dated before it would render off the start of its own drawn line
  segment — a soft, self-correcting authoring mistake, not worth blocking.
- **No drag-to-fork or reparent-by-dragging** — the storyline form is the
  only way to create or change a fork, in both directions (v1).
- **No line-click shortcut for forking** (unlike ADR-0013's shortcut for
  events) — evaluated and deliberately deferred until the form-based
  version has been used for real, rather than building a second creation
  path for an unproven feature up front.

## Consequences

**Positive**

- A subplot's actual origin point is now something the chart itself can
  show, not just something implied by two lines happening to start around
  the same time.
- The DFS-ordering constraint means this ships without a route-finding
  solver — the exact complexity ADR-0002 was written to avoid.
- Deleting a storyline never destroys a child's own authored content,
  regardless of how deep a fork tree gets.

**Negative / risks**

- A child's label sits in the shared column, disconnected from where its
  line visually starts — a deliberate scannability-over-spatial-precision
  tradeoff (see "Labels stay in the shared left column" above).
- Editing a fork's source after creation means re-picking an event from
  the full list (or accepting "keep current") — there's no quick "nudge
  the date" control, since the model only stores a snapshot, not a
  separately editable date/time pair, for v1.
- A very deep or wide fork tree has had no real-world testing yet — the
  DFS ordering keeps rows non-colliding by construction, but whether the
  result stays *readable* at, say, five levels of nesting is untested.

## Alternatives considered

- **A live `eventId` reference** instead of a date/time snapshot.
  Rejected: needs explicit handling the moment that event is retimed or
  deleted (silently follow it? block deletion? fall back to a snapshot
  anyway?) — real complexity for an always-in-sync guarantee a solo
  author's own project likely never needs.
- **A DAG (multiple parents)** instead of a strict tree. Rejected: two
  storylines feeding into one already reopens the "what does the merged
  line's events mean" question merging itself raises, for a case that's
  harder to justify narratively than a simple fork.
- **Repositioning a forked storyline's label near its fork point**.
  Rejected: breaks the single scannable label column for a spatial
  correctness gain that a `↳` prefix and tooltip already mostly deliver.
