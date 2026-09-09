// Combines a "YYYY-MM-DD" date and an optional "HH:MM" time into a single
// sortable/positionable Date. Missing time defaults to midnight so
// date-only events still get a stable, sortable instant.
export function toInstant(date, time) {
  const iso = time ? `${date}T${time}:00` : `${date}T00:00:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date/time: ${date} ${time || ''}`);
  }
  return parsed;
}

export function formatDate(date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date, time) {
  const d = toInstant(date, time);
  const datePart = formatDate(d);
  return time ? `${datePart}, ${time}` : datePart;
}

// Local-time "YYYY-MM-DD"/"HH:MM" (matching toInstant's own local-time
// parsing above, not UTC — Date#toISOString would silently shift by the
// browser's timezone offset here) for seeding a date/time <input> from a
// Date, e.g. a click-to-create-event instant (js/layout-engine.js's
// instantForX).
export function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toTimeInputValue(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// A click position maps to an exact-to-the-millisecond instant, which is
// more precision than a HH:MM time field can hold or a user would ever
// intend — round to the nearest quarter hour before offering it back.
export function snapToQuarterHour(date) {
  const snapped = new Date(date);
  const remainder = snapped.getMinutes() % 15;
  const delta = remainder >= 8 ? 15 - remainder : -remainder;
  snapped.setMinutes(snapped.getMinutes() + delta, 0, 0);
  return snapped;
}

// Real RFC 4122 v4 UUIDs (via the browser's native crypto, not a
// dependency), kept human-scannable with a type prefix (sl-/ev-/plot-)
// rather than bare — easier to tell what an id refers to while debugging.
export function uid(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}
