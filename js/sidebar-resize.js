const MIN_WIDTH = 180;
const MAX_WIDTH = 420;

// Drag-to-resize the plot sidebar, adapted from a sibling project's
// resizable-panel pattern: mousedown starts the drag, window-level
// mousemove/mouseup track it (so the drag keeps working even once the
// cursor leaves the narrow handle), width is clamped to a sane range.
// No collapse-to-rail behavior here, unlike that pattern's source — this
// sidebar isn't competing with a multi-panel workspace for screen space.
export function initSidebarResize(sidebarSelector, handleSelector) {
  const sidebar = document.querySelector(sidebarSelector);
  const handle = document.querySelector(handleSelector);

  handle.addEventListener('mousedown', (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebar.getBoundingClientRect().width;

    handle.classList.add('resizing');
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const onMove = (moveEvent) => {
      const width = startWidth + (moveEvent.clientX - startX);
      sidebar.style.width = `${Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))}px`;
    };
    const onUp = () => {
      handle.classList.remove('resizing');
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}
