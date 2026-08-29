/* ============================================================
   Day Dashboard — app.js
   Modules: StorageManager, ThemeModule, ClockModule,
            TimerModule, TodoModule, LinksModule + Bootstrap
   ============================================================ */

'use strict';

/* ============================================================
   StorageManager
   Centralises all localStorage access with error handling.
   ============================================================ */
const StorageManager = (() => {

  function isAvailable() {
    try {
      const probe = '__dashboard_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('[StorageManager] save failed:', key, err);
      document.dispatchEvent(new CustomEvent('storage:error', { detail: { key, err } }));
    }
  }

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[StorageManager] load failed:', key, err);
      return fallback;
    }
  }

  return { isAvailable, save, load };
})();


/* ============================================================
   ThemeModule
   Persists and toggles light / dark theme on <body>.
   ============================================================ */
const ThemeModule = (() => {

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    const icon  = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (icon)  icon.textContent  = theme === 'dark' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }

  function init() {
    const saved = StorageManager.load('theme', 'light');
    applyTheme(saved);

    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = document.body.dataset.theme || 'light';
      const next    = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      StorageManager.save('theme', next);
    });
  }

  return { init };
})();


/* ============================================================
   ClockModule
   Live clock, date, and time-based greeting in the header.
   ============================================================ */
