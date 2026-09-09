// Floating HTML tooltip for event nodes. Native SVG <title> tooltips can't
// be styled and truncate awkwardly, so this renders a themed card instead
// and can comfortably hold a title, metadata, and a long free-text
// description (docs/adr/0002-swimlane-visualization.md).
const VIEWPORT_MARGIN = 12;
const CURSOR_OFFSET = 16;

export class EventTooltip {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'event-tooltip';
    this.el.hidden = true;

    this.dot = document.createElement('span');
    this.dot.className = 'event-tooltip-dot';

    this.title = document.createElement('div');
    this.title.className = 'event-tooltip-title';

    const header = document.createElement('div');
    header.className = 'event-tooltip-header';
    header.append(this.dot, this.title);

    this.meta = document.createElement('div');
    this.meta.className = 'event-tooltip-meta';

    this.description = document.createElement('div');
    this.description.className = 'event-tooltip-description';

    this.el.append(header, this.meta, this.description);
    document.body.appendChild(this.el);
  }

  show({ title, meta, description, color }, x, y) {
    this.title.textContent = title;
    this.meta.textContent = meta;
    this.dot.style.background = color || 'transparent';

    this.description.textContent = description || '';
    this.description.hidden = !description;

    this.el.hidden = false;
    this.move(x, y);
  }

  move(x, y) {
    if (this.el.hidden) return;

    // Provisionally place it, measure, then clamp to the viewport so long
    // descriptions never get clipped off the edge of the screen.
    let left = x + CURSOR_OFFSET;
    let top = y + CURSOR_OFFSET;
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;

    const rect = this.el.getBoundingClientRect();
    if (rect.right > window.innerWidth - VIEWPORT_MARGIN) {
      left = x - CURSOR_OFFSET - rect.width;
    }
    if (rect.bottom > window.innerHeight - VIEWPORT_MARGIN) {
      top = y - CURSOR_OFFSET - rect.height;
    }
    left = Math.max(VIEWPORT_MARGIN, left);
    top = Math.max(VIEWPORT_MARGIN, top);

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  hide() {
    this.el.hidden = true;
  }
}
