import { alertDialog, confirmDialog, formDialog } from './dialog.js';
import { nextColor } from './color-utils.js';
import { toInstant, uid } from './utils.js';

function storylineOptions(project) {
  return project.storylines.map((s) => ({ value: s.id, label: s.name }));
}

// Every storyline that (transitively) forks from `storylineId` — these,
// plus the storyline itself, can never be offered as a fork target when
// editing it, the same cycle rule data-model.js enforces on load, kept
// out of the UI before it can even be submitted
// (docs/adr/0014-branching-storylines.md).
function descendantStorylineIds(project, storylineId) {
  const childrenByParentId = new Map();
  for (const s of project.storylines) {
    if (s.forksFrom) {
      const siblings = childrenByParentId.get(s.forksFrom.storylineId) || [];
      siblings.push(s.id);
      childrenByParentId.set(s.forksFrom.storylineId, siblings);
    }
  }
  const ids = new Set();
  const visit = (id) => {
    for (const childId of childrenByParentId.get(id) || []) {
      if (!ids.has(childId)) {
        ids.add(childId);
        visit(childId);
      }
    }
  };
  visit(storylineId);
  return ids;
}

const NO_FORK = '__none__';
const KEEP_FORK = '__keep__';

function eventOptionsFor(project, storylineId) {
  return project.events
    .filter((e) => e.storylineId === storylineId)
    .map((e) => ({ value: e.id, label: `${e.title} (${e.date})` }));
}

// Replaces the event <select>'s options in place to match whichever
// storyline is currently picked in step 1 — DOM-safe (textContent, not
// innerHTML) since event titles are user-authored content that could
// contain markup (e.g. imported from someone else's JSON file).
function populateForkEventSelect(select, project, storylineId) {
  select.innerHTML = '';
  if (!storylineId || storylineId === NO_FORK || storylineId === KEEP_FORK) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '—';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    select.disabled = true;
    return;
  }
  for (const opt of eventOptionsFor(project, storylineId)) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }
  select.disabled = false;
}

// The two-step "Forks from" picker (docs/adr/0014-branching-storylines.md):
// step 1 narrows to a storyline, step 2 — populated live via onChange, see
// populateForkEventSelect — picks one of *its* events, never a flat list
// of every event in the project. `current` is the storyline's existing
// forksFrom, if editing one that already has one.
function forkFields(project, { excludeStorylineId, current } = {}) {
  const excluded = excludeStorylineId
    ? new Set([excludeStorylineId, ...descendantStorylineIds(project, excludeStorylineId)])
    : new Set();
  const candidates = project.storylines.filter(
    (s) => !excluded.has(s.id) && project.events.some((e) => e.storylineId === s.id)
  );

  const storylineOptions = [];
  if (current) {
    const parent = project.storylines.find((s) => s.id === current.storylineId);
    // Only a date/time snapshot is stored, not the originating event's id
    // (docs/adr/0014-branching-storylines.md), so the form can't know
    // which event to re-select — "keep current" exists specifically so
    // reopening this form doesn't read as "detach this fork" by default.
    storylineOptions.push({
      value: KEEP_FORK,
      label: `Keep current (forks from ${parent?.name ?? 'unknown storyline'} on ${current.date})`,
    });
  }
  storylineOptions.push({
    value: NO_FORK,
    label: current ? 'Make independent (remove fork)' : '— None (independent storyline) —',
  });
  storylineOptions.push(...candidates.map((s) => ({ value: s.id, label: s.name })));

  return [
    {
      name: 'forksFromStoryline',
      label: 'Forks from',
      type: 'select',
      value: current ? KEEP_FORK : NO_FORK,
      options: storylineOptions,
      onChange: (value, form) => {
        populateForkEventSelect(form.querySelector('[name="forksFromEvent"]'), project, value);
      },
    },
    {
      name: 'forksFromEvent',
      label: 'At event',
      type: 'select',
      required: true,
      disabled: true,
      value: '',
      options: [{ value: '', label: '—', disabled: true }],
    },
  ];
}

// Turns the two-step "Forks from" result's chosen event back into a
// forksFrom value (or undefined). Derives `instant` inline (matching
// addEvent/editEvent's own event.instant) since this storyline goes
// straight into the live in-memory project, not back through
// data-model.js's load-time derivation — without it, the fork would
// render at x=NaN until the next reload.
function resolveForksFrom(project, eventId) {
  const event = project.events.find((e) => e.id === eventId);
  if (!event) return undefined;
  return { storylineId: event.storylineId, date: event.date, time: event.time, instant: toInstant(event.date, event.time) };
}

