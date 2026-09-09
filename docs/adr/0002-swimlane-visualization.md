# ADR-0002: Visualization — SVG swimlanes on a shared linear time axis

- Status: Accepted
- Date: 2026-09-07
- Partially superseded by: [ADR-0014](0014-branching-storylines.md) — "each
  storyline is its own independent lane" no longer universally holds; the
  shared linear axis and no-collision-avoidance-between-unrelated-lanes
  parts below still do. Read ADR-0014's own "Relationship to ADR-0002"
  section for the exact boundary.
- Relates to: [ADR-0003](0003-data-model.md)

## Context

Mainline's brief asks for a book author to lay out storylines as
**swimlanes**, with individual events carrying a date and time, visualized
"similar to a metro map." A metro-map-style renderer draws **lines**
(workstreams) and **stations** (milestones) as a routed
metro/subway map — D3-driven line routing, bends, interchange stations, and
label-collision avoidance, because metro lines can share track and cross
each other. Storylines in a book don't share track: each one is its own
independent lane, and what actually needs to read clearly is *when* an
event in one storyline happens relative to events in the others.

## Decision

Render each storyline as a straight horizontal lane, stacked vertically in
storyline order, with a single shared linear time axis running left to
right across all lanes. Events are plotted as nodes on their lane at the
x-position their date+time maps to on that axis — no route-finding, no
line bends, no collision avoidance between lanes.

- `js/layout-engine.js` computes the time axis (min/max event instant, with
  half-day padding) and a pixel position per event; `js/swimlane-renderer.js`
  draws it as one SVG (lane bands, one line per storyline, axis gridlines,
  event nodes).
- Clicking a lane label edits that storyline; clicking an event node edits
  that event (`js/editor-actions.js`).

## Consequences

**Positive**

- Directly answers what the brief asks for (swimlanes + date/time
  visualization) without borrowing metro-map machinery that solves a
  different problem (shared track, routing, interchanges) this domain
  doesn't have.
- Straightforward to reason about and extend: a lane's y is fixed by its
  storyline, an event's x is fixed by its date/time — no layout solver.

**Negative / risks**

- No handling yet for a lane with very densely clustered events at the
  same/adjacent times — the label text can overlap. Not addressed in this
  version; revisit if it comes up with real book data (label offsetting or
  a zoom control).
- The time axis is always linear pixel-per-day (`layout-engine.js`'s
  `PX_PER_DAY`) — a story spanning years would produce a very wide chart.
  Acceptable for now; a variable-scale or paginated axis is future work if
  it turns out to matter.

## Alternatives considered

- **Metro-map style routing**, matching that renderer directly.
  Rejected: solves a problem (lines sharing/crossing track) that doesn't
  exist for independent storylines, at the cost of real implementation
  complexity (D3, collision avoidance) this project doesn't need.
- **A Gantt-chart bar per event** instead of a point. Rejected for v1: the
  brief describes events as having a date and time, not a duration: a point
  on a lane is the more direct fit. Worth reconsidering if events later
  gain an end time/duration.
