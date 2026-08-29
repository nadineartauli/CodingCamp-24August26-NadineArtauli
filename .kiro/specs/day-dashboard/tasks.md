# Implementation Plan: Day Dashboard

## Overview

Build a self-contained, client-side productivity page (`index.html` + `css/styles.css` + `js/app.js`) using only HTML, CSS, and vanilla JavaScript. The implementation follows the module pattern defined in the design: six isolated modules (`StorageManager`, `ClockModule`, `TimerModule`, `TodoModule`, `LinksModule`, `ThemeModule`) wired together by a Bootstrap entry point on `DOMContentLoaded`. All state is persisted exclusively to `localStorage`. Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) loaded via a CDN `<script>` tag in the test HTML file.

---

## Tasks

- [ ] 1. Scaffold project structure and base HTML
  - [ ] 1.1 Create `index.html` with the full semantic HTML structure
    - Add `<body data-theme="light">`, `<header>`, and the three `<section>` elements for timer, todo, and links
    - Add all element IDs from the design: `#clock-time`, `#clock-date`, `#greeting`, `#theme-toggle`, `#timer-display`, `#timer-complete-indicator`, `#timer-error`, `#timer-duration-input`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#todo-add-error`, `#todo-input`, `#todo-add`, `#todo-sort`, `#todo-list`, `#todo-storage-error`, `#links-error`, `#links-label-input`, `#links-url-input`, `#links-add`, `#links-list`, `#links-storage-error`, `#storage-warning-banner`
    - Wire `role="alert"` and `aria-live="polite"` on all error containers
    - Add `<link rel="stylesheet" href="css/styles.css">` and `<script src="js/app.js" defer></script>` using relative paths
    - _Requirements: 8.2, 8.3_
  - [ ] 1.2 Create `css/styles.css` with CSS custom properties and base reset
    - Define `:root` variables: `--color-bg`, `--color-surface`, `--color-text`, `--color-accent` (and any additional palette tokens)
    - Define `[data-theme="dark"]` overrides for all custom properties
    - Add `body { transition: background-color 150ms ease, color 150ms ease; }` for smooth theme switching
    - Add a minimal CSS reset and `box-sizing: border-box` baseline
    - _Requirements: 6.2, 6.3, 6.4, 8.1_
  - [ ] 1.3 Create `js/app.js` with module stubs and Bootstrap skeleton
    - Declare empty `const StorageManager = { ... }`, `ClockModule`, `TimerModule`, `TodoModule`, `LinksModule`, `ThemeModule` object literals
    - Add the `DOMContentLoaded` Bootstrap block that calls each module's `init()` in the correct order (ThemeModule first)
    - Add stub `showStorageUnavailableBanner()` and `showStorageWriteErrorBanner()` helpers
    - _Requirements: 8.1, 8.2_

- [ ] 2. Implement `StorageManager` and CSS layout
  - [ ] 2.1 Implement `StorageManager` (`save`, `load`, `isAvailable`)
    - `isAvailable()`: probe-write a sentinel key and remove it; return `true`/`false`
    - `save(key, value)`: `JSON.stringify` + `localStorage.setItem`; catch `QuotaExceededError` and any other error; dispatch `new CustomEvent('storage:error')` on `document` on failure
    - `load(key, fallback)`: `localStorage.getItem` + `JSON.parse`; catch parse and access errors; `console.warn` and return `fallback` on any error
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 2.2 Write property test for `StorageManager` round-trip (Property 3)
    - **Property 3: Timer duration persistence round-trip**
    - For any integer `n` in 1–120, `save` then `load` must return `n`
    - **Validates: Requirements 2.9**
  - [ ]* 2.3 Write property test for `StorageManager` fallback on missing/corrupt data (Property 14)
    - **Property 14: StorageManager fallback on missing or corrupt data**
    - For any string that is not valid JSON, `load(key, fallback)` must return `fallback` without throwing
    - **Validates: Requirements 2.11, 3.12, 4.5, 5.9, 6.7, 7.4**
  - [ ] 2.4 Implement CSS Grid layout and responsive styles
    - Define a two-column or single-column CSS Grid for the main panel layout
    - Use `clamp()` for fluid font sizes and spacing so the layout is usable from 320 px to 2 560 px
    - Style `<header>`, all three `<section>` cards, buttons, inputs, and the `#storage-warning-banner`
    - Add the `#timer-complete-indicator` hidden/visible styles and any transition effects
    - _Requirements: 8.4, 8.5, 9.1_

