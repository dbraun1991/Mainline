// Promise-based modal dialogs, replacing native confirm()/prompt() so
// styling stays consistent with the rest of the app and forms can have
// more than one field. Built entirely in JS (not markup in index.html) to
// keep the page's own HTML minimal.

function buildOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  const box = document.createElement('div');
  box.className = 'dialog-box';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  return { overlay, box };
}

function closeOverlay(overlay) {
  overlay.remove();
}

// Field values/options can come from user-authored project data (a
// storyline name, an event title imported from someone else's JSON file)
// and are interpolated into innerHTML below — escape them so a crafted
// name/title can't break out of an attribute or inject markup.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

export function alertDialog(message, { okLabel = 'OK' } = {}) {
  return new Promise((resolve) => {
    const { overlay, box } = buildOverlay();
    box.innerHTML = `
      <p class="dialog-message"></p>
      <div class="dialog-actions">
        <button type="button" class="dialog-confirm">${okLabel}</button>
      </div>
    `;
    box.querySelector('.dialog-message').textContent = message;

    const finish = () => {
      closeOverlay(overlay);
      resolve();
    };
    box.querySelector('.dialog-confirm').addEventListener('click', finish);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish();
    });
  });
}

export function confirmDialog(message, { confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    const { overlay, box } = buildOverlay();
    box.innerHTML = `
      <p class="dialog-message"></p>
      <div class="dialog-actions">
        <button type="button" class="dialog-cancel">${cancelLabel}</button>
        <button type="button" class="dialog-confirm dialog-confirm-danger">${confirmLabel}</button>
      </div>
    `;
    box.querySelector('.dialog-message').textContent = message;

    const finish = (result) => {
      closeOverlay(overlay);
      resolve(result);
    };
    box.querySelector('.dialog-cancel').addEventListener('click', () => finish(false));
    box.querySelector('.dialog-confirm').addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(false);
    });
  });
}

// fields: [{ name, label, type: 'text'|'date'|'time'|'color'|'textarea'|'select', value, required, disabled, options, onChange }]
// select field options: [{ value, label, disabled }]. `onChange(value, form)`
// fires whenever that field's value changes — lets a caller narrow one
// field's options based on another's live selection (a "storyline, then
// event on it" two-step picker, docs/adr/0014-branching-storylines.md)
// without formDialog needing to know anything about what depends on what.
// A disabled select is exempt from `required` and omitted from the
// submitted FormData by the browser itself — no extra handling needed
// here for a field a caller has disabled via onChange.
// Resolves with the submitted field values, `null` on cancel, or the
// sentinel `{ deleted: true }` when `deleteLabel` is set and clicked
// (editor-actions.js's editEvent/editStoryline check for it).
export function formDialog({ title, fields, submitLabel = 'Save', deleteLabel }) {
  return new Promise((resolve) => {
    const { overlay, box } = buildOverlay();

    const fieldsHtml = fields
      .map((f) => {
        const id = `field-${f.name}`;
        const requiredAttr = f.required ? 'required' : '';
        const disabledAttr = f.disabled ? 'disabled' : '';
        let inputHtml;
        if (f.type === 'textarea') {
          inputHtml = `<textarea id="${id}" name="${f.name}" ${requiredAttr}>${escapeHtml(f.value)}</textarea>`;
        } else if (f.type === 'select') {
          const options = f.options
            .map(
              (o) =>
                `<option value="${escapeHtml(o.value)}" ${o.value === f.value ? 'selected' : ''} ${o.disabled ? 'disabled' : ''}>${escapeHtml(o.label)}</option>`
            )
            .join('');
          inputHtml = `<select id="${id}" name="${f.name}" ${requiredAttr} ${disabledAttr}>${options}</select>`;
        } else {
          inputHtml = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${escapeHtml(f.value)}" ${requiredAttr} />`;
        }
        return `<label class="dialog-field" for="${id}">${escapeHtml(f.label)}${inputHtml}</label>`;
      })
      .join('');

    box.innerHTML = `
      <h2 class="dialog-title"></h2>
      <form class="dialog-form">
        ${fieldsHtml}
        <div class="dialog-actions">
          ${deleteLabel ? `<button type="button" class="dialog-delete">${deleteLabel}</button>` : ''}
          <button type="button" class="dialog-cancel">Cancel</button>
          <button type="submit" class="dialog-confirm">${submitLabel}</button>
        </div>
      </form>
    `;
    box.querySelector('.dialog-title').textContent = title;

    const form = box.querySelector('.dialog-form');
    const finish = (result) => {
      closeOverlay(overlay);
      resolve(result);
    };

    for (const f of fields) {
      if (f.onChange) {
        form.querySelector(`[name="${f.name}"]`).addEventListener('change', (e) => f.onChange(e.target.value, form));
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      finish(data);
    });
    box.querySelector('.dialog-cancel').addEventListener('click', () => finish(null));
    box.querySelector('.dialog-delete')?.addEventListener('click', () => finish({ deleted: true }));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(null);
    });

    box.querySelector('input, textarea, select')?.focus();
  });
}

// A static how-to overlay, opened from the header's "?" button. Content is
// authored here, not user data, so it's safe to set via innerHTML directly
// (unlike the fields above, which go through escapeHtml).
export function helpDialog() {
  return new Promise((resolve) => {
    const { overlay, box } = buildOverlay();
    box.classList.add('help-dialog-box');
    box.innerHTML = `
      <h2 class="dialog-title">How Mainline works</h2>
      <div class="help-content">
        <section>
          <h3>Plots</h3>
          <p>A <strong>plot</strong> is one project — its own storylines and
          events. Switch between plots in the sidebar, or click
          <strong>+ New Plot</strong> to start another. Drag the sidebar's
          right edge to resize it.</p>
        </section>
        <section>
          <h3>Storylines</h3>
          <p>Each storyline is a lane. Click <strong>+ Storyline</strong> to
          add one, or click a lane's label to rename, recolor, or delete it.</p>
        </section>
        <section>
          <h3>Events</h3>
          <p>Add an event with the header's <strong>+ Event</strong> button,
          or click directly on a storyline's line at roughly the right point
          in time — the storyline and date come pre-filled. Click an
          existing event to edit or delete it, or hover it to see its full
          date, storyline, and description.</p>
        </section>
        <section>
          <h3>Forking a storyline</h3>
          <p>A storyline can split off another at a specific moment — pick
          which storyline, then which of its events, when creating it, and
          the fork point follows automatically. Deleting a storyline that
          others fork from detaches them rather than deleting them too.</p>
        </section>
        <section>
          <h3>Saving &amp; sharing</h3>
          <p>Every change autosaves to this browser. Use <strong>Export
          JSON</strong>/<strong>Import JSON</strong> to move a plot between
          devices or into version control — including a plot an LLM
          assembled for you from a manuscript or outline
          (<code>docs/llm-import-dsl.md</code>).</p>
        </section>
      </div>
      <div class="dialog-actions">
        <button type="button" class="dialog-confirm">Got it</button>
      </div>
    `;

    const finish = () => {
      closeOverlay(overlay);
      resolve();
    };
    box.querySelector('.dialog-confirm').addEventListener('click', finish);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish();
    });
  });
}
