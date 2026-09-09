# ADR-0008: Event tooltip — custom HTML card, not native SVG `<title>`

- Status: Accepted
- Date: 2026-09-09
- Relates to: [ADR-0002](0002-swimlane-visualization.md), [ADR-0005](0005-vanilla-js-no-framework.md)

## Context

Hovering an event node needs to surface more than its title: date/time,
which storyline it belongs to, and its free-text `description` — which can
be arbitrarily long once an author actually fills it in with real plot
detail, not just the one-line examples in `public/data/example.json`. The
original implementation used an SVG `<title>` element per event node —
the zero-effort way to get a hover tooltip in SVG, but it's the browser's
own unstyled tooltip box: no theming (light/dark palette, ADR-0002's CSS
custom properties don't reach it), no layout control, and no reasonable
way to show a long description legibly — it just wraps as plain text at
whatever width the browser feels like.

## Decision

Replace the SVG `<title>` with a floating HTML tooltip
(`js/tooltip.js`'s `EventTooltip`, wired up in
`js/swimlane-renderer.js`'s `renderEvents`):

- A single `EventTooltip` instance is created once per `SwimlaneRenderer`
  and appended to `document.body` — not re-created per event, and not
  nested inside the SVG (an HTML element inside `<foreignObject>` would
  work but adds complexity this doesn't need).
- Each event node's `mouseenter`/`mousemove`/`mouseleave` drive
  `show()`/`move()`/`hide()`, passing the event's title, a
  `date/time · storyline name` meta line, its storyline's color (a small
  dot, matching the lane's own color), and the description.
- The tooltip is `position: fixed`, follows the cursor, and clamps itself
  to the viewport (`js/tooltip.js`'s `move()`) so a long description near
  a screen edge never gets clipped.
- The description gets its own `max-height` + `overflow-y: auto`
  (`.event-tooltip-description` in `css/style.css`) rather than growing
  the tooltip unboundedly for a very long entry.
- `pointer-events: none` on the tooltip itself, so it never intercepts
  clicks on whatever's underneath it.

## Consequences

**Positive**

- Themed like the rest of the app (light/dark via the same CSS custom
  properties, ADR-0002's `--surface`/`--border`/`--text-muted`), instead
  of an unstyled browser box.
- Scales to a real, long description without breaking layout — the
  original motivation, and something the native `<title>` element simply
  can't do.
- One tooltip instance reused across all event nodes keeps this cheap at
  the chart sizes ADR-0005 already assumes (dozens to low hundreds of
  events) — no per-node DOM element to manage.

**Negative / risks**

- More code than the one-line native `<title>` it replaces — a deliberate
  cost, consistent with ADR-0005's precedent (`js/dialog.js` over native
  `confirm`/`alert`/`prompt`) of trading a few dozen lines for actual
  control over the UI.
- No keyboard/touch equivalent yet — hover-only, same limitation the
  native `<title>` had, just not improved on here.

## Alternatives considered

- **`<foreignObject>` inside the SVG**, keeping the tooltip as part of the
  chart's own DOM subtree. Rejected: a single body-level tooltip that
  every event node shares is simpler to position/clamp against the
  viewport than an SVG-embedded one, and nothing about the tooltip's
  content needs it to live inside the SVG coordinate system.
- **`title` attribute + a CSS-only tooltip** (`:hover` + `::after`).
  Rejected: CSS-generated content can't inject the storyline's actual
  color as a rendered dot, and clamping a `::after` tooltip to the
  viewport edge isn't something CSS alone can do.