- [ ] 3. Implement `ThemeModule`
  - [ ] 3.1 Implement `ThemeModule.init()`
    - Load theme from `StorageManager.load('theme', 'light')`; apply to `document.body.dataset.theme`
    - Bind `#theme-toggle` click event: toggle between `'light'` and `'dark'`, update `body.dataset.theme`, persist via `StorageManager.save`
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.7_
  - [ ]* 3.2 Write property test for theme toggle involution (Property 13)
    - **Property 13: Theme toggle is an involution**
    - For any starting theme value, calling the toggle logic twice must return `body.dataset.theme` to its original value; a single toggle must produce the opposite value
    - **Validates: Requirements 6.2, 6.5, 6.6**

- [ ] 4. Checkpoint — verify scaffold and theme
  - Open `index.html` in a browser via `file://` and confirm the page renders, theme persists across reload, and the storage warning banner appears when `localStorage` is blocked via DevTools. Ensure all tests added so far pass.

- [ ] 5. Implement `ClockModule`
  - [ ] 5.1 Extract and implement `getGreeting(hour)` pure function
    - Return `'Good morning'` for hours 5–11, `'Good afternoon'` for 12–16, `'Good evening'` for 17–20, `'Good night'` for all other hours (21–23, 0–4)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  - [ ]* 5.2 Write property test for greeting boundary coverage (Property 1)
    - **Property 1: Greeting boundary coverage**
    - For any integer hour in 0–23, `getGreeting(hour)` must return exactly one of the four defined messages in the correct bucket
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
  - [ ] 5.3 Implement `ClockModule.init()`
    - Define a `tick()` helper that reads `new Date()`, formats `HH:MM:SS` for `#clock-time`, formats the full date string for `#clock-date`, and calls `getGreeting(hour)` to update `#greeting`
    - Call `tick()` immediately, then `setInterval(tick, 1000)`
    - _Requirements: 1.1, 1.2, 1.7_

- [ ] 6. Implement `TimerModule`
  - [ ] 6.1 Extract and implement `formatTime(seconds)` pure function
    - Return a string matching `^\d{2}:\d{2}$` where minutes = `Math.floor(s / 60)` and seconds = `s % 60`, both zero-padded to two digits
    - _Requirements: 2.3_
  - [ ]* 6.2 Write property test for timer MM:SS format (Property 2)
    - **Property 2: Timer MM:SS format**
    - For any integer seconds in 0–7200, `formatTime(s)` must return a string matching `^\d{2}:\d{2}$` with the correct minutes and seconds values
    - **Validates: Requirements 2.3**
  - [ ] 6.3 Extract and implement `validateDuration(n)` pure function
    - Return `{ valid: true }` for integers 1–120; return `{ valid: false, message: '...' }` for anything outside that range (including non-numeric input)
    - _Requirements: 2.7, 2.8_
  - [ ]* 6.4 Write property test for timer duration rejection (Property 4)
    - **Property 4: Timer rejects out-of-range durations**
    - For any value outside 1–120 (0, negatives, > 120, non-numeric), `validateDuration` must return `{ valid: false }` with a non-empty message and must not mutate state
    - **Validates: Requirements 2.8**
  - [ ] 6.5 Implement `TimerModule.init()` with full state machine
    - In-memory state: `{ secondsRemaining, isRunning, isComplete }`; load `sessionDuration` from `StorageManager.load('timer', { sessionDuration: 25 }).sessionDuration`
    - Bind `#timer-start`: if already running, do nothing (idempotent); otherwise clear `isComplete`, start `setInterval`, set `isRunning = true`, render
    - Bind `#timer-stop`: clear interval, set `isRunning = false`, render
    - Bind `#timer-reset`: clear interval, restore `secondsRemaining` to `sessionDuration * 60`, `isRunning = false`, `isComplete = false`, render
    - On countdown reaching zero: clear interval, set `isComplete = true`, `isRunning = false`, render
    - Bind `#timer-duration-input` change/blur: validate with `validateDuration`; on success update `sessionDuration`, persist via `StorageManager.save('timer', { sessionDuration })`, apply immediately if not running; on failure show `#timer-error` and revert input value
    - `render()`: update `#timer-display` via `formatTime`, show/hide `#timer-complete-indicator`, clear `#timer-error` on valid state
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

