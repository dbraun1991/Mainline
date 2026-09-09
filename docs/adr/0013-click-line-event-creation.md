# ADR-0013: Click-line-then-node — a second entry point into event creation

- Status: Accepted
- Date: 2026-09-09
- Relates to: [ADR-0002](0002-swimlane-visualization.md)

## Context

The only way to add an event was the header's "+ Event" button, opening a
form with a `<select>` for which storyline it belongs to and blank
date/time fields — every event starts from the same generic form
regardless of where on the chart the author was actually looking when
they decided to add it. Clicking directly on a storyline's own line — the
thing that visually *is* that storyline's timeline — to add an event right
there, at roughly the time being clicked, is a more direct route into the
same action: which storyline and roughly when are both implied by the
click itself instead of typed/picked separately.

This was evaluated alongside a much larger alternative: storylines
actually branching/forking into sub-storylines. That one directly reverses
[ADR-0002](0002-swimlane-visualization.md)'s "no route-finding, no line
bends" call and needs its own data model and layout work — parked as
future work, not decided here. This ADR covers only the smaller
one: a second, click-driven way to reach the *existing* event-creation
form, nothing about how storylines relate to each other.

## Decision

- `js/layout-engine.js`'s `compute()` now also returns `instantForX(x)` —
  the inverse of the existing `xForInstant(instant)` — clamped to the
  padded axis range so a click near either edge still produces a date
  inside it rather than one that would silently fall outside the
  currently-rendered chart.
- `js/swimlane-renderer.js`'s `renderLanes` draws a second, invisible line
  per storyline (`.lane-hit-line`, 16px stroke) directly on top of the
  visible 4px `.lane-line` — the visible line alone is too thin a target
  to reliably click. A click on it converts the click position to SVG
  user-space via the standard screen-CTM inverse
  (`clientToSvgPoint`), maps that x to an instant via `instantForX`, and
  reports `(storylineId, instant)` through a new `onLaneLineClick`
  callback (`js/swimlane-renderer.js`'s constructor options, alongside the
  existing `onEventClick`/`onLaneClick`).
- `js/app.js`'s `handleAddEventAt(storylineId, instant)` rounds that
  instant to the nearest quarter hour (`js/utils.js`'s
  `snapToQuarterHour` — a click maps to millisecond precision, far finer
  than a `HH:MM` field or an author's actual intent), then opens the
  **same** "New Event" form the header button does
  (`editorActions.addEvent`, now taking an optional `defaults: {
  storylineId, date, time }` in place of its previously-unused
  `defaultStorylineId` parameter), pre-filled rather than blank.
- No new event-creation path was built — clicking the line is a shortcut
  into the existing form, which the author can still freely edit
  (including changing the storyline) before submitting.

## Consequences

**Positive**

- Directly reduces friction for what's likely the single most common
  action in the app (adding an event) without adding a second form or
  a second validation path to maintain — it's the same `formDialog` call,
  just pre-filled.
- No data model or rendering change — nothing here touches how a project
  is stored or how the chart is drawn, only how one form gets opened.
- The wider invisible hit-line is a well-understood SVG technique for
  keeping a thin visible stroke while still giving a comfortably clickable
  target, without changing the line's own visual weight.

**Negative / risks**

- Precision is inherently rough — a click's exact millisecond position is
  snapped to the nearest 15 minutes, and the date itself is only as
  precise as where along a (possibly weeks-wide) lane the click landed.
  The form is still fully editable afterward, so this is a starting point,
  not a final value.
- Two ways to reach the same form (header button, line click) — a little
  more surface than one, though both funnel into the identical
  `editorActions.addEvent` call, so there's no logic duplicated, only the
  entry point differs.

## Alternatives considered

- **A drag-to-place interaction** (drag from the line to set a duration,
  or drag to fine-tune the exact position before a form even opens).
  Rejected for this pass: events don't have a duration (ADR-0002 already
  settled point-events over a Gantt-bar-per-event), and a single click
  into the existing, fully-editable form is simpler than building a new
  drag gesture for a value the form already lets you adjust afterward.
- **Skip the form entirely, create the event directly from the click**
  (title left blank/placeholder, editable later). Rejected: title is a
  required field for a reason — an event with no name isn't meaningfully
  different from not having created it, and the form is one extra click,
  not a real burden.
