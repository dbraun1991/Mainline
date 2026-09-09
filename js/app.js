import { DataModel } from './data-model.js';
import { LayoutEngine } from './layout-engine.js';
import { SwimlaneRenderer } from './swimlane-renderer.js';
import { PlotSidebar } from './plot-sidebar.js';
import { initSidebarResize } from './sidebar-resize.js';
import { editorActions } from './editor-actions.js';
import { fileManagerActions } from './file-manager.js';
import { alertDialog, formDialog, helpDialog } from './dialog.js';
import { snapToQuarterHour, toDateInputValue, toTimeInputValue } from './utils.js';

class App {
  constructor() {
    this.dataModel = new DataModel();
    this.layoutEngine = new LayoutEngine();
    this.renderer = new SwimlaneRenderer('#chart', {
      onEventClick: (eventId) => this.handleEditEvent(eventId),
      onLaneClick: (storylineId) => this.handleEditStoryline(storylineId),
      onLaneLineClick: (storylineId, instant) => this.handleAddEventAt(storylineId, instant),
    });
    this.plotSidebar = new PlotSidebar('#plot-list', {
      onSelect: (id) => this.handleSwitchPlot(id),
    });
    this.project = null;
    this.activePlotId = null;
  }

  async init() {
    let plots = fileManagerActions.listPlots();
    let activeId = fileManagerActions.getActivePlotId();

    if (plots.length === 0) {
      const example = await this.dataModel.loadFromUrl('data/example.json').then((p) => this.dataModel.toJSON(p));
      activeId = fileManagerActions.createPlot(example);
    } else if (!activeId || !plots.some((p) => p.id === activeId)) {
      activeId = plots[0].id;
      fileManagerActions.setActivePlot(activeId);
    }

    this.activePlotId = activeId;
    this.project = this.dataModel.validateAndNormalize(fileManagerActions.loadPlot(activeId));

    this.bindHeader();
    initSidebarResize('.plot-sidebar', '#sidebar-resize-handle');
    this.render();
  }

  render() {
    document.querySelector('#project-title').textContent = this.project.meta.title || 'Untitled Plot';
    const layout = this.layoutEngine.compute(this.project);
    this.renderer.render(this.project, layout);
    this.plotSidebar.render(fileManagerActions.listPlots(), this.activePlotId);
  }

  async persist() {
    fileManagerActions.savePlot(this.activePlotId, this.dataModel.toJSON(this.project));
  }

  async handleSwitchPlot(id) {
    if (id === this.activePlotId) return;
    this.activePlotId = id;
    fileManagerActions.setActivePlot(id);
    this.project = this.dataModel.validateAndNormalize(fileManagerActions.loadPlot(id));
    this.render();
  }

  async handleNewPlot() {
    const result = await formDialog({
      title: 'New Plot',
      submitLabel: 'Create',
      fields: [{ name: 'title', label: 'Title', required: true }],
    });
    if (!result) return;

    const rawProject = { meta: { title: result.title }, storylines: [], events: [] };
    this.activePlotId = fileManagerActions.createPlot(rawProject);
    this.project = this.dataModel.validateAndNormalize(rawProject);
    this.render();
  }

  async applyIfChanged(changed) {
    if (!changed) return;
    await this.persist();
    this.render();
  }

  async handleAddStoryline() {
    await this.applyIfChanged(await editorActions.addStoryline(this.project));
  }

  async handleEditStoryline(storylineId) {
    await this.applyIfChanged(await editorActions.editStoryline(this.project, storylineId));
  }

  async handleAddEvent() {
    await this.applyIfChanged(await editorActions.addEvent(this.project));
  }

  async handleAddEventAt(storylineId, instant) {
    const snapped = snapToQuarterHour(instant);
    await this.applyIfChanged(
      await editorActions.addEvent(this.project, {
        storylineId,
        date: toDateInputValue(snapped),
        time: toTimeInputValue(snapped),
      })
    );
  }

  async handleEditEvent(eventId) {
    await this.applyIfChanged(await editorActions.editEvent(this.project, eventId));
  }

  bindHeader() {
    document.querySelector('#help-button').addEventListener('click', () => helpDialog());
    document.querySelector('#new-plot').addEventListener('click', () => this.handleNewPlot());
    document.querySelector('#add-storyline').addEventListener('click', () => this.handleAddStoryline());
    document.querySelector('#add-event').addEventListener('click', () => this.handleAddEvent());
    document.querySelector('#export-json').addEventListener('click', () => {
      fileManagerActions.exportAsJSON(this.dataModel.toJSON(this.project));
    });

    const importInput = document.querySelector('#import-json');
    document.querySelector('#import-trigger').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const raw = await fileManagerActions.importFromFile(file);
        this.project = this.dataModel.validateAndNormalize(raw);
        await this.persist();
        this.render();
      } catch (err) {
        await alertDialog(`Could not import file: ${err.message}`);
      } finally {
        importInput.value = '';
      }
    });
  }
}

new App().init();