- [ ] 7. Checkpoint — verify clock and timer
  - Confirm clock ticks in real time, greeting updates correctly, timer counts down and fires the complete indicator, duration persists on reload. Ensure all tests added so far pass.

- [ ] 8. Implement `TodoModule`
  - [ ] 8.1 Extract and implement `validateTitle(str)` pure function
    - Trim input; return `{ valid: true, title }` for trimmed length 1–200; return `{ valid: false, message }` for empty/whitespace-only or trimmed length > 200
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_
  - [ ]* 8.2 Write property test for invalid task titles rejected (Property 6)
    - **Property 6: Invalid task titles are rejected**
    - For any string that is whitespace-only or has trimmed length > 200, `validateTitle` must return `{ valid: false }` with a non-empty message and leave the task list unchanged
    - **Validates: Requirements 3.2, 3.6**
  - [ ] 8.3 Extract and implement `sortTasks(tasks, order)` pure function
    - `'creation'` order: sort ascending by `createdAt`
    - `'status'` order: incomplete tasks before complete; within each group, ascending by `createdAt`
    - Must not mutate the input array
    - _Requirements: 4.1, 4.2_
  - [ ]* 8.4 Write property test for sort order correctness (Property 10)
    - **Property 10: Sort order correctness**
    - For any task array, `sortTasks(tasks, 'creation')` output must be non-decreasing by `createdAt`; `sortTasks(tasks, 'status')` output must have all incomplete tasks before all complete tasks, with `createdAt`-ascending within each group
    - **Validates: Requirements 4.1, 4.2**
  - [ ] 8.5 Implement `TodoModule.init()` — add, delete, toggle, and sort
    - Generate IDs with `crypto.randomUUID()` (fallback: `Date.now().toString(36) + Math.random().toString(36).slice(2)`)
    - Load tasks from `StorageManager.load('todos', [])` and sort preference from `StorageManager.load('todoSort', 'creation')`
    - Bind `#todo-add` / Enter key on `#todo-input`: validate title; on success push `{ id, title, done: false, createdAt: Date.now() }`, persist, render; on failure show `#todo-add-error` and retain focus on input
    - `render()`: sort a copy of the tasks array, clear `#todo-list`, and for each task append an `<li>` with: complete-toggle checkbox/button (apply strikethrough class when `done: true`), title span, edit button, delete button
    - Bind delete buttons: remove task by id, persist, render
    - Bind complete-toggle controls: flip `done`, persist, render
    - Bind `#todo-sort` change: update sort preference, persist to `'todoSort'`, render
    - _Requirements: 3.1, 3.2, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 8.6 Write property test for task addition grows the list (Property 5)
    - **Property 5: Task addition grows the list**
    - For any existing list and any valid trimmed title (1–200 chars), `addTask` must increase list length by exactly one; the new task must have the correct title, `done: false`, and a recent `createdAt`
    - **Validates: Requirements 3.1**
  - [ ]* 8.7 Write property test for task deletion removes exactly one item (Property 7)
    - **Property 7: Task deletion removes exactly one item**
    - For any non-empty task list and any id present in it, `deleteTask(id)` must decrease length by exactly one and the id must no longer appear
    - **Validates: Requirements 3.9**
  - [ ]* 8.8 Write property test for completion toggle involution (Property 8)
    - **Property 8: Completion toggle is an involution**
    - For any task, double-toggling `done` must leave `done` equal to its original value, with all other fields unchanged
    - **Validates: Requirements 3.7, 3.8**
  - [ ]* 8.9 Write property test for task list persistence round-trip (Property 9)
    - **Property 9: Task list persistence round-trip**
    - For any task list (including empty), serialising via `StorageManager.save` then deserialising via `StorageManager.load` must produce a deeply equal list
    - **Validates: Requirements 3.10, 3.11, 7.1, 7.2**
  - [ ] 8.10 Implement inline edit for `TodoModule`
    - When the edit button is clicked, replace the task's title `<span>` with an `<input>` pre-populated with the current title and cursor positioned at end
    - On save (Enter or blur): validate trimmed value (1–200 chars); on success update title, persist, render; on failure show inline validation message and retain original title
    - On cancel (Escape): restore original title without any state mutation
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 9. Checkpoint — verify to-do list
  - Confirm add, edit, toggle, delete, sort, and LocalStorage persistence all work. Verify tasks survive a page reload. Ensure all tests added so far pass.

