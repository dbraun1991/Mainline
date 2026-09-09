import { formatDate, formatDateTime } from './utils.js';
import { EventTooltip } from './tooltip.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const AXIS_HEIGHT = 40;
const NODE_RADIUS = 7;
// Horizontal reach of a fork connector's curve (docs/adr/0014-branching-storylines.md)
// — a child storyline's own straight line starts this many px after its
// literal fork instant, leaving room for the curve instead of the line
// and the curve fighting for the same point.
const FORK_CONNECTOR_REACH = 28;

function el(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  for (const child of children) node.appendChild(child);
  return node;
}

// Client (viewport) coordinates -> this SVG's own user-space coordinates,
// via the standard screen-CTM inverse — correct regardless of the SVG's
// scroll position or any future CSS scaling, unlike hand-subtracting the
// element's bounding-rect offset.
function clientToSvgPoint(svg, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

// Renders a project as an SVG swimlane chart: one horizontal lane per
// storyline, a shared time axis along the top, and events as clickable
// nodes on their lane (docs/adr/0002-swimlane-visualization.md). A
// storyline that forks from another (docs/adr/0014-branching-storylines.md)
// starts partway through the chart instead of at its left edge, connected
// to its parent's line by a short curve.
export class SwimlaneRenderer {
  constructor(containerSelector, { onEventClick, onLaneClick, onLaneLineClick } = {}) {
    this.container = document.querySelector(containerSelector);
    this.onEventClick = onEventClick;
    this.onLaneClick = onLaneClick;
    this.onLaneLineClick = onLaneLineClick;
    this.tooltip = new EventTooltip();
  }

  render(project, layout) {
    this.container.innerHTML = '';
    if (project.storylines.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No storylines yet — add one to start plotting events.';
      this.container.appendChild(empty);
      return;
    }

    const width = layout.chartWidth;
    const height = layout.chartHeight + AXIS_HEIGHT;
    const svg = el('svg', {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      class: 'swimlane-svg',
    });

    svg.appendChild(this.renderLanes(project, layout));
    svg.appendChild(this.renderAxis(layout));
    svg.appendChild(this.renderEvents(layout, project));

    this.container.appendChild(svg);
  }

  renderLanes(project, layout) {
    const group = el('g', { class: 'lanes' });
    const storylineById = new Map(project.storylines.map((s) => [s.id, s]));

    layout.orderedStorylines.forEach((storyline, i) => {
      const y = layout.laneY.get(storyline.id) + AXIS_HEIGHT;
      const bandY = i * layout.laneHeight + AXIS_HEIGHT;

      // The band still spans the full chart width regardless of whether
      // this storyline is a root or forked — which row is which should
      // stay scannable either way (docs/adr/0014-branching-storylines.md).
      group.appendChild(
        el('rect', {
          x: 0,
          y: bandY,
          width: layout.chartWidth,
          height: layout.laneHeight,
          class: `lane-band ${i % 2 === 0 ? 'lane-band-even' : 'lane-band-odd'}`,
        })
      );

      let startX = layout.laneLabelWidth;
      if (storyline.forksFrom) {
        const forkX = layout.xForInstant(storyline.forksFrom.instant);
        const parentY = layout.laneY.get(storyline.forksFrom.storylineId) + AXIS_HEIGHT;
        group.appendChild(this.renderForkConnector(forkX, parentY, y, storyline.color));
        startX = forkX + FORK_CONNECTOR_REACH;
      }

      group.appendChild(
        el('line', {
          x1: startX,
          x2: layout.chartWidth,
          y1: y,
          y2: y,
          stroke: storyline.color,
          'stroke-width': 4,
          class: 'lane-line',
        })
      );

      // A wider, invisible line on top of the visible one — a 4px stroke
      // is too thin a target to reliably click, so this carries the
      // click-to-create-event-here interaction instead: the click maps to
      // an instant via layout.instantForX, which opens the same "New
      // Event" form the header button does, pre-filled.
      const hitLine = el('line', {
        x1: startX,
        x2: layout.chartWidth,
        y1: y,
        y2: y,
        'stroke-width': 16,
        class: 'lane-hit-line',
      });
      hitLine.style.cursor = this.onLaneLineClick ? 'pointer' : 'default';
      if (this.onLaneLineClick) {
        hitLine.addEventListener('click', (e) => {
          const svg = e.currentTarget.ownerSVGElement;
          const point = clientToSvgPoint(svg, e.clientX, e.clientY);
          this.onLaneLineClick(storyline.id, layout.instantForX(point.x));
        });
      }
      group.appendChild(hitLine);

      // Labels for every storyline stay in the shared left column, forked
      // or not — a `↳` prefix + tooltip name the relationship without
      // moving the label out of the one scannable column
      // (docs/adr/0014-branching-storylines.md).
      const label = el(
        'text',
        {
          x: 14,
          y,
          class: 'lane-label',
          'dominant-baseline': 'middle',
        },
        []
      );
      label.textContent = storyline.forksFrom ? `↳ ${storyline.name}` : storyline.name;
      if (storyline.forksFrom) {
        const parent = storylineById.get(storyline.forksFrom.storylineId);
        const title = el('title', {});
        title.textContent = `Forked from ${parent?.name ?? 'unknown storyline'} on ${formatDateTime(storyline.forksFrom.date, storyline.forksFrom.time)}`;
        label.appendChild(title);
      }
      label.style.cursor = this.onLaneClick ? 'pointer' : 'default';
      if (this.onLaneClick) {
        label.addEventListener('click', () => this.onLaneClick(storyline.id));
      }
      group.appendChild(label);
    });
    return group;
  }

  // A short cubic-bezier connector from the parent's line at the fork
  // instant to the child's own row, chosen over a right-angle elbow
  // specifically because a curve reads as "split off from," where an
  // elbow reads as "reports to" (docs/adr/0014-branching-storylines.md).
  // A small dot, colored like the child, marks the exact origin point on
  // the parent's line.
  renderForkConnector(originX, parentY, childY, childColor) {
    const endX = originX + FORK_CONNECTOR_REACH;
    const d = `M ${originX} ${parentY} C ${endX} ${parentY}, ${originX} ${childY}, ${endX} ${childY}`;
    return el('g', { class: 'fork-connector-group' }, [
      el('path', { d, class: 'fork-connector', stroke: childColor }),
      el('circle', { cx: originX, cy: parentY, r: 3.5, class: 'fork-origin-dot', fill: childColor }),
    ]);
  }

  renderAxis(layout) {
    const group = el('g', { class: 'axis' });
    const { start, end } = layout.axisRange;
    const totalDays = Math.max(1, Math.round((end - start) / (24 * 3600 * 1000)));
    const step = Math.max(1, Math.ceil(totalDays / 16));

    for (let d = 0; d <= totalDays; d += step) {
      const tickDate = new Date(start.getTime() + d * 24 * 3600 * 1000);
      const x = layout.xForInstant(tickDate);

      group.appendChild(
        el('line', {
          x1: x,
          x2: x,
          y1: AXIS_HEIGHT,
          y2: layout.chartHeight + AXIS_HEIGHT,
          class: 'axis-gridline',
        })
      );

      const label = el('text', { x, y: AXIS_HEIGHT - 12, class: 'axis-label', 'text-anchor': 'middle' });
      label.textContent = formatDate(tickDate);
      group.appendChild(label);
    }
    return group;
  }

  renderEvents(layout, project) {
    const storylineById = new Map(project.storylines.map((s) => [s.id, s]));
    const group = el('g', { class: 'events' });
    for (const event of layout.events) {
      const y = event.y + AXIS_HEIGHT;
      const nodeGroup = el('g', { class: 'event-node', transform: `translate(${event.x}, ${y})` });
      nodeGroup.style.cursor = 'pointer';

      nodeGroup.appendChild(el('circle', { r: NODE_RADIUS, class: 'event-dot' }));

      const label = el('text', {
        x: 0,
        y: -NODE_RADIUS - 8,
        'text-anchor': 'middle',
        class: 'event-label',
      });
      label.textContent = event.title;
      nodeGroup.appendChild(label);

      const storyline = storylineById.get(event.storylineId);
      const tooltipContent = {
        title: event.title,
        meta: [formatDateTime(event.date, event.time), storyline?.name].filter(Boolean).join(' · '),
        description: event.description,
        color: storyline?.color,
      };
      nodeGroup.addEventListener('mouseenter', (e) => this.tooltip.show(tooltipContent, e.clientX, e.clientY));
      nodeGroup.addEventListener('mousemove', (e) => this.tooltip.move(e.clientX, e.clientY));
      nodeGroup.addEventListener('mouseleave', () => this.tooltip.hide());

      if (this.onEventClick) {
        nodeGroup.addEventListener('click', () => this.onEventClick(event.id));
      }

      group.appendChild(nodeGroup);
    }
    return group;
  }
}
