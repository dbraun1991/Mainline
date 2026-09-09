import { uid } from './utils.js';

const STORAGE_KEY = 'mainline_plots';
// Both pre-rename keys this app has ever used: the multi-plot store from
// before the Storylane -> Mainline rename, and (nested inside that
// migration) the original single-project key from before multi-plot
// support existed at all (docs/adr/0004-persistence.md,
// docs/adr/0007-multi-plot-sidebar.md).
const PREVIOUS_STORAGE_KEY = 'storylane_plots';
const LEGACY_STORAGE_KEY = 'storylane_project';

// Reads the multi-plot store, migrating an older save into it once, on
// first read after an upgrade, so nobody's existing browser-local plots
// disappear — chains through every key this app has ever used.
function readStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);

  const previous = localStorage.getItem(PREVIOUS_STORAGE_KEY);
  if (previous) {
    localStorage.setItem(STORAGE_KEY, previous);
    localStorage.removeItem(PREVIOUS_STORAGE_KEY);
    return JSON.parse(previous);
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    const id = uid('plot');
    const store = { activeId: id, plots: [{ id, project: JSON.parse(legacy) }] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return store;
  }

  return { activeId: null, plots: [] };
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Client-side-only persistence: an autosaved copy in localStorage — now one
// entry per plot instead of a single project — plus manual JSON
// export/import for moving a plot between devices or into version control
// (docs/adr/0004-persistence.md, docs/adr/0007-multi-plot-sidebar.md). No
// backend.
export const fileManagerActions = {
  // { id, title }[], in the order plots were created.
  listPlots() {
    return readStore().plots.map(({ id, project }) => ({
      id,
      title: project.meta?.title || 'Untitled Plot',
    }));
  },

  getActivePlotId() {
    return readStore().activeId;
  },

  setActivePlot(id) {
    const store = readStore();
    store.activeId = id;
    writeStore(store);
  },

  loadPlot(id) {
    return readStore().plots.find((p) => p.id === id)?.project ?? null;
  },

  savePlot(id, rawProject) {
    const store = readStore();
    const entry = store.plots.find((p) => p.id === id);
    if (entry) entry.project = rawProject;
    else store.plots.push({ id, project: rawProject });
    writeStore(store);
  },

  createPlot(rawProject) {
    const id = uid('plot');
    const store = readStore();
    store.plots.push({ id, project: rawProject });
    store.activeId = id;
    writeStore(store);
    return id;
  },

  exportAsJSON(rawProject) {
    const blob = new Blob([JSON.stringify(rawProject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const title = (rawProject.meta?.title || 'mainline-project').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
    a.href = url;
    a.download = `${title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(reader.result));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  },
};