const ClockModule = (() => {

  // Pure function — testable in isolation
  function getGreeting(hour) {
    if (hour >= 5  && hour <= 11) return 'Good morning';
    if (hour >= 12 && hour <= 16) return 'Good afternoon';
    if (hour >= 17 && hour <= 20) return 'Good evening';
    return 'Good night';
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function tick() {
    const now  = new Date();
    const h    = now.getHours();
    const m    = now.getMinutes();
    const s    = now.getSeconds();

    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    const greetEl = document.getElementById('greeting');

    if (timeEl)  timeEl.textContent  = `${pad(h)}:${pad(m)}:${pad(s)}`;
    if (dateEl)  dateEl.textContent  = now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    if (greetEl) {
      const name = StorageManager.load('username', '');
      greetEl.textContent = name
        ? `${getGreeting(h)}, ${name}! 👋`
        : `${getGreeting(h)}! 👋`;
    }
  }

  function init() {
    tick();
    setInterval(tick, 1000);
  }

  return { init, getGreeting };
})();


/* ============================================================
   TimerModule
   Pomodoro-style focus timer with configurable duration.
   ============================================================ */
const TimerModule = (() => {

  // ---------- Pure helpers ----------

  // Pure function — testable in isolation
  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Pure function — testable in isolation
  function validateDuration(n) {
    const num = Number(n);
    if (!Number.isInteger(num) || num < 1 || num > 120) {
      return { valid: false, message: 'Duration must be a whole number between 1 and 120 minutes.' };
    }
    return { valid: true };
  }

  // ---------- State ----------
  let sessionDuration  = 25;   // minutes
  let secondsRemaining = 25 * 60;
  let isRunning        = false;
  let isComplete       = false;
  let intervalId       = null;

  // ---------- Render ----------
  function render() {
    const display   = document.getElementById('timer-display');
    const indicator = document.getElementById('timer-complete-indicator');

    if (display) {
      display.textContent = formatTime(secondsRemaining);
      display.classList.toggle('running', isRunning);
      display.classList.toggle('complete', isComplete);
    }

    if (indicator) {
      if (isComplete) {
        indicator.removeAttribute('hidden');
      } else {
        indicator.setAttribute('hidden', '');
      }
    }
  }

  function clearError() {
    const err = document.getElementById('timer-error');
    if (err) {
      err.textContent = '';
      err.classList.remove('visible');
    }
  }

  function showError(msg) {
    const err = document.getElementById('timer-error');
    if (err) {
      err.textContent = msg;
      err.classList.add('visible');
    }
  }

  // ---------- Actions ----------
  function start() {
    if (isRunning) return;         // idempotent
    if (isComplete) {
      isComplete = false;
      secondsRemaining = sessionDuration * 60;
    }
    if (secondsRemaining <= 0) secondsRemaining = sessionDuration * 60;
    isRunning = true;
    clearError();
    render();

    intervalId = setInterval(() => {
      secondsRemaining--;
      if (secondsRemaining <= 0) {
        secondsRemaining = 0;
        isComplete = true;
        isRunning  = false;
        clearInterval(intervalId);
        intervalId = null;
        render();
        // Attempt an audio or vibration cue
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch {}
      } else {
        render();
      }
    }, 1000);
  }

  function stop() {
    if (!isRunning) return;
    clearInterval(intervalId);
    intervalId = null;
    isRunning  = false;
    render();
  }

  function reset() {
    clearInterval(intervalId);
    intervalId       = null;
    isRunning        = false;
    isComplete       = false;
    secondsRemaining = sessionDuration * 60;
    clearError();
    render();
  }

  // ---------- Init ----------
  function init() {
    const saved = StorageManager.load('timer', { sessionDuration: 25 });
    sessionDuration  = saved.sessionDuration || 25;
    secondsRemaining = sessionDuration * 60;

    const durationInput = document.getElementById('timer-duration-input');
    if (durationInput) durationInput.value = sessionDuration;

    render();

    // Buttons
    document.getElementById('timer-start')?.addEventListener('click', start);
    document.getElementById('timer-stop')?.addEventListener('click', stop);
    document.getElementById('timer-reset')?.addEventListener('click', reset);

    // Duration input — validate on change and blur
    if (durationInput) {
      function handleDurationChange() {
        const result = validateDuration(durationInput.value);
        if (result.valid) {
          sessionDuration = Number(durationInput.value);
          StorageManager.save('timer', { sessionDuration });
          if (!isRunning) {
            secondsRemaining = sessionDuration * 60;
          }
          clearError();
          render();
        } else {
          showError(result.message);
          durationInput.value = sessionDuration; // revert
        }
      }
      durationInput.addEventListener('change', handleDurationChange);
      durationInput.addEventListener('blur',   handleDurationChange);
    }
  }

  return { init, formatTime, validateDuration };
})();


/* ============================================================
   TodoModule
   Full CRUD to-do list with inline editing, sorting,
   and localStorage persistence.
   ============================================================ */
const TodoModule = (() => {

  // ---------- ID generation ----------
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ---------- Pure helpers ----------

  // Pure function — testable in isolation
  function validateTitle(str) {
    if (typeof str !== 'string') return { valid: false, message: 'Title must be a string.' };
    const trimmed = str.trim();
    if (trimmed.length === 0) return { valid: false, message: 'Task title cannot be empty.' };
    if (trimmed.length > 200) return { valid: false, message: 'Task title must be 200 characters or fewer.' };
    return { valid: true, title: trimmed };
  }

  // Pure function — testable in isolation
  function sortTasks(tasks, order) {
    const copy = [...tasks];
    if (order === 'status') {
      return copy.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1; // incomplete first
        return a.createdAt - b.createdAt;
      });
    }
    // default: 'creation'
    return copy.sort((a, b) => a.createdAt - b.createdAt);
  }

  // ---------- State ----------
  let tasks     = [];
  let sortOrder = 'creation';

  function persist() {
    StorageManager.save('todos', tasks);
  }

  // ---------- Render ----------
  function render() {
    const list = document.getElementById('todo-list');
    if (!list) return;

    const sorted = sortTasks(tasks, sortOrder);
    list.innerHTML = '';

    if (sorted.length === 0) {
      list.innerHTML = `
        <li class="todo-empty" role="listitem">
          <div class="todo-empty-icon">📝</div>
          <div>No tasks yet. Add one above!</div>
        </li>`;
      return;
    }

    sorted.forEach(task => {
      const li = document.createElement('li');
      li.className = `todo-item${task.done ? ' done' : ''}`;
      li.dataset.id = task.id;
      li.setAttribute('role', 'listitem');

      li.innerHTML = `
        <button class="todo-toggle" aria-label="${task.done ? 'Mark incomplete' : 'Mark complete'}" title="${task.done ? 'Mark incomplete' : 'Mark complete'}">
          ${task.done ? '✓' : ''}
        </button>
        <span class="todo-title">${escapeHtml(task.title)}</span>
        <span class="todo-inline-error" aria-live="polite"></span>
        <div class="todo-actions">
          <button class="btn-icon todo-edit-btn" aria-label="Edit task" title="Edit">✏️</button>
          <button class="btn-icon btn-danger todo-delete-btn" aria-label="Delete task" title="Delete">🗑</button>
        </div>`;

      // Toggle done
      li.querySelector('.todo-toggle').addEventListener('click', () => {
        toggleTask(task.id);
      });

      // Edit
      li.querySelector('.todo-edit-btn').addEventListener('click', () => {
        startEdit(li, task);
      });

      // Delete
      li.querySelector('.todo-delete-btn').addEventListener('click', () => {
        deleteTask(task.id);
      });

      list.appendChild(li);
    });
  }

  // ---------- CRUD helpers ----------
  function addTask(rawTitle) {
    const result = validateTitle(rawTitle);
    const errEl  = document.getElementById('todo-add-error');
    if (!result.valid) {
      if (errEl) { errEl.textContent = result.message; errEl.classList.add('visible'); }
      return false;
    }
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
    tasks.push({
      id:        generateId(),
      title:     result.title,
      done:      false,
      createdAt: Date.now(),
    });
    persist();
    render();
    return true;
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    persist();
    render();
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.done = !task.done;
      persist();
      render();
    }
  }

  function updateTask(id, newTitle) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.title = newTitle;
      persist();
      render();
    }
  }

  // ---------- Inline edit ----------
  function startEdit(li, task) {
    const titleSpan  = li.querySelector('.todo-title');
    const inlineErr  = li.querySelector('.todo-inline-error');
    const editBtn    = li.querySelector('.todo-edit-btn');
    const deleteBtn  = li.querySelector('.todo-delete-btn');
    const toggleBtn  = li.querySelector('.todo-toggle');

    // Replace span with input
    const input = document.createElement('input');
    input.type      = 'text';
    input.className = 'todo-edit-input';
    input.maxLength = 200;
    input.value     = task.title;
    input.setAttribute('aria-label', 'Edit task title');

    titleSpan.replaceWith(input);
    editBtn.textContent = '💾';
    editBtn.setAttribute('aria-label', 'Save task');
    toggleBtn.disabled  = true;
    deleteBtn.disabled  = true;

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    function saveEdit() {
      const result = validateTitle(input.value);
      if (!result.valid) {
        inlineErr.textContent = result.message;
        inlineErr.classList.add('visible');
        input.focus();
        return;
      }
      inlineErr.textContent = '';
      inlineErr.classList.remove('visible');
      updateTask(task.id, result.title);
    }

    function cancelEdit() {
      // Restore without mutation
      const span = document.createElement('span');
      span.className   = 'todo-title';
      span.textContent = task.title;
      input.replaceWith(span);
      editBtn.textContent = '✏️';
      editBtn.setAttribute('aria-label', 'Edit task');
      toggleBtn.disabled  = false;
      deleteBtn.disabled  = false;
    }

    editBtn.onclick = saveEdit;

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); saveEdit(); }
      if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    });

    input.addEventListener('blur', () => {
      // Small delay so clicking the save button registers first
      setTimeout(() => {
        const active = document.activeElement;
        if (active !== editBtn && active !== input) {
          cancelEdit();
        }
      }, 150);
    });
  }

  // ---------- Init ----------
  function init() {
    tasks     = StorageManager.load('todos', []);
    sortOrder = StorageManager.load('todoSort', 'creation');

    // Sync sort select
    const sortSel = document.getElementById('todo-sort');
    if (sortSel) {
      sortSel.value = sortOrder;
      sortSel.addEventListener('change', () => {
        sortOrder = sortSel.value;
        StorageManager.save('todoSort', sortOrder);
        render();
      });
    }

    // Add button
    const addBtn  = document.getElementById('todo-add');
    const inputEl = document.getElementById('todo-input');

    function handleAdd() {
      if (!inputEl) return;
      const success = addTask(inputEl.value);
      if (success) {
        inputEl.value = '';
        inputEl.focus();
      }
    }

    addBtn?.addEventListener('click', handleAdd);
    inputEl?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    });

    // Clear error on input
    inputEl?.addEventListener('input', () => {
      const errEl = document.getElementById('todo-add-error');
      if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
    });

    render();
  }

  return { init, validateTitle, sortTasks };
})();


