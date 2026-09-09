import { toInstant } from './utils.js';

// Handles loading, validating, and normalizing project data. A project is
// one JSON document: a set of storylines (swimlanes) and events, each event
// referencing its storyline by id (data/README-style schema, see
// docs/adr/0003-data-model.md). A storyline may also optionally reference
// another via forksFrom, forming a fork tree rather than only independent
// lanes (docs/adr/0014-branching-storylines.md).
export class DataModel {
  async loadFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return this.validateAndNormalize(await response.json());
  }

  validateAndNormalize(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid project data: expected an object');
    }
    if (!Array.isArray(data.storylines)) {
      throw new Error('Invalid project data: storylines must be an array');
    }
    if (!Array.isArray(data.events)) {
      throw new Error('Invalid project data: events must be an array');
    }

    const storylineIds = new Set(data.storylines.map((s) => s.id));

    // A storyline may optionally fork from another (docs/adr/0014-branching-storylines.md)
    // — forksFrom.date/time are a snapshot taken when the fork was created,
    // not a live reference, so they're validated/derived exactly like an
    // event's own date+time, below.
    const storylines = data.storylines.map((s) => {
      if (!s.forksFrom) return { ...s };
      if (!storylineIds.has(s.forksFrom.storylineId)) {
        throw new Error(`Storyline "${s.id}" forks from unknown storyline "${s.forksFrom.storylineId}"`);
      }
      if (s.forksFrom.storylineId === s.id) {
        throw new Error(`Storyline "${s.id}" cannot fork from itself`);
      }
      return {
        ...s,
        forksFrom: { ...s.forksFrom, instant: toInstant(s.forksFrom.date, s.forksFrom.time) },
      };
    });
    assertNoForkCycles(storylines);

    const events = data.events.map((e) => {
      if (!storylineIds.has(e.storylineId)) {
        throw new Error(`Event "${e.id}" references unknown storyline "${e.storylineId}"`);
      }
      return { ...e, instant: toInstant(e.date, e.time) };
    });
    events.sort((a, b) => a.instant - b.instant);

    return {
      meta: data.meta || {},
      storylines,
      events,
    };
  }

  // Strips the derived `instant` fields back off before serializing —
  // both an event's own and a storyline's forksFrom.instant are
  // recomputed on load, so neither should round-trip into saved JSON.
  toJSON(project) {
    return {
      meta: project.meta,
      storylines: project.storylines.map((s) => {
        if (!s.forksFrom) return s;
        const { instant, ...forksFrom } = s.forksFrom;
        return { ...s, forksFrom };
      }),
      events: project.events.map(({ instant, ...rest }) => rest),
    };
  }
}

// A storyline forking from a storyline that (transitively) forks from it
// would have no valid row (js/layout-engine.js's DFS ordering would never
// terminate) — walk each one's ancestor chain and reject before that can
// happen (docs/adr/0014-branching-storylines.md).
function assertNoForkCycles(storylines) {
  const byId = new Map(storylines.map((s) => [s.id, s]));
  for (const storyline of storylines) {
    const seen = new Set();
    let current = storyline;
    while (current.forksFrom) {
      if (seen.has(current.id)) {
        throw new Error(`Storyline "${storyline.id}" has a circular forksFrom chain`);
      }
      seen.add(current.id);
      current = byId.get(current.forksFrom.storylineId);
    }
  }
}
