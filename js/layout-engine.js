const LANE_HEIGHT = 110;
const LANE_LABEL_WIDTH = 180;
const CHART_PADDING_X = 60;
const PX_PER_DAY = 90;
const MIN_CHART_WIDTH = 600;

// Row order for a fork tree: a DFS from each root storyline, visiting a
// node's children immediately after it. This is the load-bearing property
// that keeps branching (docs/adr/0014-branching-storylines.md) from
// needing real route-finding — a parent and its whole subtree always
// occupy a *contiguous* run of rows, so two fork connectors (or a
// connector and an unrelated lane) can never cross. Storylines with no
// forksFrom are roots and keep their original relative order among
// themselves.
function orderByForkTree(storylines) {
  const childrenByParentId = new Map();
  const roots = [];
  for (const storyline of storylines) {
    if (storyline.forksFrom) {
      const siblings = childrenByParentId.get(storyline.forksFrom.storylineId) || [];
      siblings.push(storyline);
      childrenByParentId.set(storyline.forksFrom.storylineId, siblings);
    } else {
      roots.push(storyline);
    }
  }

  const ordered = [];
  const visit = (storyline) => {
    ordered.push(storyline);
    for (const child of childrenByParentId.get(storyline.id) || []) visit(child);
  };
  roots.forEach(visit);
  return ordered;
}

// Computes pixel positions for a swimlane chart: one horizontal lane per
// storyline, stacked vertically in fork-tree order (orderByForkTree
// above), events placed along their lane by a shared linear time axis (no
// route-finding/collision avoidance between unrelated lanes — see
// docs/adr/0002-swimlane-visualization.md and docs/adr/0014-branching-storylines.md
// for why this stays true even with forking).
export class LayoutEngine {
  compute(project) {
    const { events } = project;
    const storylines = orderByForkTree(project.storylines);

    const laneHeight = LANE_HEIGHT;
    const laneY = new Map(storylines.map((s, i) => [s.id, i * laneHeight + laneHeight / 2]));

    let minInstant;
    let maxInstant;
    const considerInstant = (instant) => {
      if (!minInstant || instant < minInstant) minInstant = instant;
      if (!maxInstant || instant > maxInstant) maxInstant = instant;
    };
    for (const e of events) considerInstant(e.instant);
    // A fork point outside the current event spread (e.g. a storyline
    // forked well before its first own event) still needs to fit on the
    // axis, so it's considered here too, not just event instants.
    for (const s of storylines) {
      if (s.forksFrom) considerInstant(s.forksFrom.instant);
    }
    if (!minInstant) {
      minInstant = new Date();
      maxInstant = new Date();
    }

    // Pad the time axis by half a day on each side so edge events don't
    // render flush against the chart border.
    const paddedMin = new Date(minInstant.getTime() - 12 * 3600 * 1000);
    const paddedMax = new Date(maxInstant.getTime() + 12 * 3600 * 1000);
    const spanMs = Math.max(paddedMax - paddedMin, 24 * 3600 * 1000);
    const spanDays = spanMs / (24 * 3600 * 1000);

    const chartWidth = Math.max(MIN_CHART_WIDTH, Math.round(spanDays * PX_PER_DAY));

    const xForInstant = (instant) => {
      const ratio = (instant - paddedMin) / spanMs;
      return LANE_LABEL_WIDTH + CHART_PADDING_X + ratio * (chartWidth - 2 * CHART_PADDING_X);
    };

    // Inverse of xForInstant, for click-to-create-event-here (a click past
    // either padded edge clamps to that edge's instant rather than
    // producing a date outside the currently-rendered axis).
    const instantForX = (x) => {
      const ratio = (x - LANE_LABEL_WIDTH - CHART_PADDING_X) / (chartWidth - 2 * CHART_PADDING_X);
      const clamped = Math.min(1, Math.max(0, ratio));
      return new Date(paddedMin.getTime() + clamped * spanMs);
    };

    const positionedEvents = events.map((e) => ({
      ...e,
      x: xForInstant(e.instant),
      y: laneY.get(e.storylineId),
    }));

    return {
      laneHeight,
      laneLabelWidth: LANE_LABEL_WIDTH,
      chartWidth: LANE_LABEL_WIDTH + chartWidth,
      chartHeight: storylines.length * laneHeight,
      orderedStorylines: storylines,
      laneY,
      events: positionedEvents,
      xForInstant,
      instantForX,
      axisRange: { start: paddedMin, end: paddedMax },
    };
  }
}
