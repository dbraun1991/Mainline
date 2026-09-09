# ADR-0009: Plot sidebar — drag-to-resize handle

- Status: Accepted
- Date: 2026-09-09
- Relates to: [ADR-0007](0007-multi-plot-sidebar.md)

## Context

ADR-0007's plot sidebar shipped at a fixed 220px width. A fixed width is
fine until a plot's title gets long enough to truncate (`.plot-item`'s
`text-overflow: ellipsis`) or an author just wants more/less of the screen
given to the plot list versus the chart — at that point a fixed width is a
real, if minor, usability gap with no workaround. A resizable-panel
pattern for exactly this — a thin drag handle on a panel's edge,
`mousedown` → window-level `mousemove`/`mouseup`, width clamped to a
sane range — already exists and works well in this workspace, on a
comparable left-side panel in a sibling project; reusing a working pattern
beats designing this from scratch.

## Decision

- `js/sidebar-resize.js`'s `initSidebarResize(sidebarSelector,
  handleSelector)` wires a `mousedown` listener on the handle
  (`#sidebar-resize-handle`, `index.html`) that tracks the drag via
  `window`-level `mousemove`/`mouseup` (so the drag keeps tracking even
  once the cursor leaves the narrow handle strip), setting
  `.plot-sidebar`'s inline `width` directly, clamped to `[180, 420]`px.
- The handle itself (`.resize-handle`/`.resize-handle-right` in
  `css/style.css`) is a thin absolutely-positioned strip on the sidebar's
  right edge with a small pill-shaped grip (`::before`) that widens and
  turns accent-colored on hover *or* while `.resizing` is toggled on it
  mid-drag — plain `:hover` alone isn't enough, since the cursor leaves
  the 6px-wide strip almost immediately once a drag actually starts.
- `document.body.style.userSelect = 'none'` for the duration of the drag,
  restored on `mouseup`, so dragging across the plot list/chart text
  doesn't select it.
- No persistence: the chosen width resets to 220px on reload. No
  collapse-to-rail behavior either, unlike the panel this pattern was
  adapted from — that solved a different problem (freeing space in a
  multi-panel canvas workspace) that doesn't apply to a single sidebar
  next to one chart.

## Consequences

**Positive**

- Closes the truncated-title / fixed-width gap with a well-understood,
  already-proven interaction pattern rather than a new design.
- Kept deliberately smaller in scope than its source (no collapse
  threshold, no persistence) — nothing built here that this app doesn't
  actually need yet.

**Negative / risks**

- Width isn't remembered across reloads — an author who resizes it once
  has to do it again next session. Acceptable for a first pass; add
  `localStorage` persistence if that turns out to matter in practice.
- Mouse-only, like the pattern it's adapted from — no touch/pointer-event
  equivalent yet.

## Alternatives considered

- **CSS `resize: horizontal`** on `.plot-sidebar`. Rejected: browser-native
  resize handles render as an awkward corner grip (usually bottom-right)
  that doesn't match a full-height side panel's actual edge, and offer no
  way to style the affordance or clamp to a sane minimum in older
  browsers' implementations.
- **Collapse-to-rail past a drag threshold**, matching this pattern's
  source in full. Rejected for now: that solved crowding in a multi-panel
  workspace competing for space; this sidebar sits next to a single chart
  with no other panel contending for the same room.