/* ============================================================
   LinksModule
   Add / delete quick-link buttons, persisted to localStorage.
   ============================================================ */
const LinksModule = (() => {

  // ---------- ID generation ----------
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ---------- Pure helpers ----------

  // Pure function — testable in isolation
  function validateLink(label, url) {
    const trimLabel = (label || '').trim();
    const trimUrl   = (url   || '').trim();

    if (trimLabel.length === 0)   return { valid: false, message: 'Label is required.' };
    if (trimLabel.length > 100)   return { valid: false, message: 'Label must be 100 characters or fewer.' };
    if (trimUrl.length === 0)     return { valid: false, message: 'URL is required.' };
    if (!/^https?:\/\//i.test(trimUrl)) return { valid: false, message: 'URL must start with http:// or https://' };
    if (trimUrl.length > 2048)    return { valid: false, message: 'URL must be 2048 characters or fewer.' };
    return { valid: true };
  }

  // ---------- State ----------
  let links = [];

  function persist() {
    StorageManager.save('links', links);
  }

  // ---------- Link icon helper ----------
  function getFavicon(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=16&domain=${domain}`;
    } catch {
      return null;
    }
  }

  // ---------- Render ----------
  function render() {
    const container = document.getElementById('links-list');
    if (!container) return;

    container.innerHTML = '';

    if (links.length === 0) {
      container.innerHTML = '<p class="links-empty">No links yet. Add one above!</p>';
      return;
    }

    links.forEach(link => {
      const item = document.createElement('div');
      item.className = 'link-item';
      item.setAttribute('role', 'listitem');

      const favicon = getFavicon(link.url);
      const imgTag  = favicon
        ? `<img src="${favicon}" alt="" width="16" height="16" aria-hidden="true" onerror="this.style.display='none'" />`
        : '';

      item.innerHTML = `
        <button class="link-btn" aria-label="Open ${escapeHtml(link.label)}">
          ${imgTag}${escapeHtml(link.label)}
        </button>
        <button class="link-delete" aria-label="Delete link ${escapeHtml(link.label)}" title="Delete">✕</button>`;

      item.querySelector('.link-btn').addEventListener('click', () => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });

      item.querySelector('.link-delete').addEventListener('click', () => {
        deleteLink(link.id);
      });

      container.appendChild(item);
    });
  }

  // ---------- CRUD helpers ----------
  function addLink(label, url) {
    const result = validateLink(label, url);
    const errEl  = document.getElementById('links-error');
    if (!result.valid) {
      if (errEl) { errEl.textContent = result.message; errEl.classList.add('visible'); }
      return false;
    }
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
    links.push({
      id:    generateId(),
      label: label.trim(),
      url:   url.trim(),
    });
    persist();
    render();
    return true;
  }

  function deleteLink(id) {
    links = links.filter(l => l.id !== id);
    persist();
    render();
  }

  // ---------- Init ----------
  function init() {
    links = StorageManager.load('links', []);
    render();

    const labelInput = document.getElementById('links-label-input');
    const urlInput   = document.getElementById('links-url-input');
    const addBtn     = document.getElementById('links-add');
    const errEl      = document.getElementById('links-error');

    function handleAdd() {
      const success = addLink(
        labelInput ? labelInput.value : '',
        urlInput   ? urlInput.value   : '',
      );
      if (success) {
        if (labelInput) labelInput.value = '';
        if (urlInput)   urlInput.value   = '';
        labelInput?.focus();
      }
    }

    addBtn?.addEventListener('click', handleAdd);

    // Allow Enter on URL field to submit
    urlInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    });

    // Clear error on input
    function clearErr() {
      if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
    }
    labelInput?.addEventListener('input', clearErr);
    urlInput?.addEventListener('input', clearErr);
  }

  return { init, validateLink };
})();


/* ============================================================
   Utility: HTML escaping
   ============================================================ */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}


/* ============================================================
   Storage warning banner helpers
   ============================================================ */
function showStorageUnavailableBanner() {
  const banner = document.getElementById('storage-warning-banner');
  const text   = document.getElementById('storage-warning-text');
  if (!banner) return;
  if (text) text.textContent = "⚠️ Your browser's storage is unavailable — changes will not be saved.";
  banner.removeAttribute('hidden');

  document.getElementById('storage-warning-dismiss')?.addEventListener('click', () => {
    banner.setAttribute('hidden', '');
  });
}

function showStorageWriteErrorBanner() {
  const banner = document.getElementById('storage-warning-banner');
  const text   = document.getElementById('storage-warning-text');
  if (!banner) return;
  if (text) text.textContent = '⚠️ Could not save to storage. Your browser may be blocking local storage or it is full.';
  banner.removeAttribute('hidden');

  // Auto-dismiss on next user interaction
  function dismiss() {
    banner.setAttribute('hidden', '');
    document.removeEventListener('click', dismiss);
    document.removeEventListener('keydown', dismiss);
  }
  setTimeout(() => {
    document.addEventListener('click',   dismiss, { once: true });
    document.addEventListener('keydown', dismiss, { once: true });
  }, 500);
}


/* ============================================================
   Bootstrap — wires all modules together on DOMContentLoaded
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // Show loading indicator (already visible via CSS default)
  const loader = document.getElementById('loading-indicator');

  // ThemeModule first — prevents flash of wrong theme
  ThemeModule.init();

  // Storage availability check
  if (!StorageManager.isAvailable()) {
    showStorageUnavailableBanner();
  }

  // Initialise all feature modules
  ClockModule.init();
  TimerModule.init();
  TodoModule.init();
  LinksModule.init();

  // Listen for storage write errors from any module
  document.addEventListener('storage:error', showStorageWriteErrorBanner);

  // Hide loading indicator
  if (loader) {
    loader.classList.add('hidden');
    // Remove from DOM after transition
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
  }
});