// Each action mutates `project` in place and returns true if it did —
// callers (app.js) use that to decide whether to re-render and autosave.
export const editorActions = {
  async addStoryline(project) {
    const result = await formDialog({
      title: 'New Storyline',
      submitLabel: 'Add',
      fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'color', label: 'Color', type: 'color', value: nextColor(project.storylines) },
        ...forkFields(project),
      ],
    });
    if (!result) return false;

    const storyline = { id: uid('sl'), name: result.name, color: result.color };
    if (result.forksFromStoryline !== NO_FORK) {
      storyline.forksFrom = resolveForksFrom(project, result.forksFromEvent);
    }
    project.storylines.push(storyline);
    return true;
  },

  async editStoryline(project, storylineId) {
    const storyline = project.storylines.find((s) => s.id === storylineId);
    if (!storyline) return false;

    const result = await formDialog({
      title: 'Edit Storyline',
      deleteLabel: 'Delete Storyline',
      fields: [
        { name: 'name', label: 'Name', required: true, value: storyline.name },
        { name: 'color', label: 'Color', type: 'color', value: storyline.color },
        ...forkFields(project, { excludeStorylineId: storylineId, current: storyline.forksFrom }),
      ],
    });
    if (!result) return false;
    if (result.deleted) return editorActions.deleteStoryline(project, storylineId);

    storyline.name = result.name;
    storyline.color = result.color;
    if (result.forksFromStoryline === KEEP_FORK) {
      // unchanged
    } else if (result.forksFromStoryline === NO_FORK) {
      delete storyline.forksFrom;
    } else {
      storyline.forksFrom = resolveForksFrom(project, result.forksFromEvent);
    }
    return true;
  },

  async deleteStoryline(project, storylineId) {
    const storyline = project.storylines.find((s) => s.id === storylineId);
    if (!storyline) return false;

    const eventCount = project.events.filter((e) => e.storylineId === storylineId).length;
    const childCount = project.storylines.filter((s) => s.forksFrom?.storylineId === storylineId).length;
    const clauses = [];
    if (eventCount > 0) clauses.push(`its ${eventCount} event(s)`);
    if (childCount > 0) clauses.push(`detach ${childCount} storyline(s) forked from it`);
    const message =
      clauses.length > 0
        ? `Delete "${storyline.name}" and ${clauses.join(' and ')}? This cannot be undone.`
        : `Delete "${storyline.name}"?`;
    const confirmed = await confirmDialog(message, { confirmLabel: 'Delete' });
    if (!confirmed) return false;

    // Children keep all their own data (name, color, events) — only the
    // fork link is severed, so deleting a parent never silently destroys
    // a subplot's own content (docs/adr/0014-branching-storylines.md).
    for (const s of project.storylines) {
      if (s.forksFrom?.storylineId === storylineId) delete s.forksFrom;
    }

    project.storylines = project.storylines.filter((s) => s.id !== storylineId);
    project.events = project.events.filter((e) => e.storylineId !== storylineId);
    return true;
  },

  // defaults: { storylineId, date, time } — all optional, used to seed the
  // form when the event's storyline/date/time is already known (e.g.
  // clicking a lane's line directly, js/swimlane-renderer.js's
  // onLaneLineClick, rather than the generic "+ Event" header button).
  async addEvent(project, defaults = {}) {
    if (project.storylines.length === 0) {
      await alertDialog('Add a storyline first — an event needs one to belong to.');
      return false;
    }

    const result = await formDialog({
      title: 'New Event',
      submitLabel: 'Add',
      fields: [
        { name: 'title', label: 'Title', required: true },
        {
          name: 'storylineId',
          label: 'Storyline',
          type: 'select',
          required: true,
          value: defaults.storylineId || project.storylines[0].id,
          options: storylineOptions(project),
        },
        { name: 'date', label: 'Date', type: 'date', required: true, value: defaults.date || '' },
        { name: 'time', label: 'Time', type: 'time', value: defaults.time || '' },
        { name: 'description', label: 'Description', type: 'textarea' },
      ],
    });
    if (!result) return false;

    project.events.push({
      id: uid('ev'),
      storylineId: result.storylineId,
      title: result.title,
      date: result.date,
      time: result.time || undefined,
      description: result.description || undefined,
      instant: toInstant(result.date, result.time),
    });
    return true;
  },

  async editEvent(project, eventId) {
    const event = project.events.find((e) => e.id === eventId);
    if (!event) return false;

    const result = await formDialog({
      title: 'Edit Event',
      deleteLabel: 'Delete Event',
      fields: [
        { name: 'title', label: 'Title', required: true, value: event.title },
        {
          name: 'storylineId',
          label: 'Storyline',
          type: 'select',
          required: true,
          value: event.storylineId,
          options: storylineOptions(project),
        },
        { name: 'date', label: 'Date', type: 'date', required: true, value: event.date },
        { name: 'time', label: 'Time', type: 'time', value: event.time || '' },
        { name: 'description', label: 'Description', type: 'textarea', value: event.description || '' },
      ],
    });
    if (!result) return false;
    if (result.deleted) return editorActions.deleteEvent(project, eventId);

    event.title = result.title;
    event.storylineId = result.storylineId;
    event.date = result.date;
    event.time = result.time || undefined;
    event.description = result.description || undefined;
    event.instant = toInstant(result.date, result.time);
    return true;
  },

  async deleteEvent(project, eventId) {
    const event = project.events.find((e) => e.id === eventId);
    if (!event) return false;

    const confirmed = await confirmDialog(`Delete event "${event.title}"?`, { confirmLabel: 'Delete' });
    if (!confirmed) return false;

    project.events = project.events.filter((e) => e.id !== eventId);
    return true;
  },
};
