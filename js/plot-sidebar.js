// Renders the list of saved plots in the sidebar. Purely presentational —
// it just draws the list and reports clicks; app.js owns which plot is
// actually active and what loading/creating one means
// (docs/adr/0007-multi-plot-sidebar.md).
export class PlotSidebar {
  constructor(containerSelector, { onSelect } = {}) {
    this.list = document.querySelector(containerSelector);
    this.onSelect = onSelect;
  }

  render(plots, activePlotId) {
    this.list.innerHTML = '';
    for (const plot of plots) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'plot-item';
      if (plot.id === activePlotId) button.classList.add('active');
      button.textContent = plot.title;
      button.addEventListener('click', () => this.onSelect?.(plot.id));
      item.appendChild(button);
      this.list.appendChild(item);
    }
  }
}