- [ ] 10. Implement `LinksModule`
  - [ ] 10.1 Extract and implement `validateLink(label, url)` pure function
    - Return `{ valid: true }` when: label is non-empty and ≤ 100 chars, url is non-empty, starts with `http://` or `https://`, and is ≤ 2048 chars
    - Return `{ valid: false, message }` identifying the failing field(s) for all other inputs
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 10.2 Write property test for link validation gate (Property 11)
    - **Property 11: Link validation gate**
    - For any valid (label 1–100 chars, url `https?://...` ≤ 2048 chars) input, `validateLink` must return `{ valid: true }`; for any input with an empty label, bad URL prefix, label > 100 chars, or URL > 2048 chars, it must return `{ valid: false }` with a non-empty message
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  - [ ] 10.3 Implement `LinksModule.init()`
    - Load links from `StorageManager.load('links', [])`
    - Bind `#links-add` click: validate with `validateLink`; on success push `{ id, label, url }`, persist, render; on failure show `#links-error` and preserve input values in form fields
    - `render()`: clear `#links-list`, for each link append a `<button>` with the label text that calls `window.open(url, '_blank')` on click, plus a delete button
    - Bind delete buttons: remove link by id, persist, render
    - Show `#links-storage-error` if `StorageManager.load` on init returns a parse error (detected via fallback comparison)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_
  - [ ]* 10.4 Write property test for link list persistence round-trip (Property 12)
    - **Property 12: Link list persistence round-trip**
    - For any links list (including empty and lists produced by any sequence of add/delete), serialising via `StorageManager.save` then deserialising via `StorageManager.load` must produce a deeply equal list
    - **Validates: Requirements 5.7, 5.8, 7.1**

- [ ] 11. Implement global storage error banner and wire Bootstrap
  - [ ] 11.1 Implement `showStorageUnavailableBanner()` and `showStorageWriteErrorBanner()` helpers
    - `showStorageUnavailableBanner()`: set `#storage-warning-banner` text to the design's unavailable message and remove the `hidden` attribute; add a dismiss button that re-adds `hidden`
    - `showStorageWriteErrorBanner()`: listener for `storage:error` events; show and auto-dismiss on user interaction (Requirements 7.3)
    - _Requirements: 7.3, 7.4_
  - [ ] 11.2 Add loading indicator logic (Requirement 9.5)
    - Reveal a loading indicator element immediately inside the `DOMContentLoaded` handler (before any module `init()` call)
    - Hide it after all modules have initialised
    - _Requirements: 9.5_
  - [ ] 11.3 Finalize Bootstrap wiring and verify module init order
    - Confirm `ThemeModule.init()` is first (prevents flash of wrong theme)
    - Confirm `StorageManager.isAvailable()` check precedes module inits and calls `showStorageUnavailableBanner()` when unavailable
    - Confirm `document.addEventListener('storage:error', showStorageWriteErrorBanner)` is registered
    - _Requirements: 7.3, 7.4, 8.1_

- [ ] 12. Final checkpoint — full integration and accessibility
  - Open `index.html` as a `file://` URL in Chrome, Firefox, Edge, and Safari (or closest available). Verify: clock ticks, timer runs end-to-end, tasks and links survive reload, theme toggles smoothly within 200 ms, layout is usable at 320 px and 2 560 px viewport widths, all interactive controls are keyboard-accessible, error containers are announced by screen-reader tooling, and the storage warning banner appears and is dismissible. Ensure all tests pass.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; core functionality is complete without them.
- Each task references specific requirements for traceability.
- Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) via CDN — no package manager or build step required.
- All pure functions (`getGreeting`, `formatTime`, `validateDuration`, `validateTitle`, `sortTasks`, `validateLink`, and `StorageManager` methods) should be written so they can be tested in isolation without a DOM.
- Checkpoints validate incremental progress and catch regressions early.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.4"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1", "6.1", "6.3"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.2", "6.4", "8.1", "8.3"] },
    { "id": 5, "tasks": ["6.5", "8.2", "8.4", "8.5"] },
    { "id": 6, "tasks": ["8.6", "8.7", "8.8", "8.9", "8.10", "10.1"] },
    { "id": 7, "tasks": ["10.2", "10.3"] },
    { "id": 8, "tasks": ["10.4", "11.1", "11.2"] },
    { "id": 9, "tasks": ["11.3"] }
  ]
}
```
