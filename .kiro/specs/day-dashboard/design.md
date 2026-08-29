# Design Document

## Day Dashboard

---

## Overview

The Day Dashboard is a self-contained, client-side productivity page delivered as a single HTML file
with one external CSS file and one external JavaScript file. There is no build step, no package
manager, and no server. Every feature — clock, focus timer, to-do list, quick links, and theme — is
implemented entirely in vanilla JavaScript and stored exclusively in `localStorage`.

The design goal is maximum simplicity: a flat, module-style JavaScript architecture where each
feature is an isolated object with its own initialise / render / persist lifecycle. A single shared
`Storage` helper abstracts `localStorage` access and centralises error handling. All DOM mutations
happen through render functions that read from in-memory state, keeping the data layer cleanly
separate from the view layer.

---

## Architecture

### High-level structure

```
index.html
├── css/
│   └── styles.css          ← single stylesheet (layout, components, themes)
└── js/
    └── app.js              ← single script (all feature modules + bootstrap)
```

`index.html` references both files with relative paths so the page works from any `file://` URL.

### Module pattern

`app.js` is one file but is organised into clearly delineated sections using the revealing-module
pattern (plain object literals returned from IIFEs, or just named `const` blocks). No `import`/
`export` syntax is used — the entire file runs in one script tag with `defer`.

```
app.js
├── StorageManager        ← localStorage read/write with error handling
├── ClockModule           ← time, date, greeting
├── TimerModule           ← focus timer logic
├── TodoModule            ← task CRUD + sorting
├── LinksModule           ← quick-links CRUD
├── ThemeModule           ← light/dark toggle
└── Bootstrap             ← wires modules together on DOMContentLoaded
```

### Data flow

```
User action
    │
    ▼
DOM event listener  (inside each Module)
    │
    ▼
Mutate in-memory state
    │
    ├──► StorageManager.save()   (persist immediately)
    │
    └──► Module.render()         (update DOM from state)
```

State is never read back from the DOM. Every render is a pure function of the module's in-memory
state object.

### Tick loop

`ClockModule` drives a single `setInterval` at 1 000 ms. `TimerModule` drives its own 1 000 ms
interval that is started/cleared on start/stop. Both are plain `setInterval` calls — no
`requestAnimationFrame` is needed because neither requires sub-second animation.

---

## Components and Interfaces

### StorageManager

Centralises all `localStorage` access. Every module calls `StorageManager` rather than touching
`localStorage` directly.

```js
StorageManager = {
  save(key, value)        // JSON.stringify + localStorage.setItem; catches QuotaExceededError
  load(key, fallback)     // JSON.parse + localStorage.getItem; returns fallback on error
  isAvailable()           // tests localStorage with a probe write; returns boolean
}
```

On any write error, `StorageManager.save` emits a custom DOM event `storage:error` that the
Bootstrap layer listens to and displays a non-blocking warning banner.

---

### ClockModule

**State**
```js
{ /* no persistent state */ }
```

**Responsibilities**
- Update `#clock-time` (HH:MM:SS) and `#clock-date` (full locale string) every second.
- Derive and update `#greeting` based on the current hour.

**Greeting logic**

| Time range | Message |
|---|---|
| 05:00 – 11:59 | "Good morning" |
| 12:00 – 16:59 | "Good afternoon" |
| 17:00 – 20:59 | "Good evening" |
| 21:00 – 04:59 | "Good night" |

The greeting is recalculated on every tick so it updates automatically when the hour boundary is
crossed (Requirement 1.7).

**Interface**
```js
ClockModule = {
  init()   // starts the 1 s interval
}
```

---

### TimerModule

**Persistent state** (key: `"timer"`)
```js
{
  sessionDuration: 25   // integer minutes, 1–120
}
```

**Transient state** (in-memory only)
```js
{
  secondsRemaining: 1500,
  isRunning: false,
  isComplete: false
}
```

**Responsibilities**
- Render `#timer-display` as `MM:SS`.
- Manage `#timer-start`, `#timer-stop`, `#timer-reset` button states.
- Show `#timer-complete-indicator` when `isComplete === true`; hide on next start or reset.
- Validate `#timer-duration-input` (1–120) and display `#timer-error` on rejection.

**State machine**

```
         start
IDLE ──────────────► RUNNING
  ▲                     │
  │  reset          stop│
  │◄────────────────────┤
  │                     │
  │  reset       reaches 0
  └──────────────── COMPLETE
```

`start` is idempotent when already `RUNNING` (Requirement 2.10).

**Interface**
```js
TimerModule = {
  init()   // loads persisted sessionDuration, renders, binds events
}
```

---

### TodoModule

**Persistent state** (key: `"todos"`)
```js
[
  {
    id:        "uuid-v4-string",
    title:     "string (1–200 chars, trimmed)",
    done:      false,
    createdAt: 1234567890123   // Date.now() timestamp
  }
]
```

**Persistent sort preference** (key: `"todoSort"`)
```js
"creation" | "status"   // default: "creation"
```

**Responsibilities**
- Add, edit, complete-toggle, delete tasks.
- Validate: non-empty title, max 200 chars (trimmed).
- Sort task list for display (does not mutate stored order).
- Re-render `#todo-list` after every mutation.

**Sort logic**

| Sort_Order | Rule |
|---|---|
| `"creation"` | Order by `createdAt` ascending |
| `"status"` | Incomplete tasks first, then complete; within each group, `createdAt` ascending |

**Interface**
```js
TodoModule = {
  init()   // loads tasks + sort pref, renders, binds events
}
```

**Inline edit** — clicking the edit button on a task replaces its list-item text with an `<input>`
pre-populated with the current title (cursor at end). Saving submits the trimmed value; pressing
Escape cancels without changes.

---

### LinksModule

**Persistent state** (key: `"links"`)
```js
[
  {
    id:    "uuid-v4-string",
    label: "string (1–100 chars)",
    url:   "string (https?://..., max 2048 chars)"
  }
]
```

**Responsibilities**
- Add and delete links.
- Validate label (non-empty, ≤ 100 chars) and URL (non-empty, starts with `http://` or `https://`,
  ≤ 2048 chars).
- Render each link as a `<button>` that opens the URL in a new tab via `window.open(url, '_blank')`.
- Preserve input values in the form fields on validation failure.

**Interface**
```js
LinksModule = {
  init()   // loads links, renders, binds events
}
```

---

### ThemeModule

**Persistent state** (key: `"theme"`)
```js
"light" | "dark"   // default: "light"
```

**Responsibilities**
- Toggle `data-theme="light|dark"` on `<body>`.
- Persist choice to `localStorage`.
- CSS handles all visual differences via `[data-theme="dark"] { … }` rules.

**Transition**: CSS `transition` properties on `body` (colour, background-color, 150 ms ease)
achieve the sub-200 ms switch required by Requirement 6.2.

**Interface**
```js
ThemeModule = {
  init()   // loads persisted theme, applies to body, binds toggle button
}
```

---

### Bootstrap (entry point)

```js
document.addEventListener('DOMContentLoaded', () => {
  if (!StorageManager.isAvailable()) {
    showStorageUnavailableBanner()
  }
  ThemeModule.init()    // first to avoid flash of wrong theme
  ClockModule.init()
  TimerModule.init()
  TodoModule.init()
  LinksModule.init()
  document.addEventListener('storage:error', showStorageWriteErrorBanner)
})
```

`ThemeModule` is initialised first to apply the persisted theme before any other content renders,
preventing a flash of the wrong theme.

---

## Data Models

### localStorage key schema

| Key | Type | Default | Owned by |
|---|---|---|---|
| `"theme"` | `"light" \| "dark"` | `"light"` | ThemeModule |
| `"timer"` | `{ sessionDuration: number }` | `{ sessionDuration: 25 }` | TimerModule |
| `"todos"` | `Task[]` | `[]` | TodoModule |
| `"todoSort"` | `"creation" \| "status"` | `"creation"` | TodoModule |
| `"links"` | `Link[]` | `[]` | LinksModule |

### Task

```ts
interface Task {
  id:        string    // crypto.randomUUID() or Date.now().toString(36) fallback
  title:     string    // trimmed, 1–200 characters
  done:      boolean
  createdAt: number    // milliseconds since epoch (Date.now())
}
```

### Link

```ts
interface Link {
  id:    string   // crypto.randomUUID() or Date.now().toString(36) fallback
  label: string   // 1–100 characters
  url:   string   // must match /^https?:\/\//; max 2048 characters
}
```

### ID generation

`crypto.randomUUID()` is used where available (all target browsers in their current stable
releases). A `Date.now().toString(36) + Math.random().toString(36).slice(2)` fallback is used if
the API is absent (e.g., non-secure `file://` contexts in older browsers).

### Serialisation

All state objects are serialised with `JSON.stringify` and deserialised with `JSON.parse`. No
custom serialisers are needed. `createdAt` is stored as a plain number (milliseconds since epoch).

---

## HTML Structure

```html
<body data-theme="light">

  <!-- Top bar -->
  <header>
    <div id="clock-time"></div>
    <div id="clock-date"></div>
    <div id="greeting"></div>
    <button id="theme-toggle" aria-label="Toggle theme"></button>
  </header>

  <!-- Focus Timer -->
  <section id="timer-section" aria-label="Focus Timer">
    <div id="timer-display">25:00</div>
    <div id="timer-complete-indicator" hidden>Session complete!</div>
    <div id="timer-error" role="alert" aria-live="polite"></div>
    <input id="timer-duration-input" type="number" min="1" max="120" value="25" />
    <button id="timer-start">Start</button>
    <button id="timer-stop">Stop</button>
    <button id="timer-reset">Reset</button>
  </section>

  <!-- To-Do List -->
  <section id="todo-section" aria-label="To-Do List">
    <div id="todo-add-error" role="alert" aria-live="polite"></div>
    <input id="todo-input" type="text" maxlength="200" placeholder="New task…" />
    <button id="todo-add">Add</button>
    <select id="todo-sort">
      <option value="creation">By creation time</option>
      <option value="status">By completion status</option>
    </select>
    <ul id="todo-list"></ul>
    <div id="todo-storage-error" role="alert"></div>
  </section>

  <!-- Quick Links -->
  <section id="links-section" aria-label="Quick Links">
    <div id="links-error" role="alert" aria-live="polite"></div>
    <input id="links-label-input" type="text" maxlength="100" placeholder="Label" />
    <input id="links-url-input" type="url" maxlength="2048" placeholder="https://…" />
    <button id="links-add">Add Link</button>
    <div id="links-list"></div>
    <div id="links-storage-error" role="alert"></div>
  </section>

  <!-- Global storage warning banner -->
  <div id="storage-warning-banner" role="status" aria-live="polite" hidden></div>

</body>
```

Each interactive element carries an `id` that the corresponding module targets. `role="alert"` and
`aria-live="polite"` on error containers ensure screen readers announce validation messages.

---

## CSS Architecture

`css/styles.css` uses CSS custom properties (variables) to define both themes in one place:

```css
:root {
  --color-bg:      #ffffff;
  --color-surface: #f5f5f5;
  --color-text:    #1a1a1a;
  --color-accent:  #4a6fa5;
  /* … */
}

[data-theme="dark"] {
  --color-bg:      #121212;
  --color-surface: #1e1e1e;
  --color-text:    #e0e0e0;
  --color-accent:  #7ba7d4;
  /* … */
}
```

All component styles reference these variables, so toggling `data-theme` on `<body>` switches the
entire palette instantly. A `transition: background-color 150ms ease, color 150ms ease` on `body`
produces the smooth theme switch.

Responsive layout uses CSS Grid for the main panel layout and `clamp()` for fluid typography,
ensuring the page is usable from 320 px to 2 560 px without media-query breakpoints (Requirement 8.5).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a
system — essentially, a formal statement about what the system should do. Properties serve as the
bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting boundary coverage

*For any* integer hour value in 0–23, the `getGreeting(hour)` function SHALL return exactly one of
the four defined greeting messages, and the returned message SHALL correspond to the correct
time-range bucket: morning for hours 5–11, afternoon for 12–16, evening for 17–20, and night for
hours 21–23 and 0–4.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 2: Timer MM:SS format

*For any* integer number of seconds in the range 0–7 200 (0 to 120 minutes), the `formatTime(seconds)`
function SHALL return a string matching the pattern `^\d{2}:\d{2}$` where the minutes part equals
`Math.floor(seconds / 60)` zero-padded to two digits and the seconds part equals `seconds % 60`
zero-padded to two digits.

**Validates: Requirements 2.3**

---

### Property 3: Timer duration persistence round-trip

*For any* integer `n` in the range 1–120, writing `n` as the session duration via `StorageManager.save`
and reading it back via `StorageManager.load` SHALL yield the same integer `n`.

**Validates: Requirements 2.7, 2.9**

---

### Property 4: Timer rejects out-of-range durations

*For any* value `n` that is not an integer in the range 1–120 (including 0, negatives, values above
120, and non-numeric inputs), submitting `n` as a new session duration SHALL leave the timer's
current `sessionDuration` unchanged and SHALL produce a non-empty error message.

**Validates: Requirements 2.8**

---

### Property 5: Task addition grows the list

*For any* existing task list and any trimmed, non-whitespace task title of 1–200 characters, calling
`addTask(title)` SHALL increase the list length by exactly one, and the new task SHALL be present
with its title equal to the trimmed input, `done: false`, and a `createdAt` value equal to a
recent timestamp.

**Validates: Requirements 3.1**

---

### Property 6: Invalid task titles are rejected

*For any* string that is either composed entirely of whitespace characters OR has a trimmed length
of zero OR has a trimmed length exceeding 200 characters, submitting it as a task title SHALL leave
the task list completely unchanged and SHALL produce a non-empty inline validation message.

**Validates: Requirements 3.2, 3.6**

---

### Property 7: Task deletion removes exactly one item

*For any* non-empty task list and any task `id` present in that list, calling `deleteTask(id)` SHALL
decrease the list length by exactly one and the deleted task's `id` SHALL no longer appear in the
list.

**Validates: Requirements 3.9**

---

### Property 8: Completion toggle is an involution

*For any* task, calling `toggleDone(task)` twice SHALL return a task with the same `done` value as
the original, and all other fields (`id`, `title`, `createdAt`) SHALL be unchanged.

**Validates: Requirements 3.7, 3.8**

---

### Property 9: Task list persistence round-trip

*For any* task list (including the empty list and lists produced by any sequence of add, edit,
complete-toggle, and delete operations), serialising the list with `StorageManager.save` and then
deserialising it with `StorageManager.load` SHALL produce a list that is deeply equal to the
original in-memory list.

**Validates: Requirements 3.10, 3.11, 7.1, 7.2**

---

### Property 10: Sort order correctness

*For any* task list sorted with order `"creation"`, the output SHALL be non-decreasing by
`createdAt` (oldest first).

*For any* task list sorted with order `"status"`, every incomplete task in the output SHALL appear
at a lower index than every complete task, and within each of the two groups the items SHALL be
non-decreasing by `createdAt`.

**Validates: Requirements 4.1, 4.2**

---

### Property 11: Link validation gate

*For any* label of 1–100 characters and URL that begins with `http://` or `https://` and is at most
2 048 characters long, calling `addLink(label, url)` SHALL succeed: the list length SHALL increase
by one and the new link SHALL appear in the list.

*For any* submission where the label is empty, or the URL does not begin with `http://` or
`https://`, or the label exceeds 100 characters, or the URL exceeds 2 048 characters, calling
`addLink` SHALL be rejected: the list SHALL be unchanged and a non-empty inline validation message
SHALL be present.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

### Property 12: Link list persistence round-trip

*For any* links list (including lists produced by any sequence of add and delete operations),
serialising it with `StorageManager.save` and deserialising with `StorageManager.load` SHALL produce
a links list that is deeply equal to the original.

**Validates: Requirements 5.7, 5.8, 7.1**

---

### Property 13: Theme toggle is an involution

*For any* current theme value (`"light"` or `"dark"`), calling `toggleTheme()` twice SHALL return
the `data-theme` attribute on `<body>` to its original value, and after each single toggle the
`data-theme` value SHALL be the opposite of its value before the toggle.

**Validates: Requirements 6.2, 6.5, 6.6**

---

### Property 14: StorageManager fallback on missing or corrupt data

*For any* `localStorage` key that is absent, or whose stored value is not valid JSON, calling
`StorageManager.load(key, fallback)` SHALL return the `fallback` value without throwing, and each
module that depends on that key SHALL initialise with its documented default value (25 min timer,
empty task list, empty links list, `"creation"` sort, `"light"` theme).

**Validates: Requirements 2.11, 3.12, 4.5, 5.9, 6.7, 7.4**

---

## Error Handling

### LocalStorage unavailable (read)

Detected at Bootstrap time via `StorageManager.isAvailable()`. If unavailable, each module
initialises from its hardcoded defaults (empty lists, 25 min, light theme, creation sort). A
persistent banner (`#storage-warning-banner`) is shown: "Your browser's storage is unavailable —
changes will not be saved."

### LocalStorage unavailable / quota exceeded (write)

`StorageManager.save` wraps every `setItem` call in a `try/catch`. On any error it fires a
`storage:error` custom event. Bootstrap listens for this event and shows the non-blocking banner
(dismissible by the user). The module continues operating with its in-memory state.

### JSON parse errors on load

`StorageManager.load(key, fallback)` wraps `JSON.parse` in a `try/catch`. On a parse error it
logs a `console.warn` and returns the provided fallback value. This covers corrupted or
manually-edited `localStorage` data.

### Timer input validation

Invalid duration input is rejected synchronously on the `input` or `blur` event. The error
message is written to `#timer-error` (which has `role="alert"` so screen readers announce it)
and the input is reverted to the last valid value. No state mutation occurs.

### Task / link validation

All validation runs synchronously before any state mutation. Error messages are written to the
inline `role="alert"` containers adjacent to the relevant form fields. On a successful submission
the error container is cleared.

### Performance fallback (Requirement 9.5)

A loading indicator is revealed immediately on `DOMContentLoaded` and hidden once Bootstrap
completes. If the browser stalls for any reason, the indicator remains visible for the user.

---

## Testing Strategy

### Unit tests — example-based

A lightweight test harness (no external test framework — a simple `assert` helper or the browser
console) is sufficient for:

- **ClockModule.getGreeting(hour)** — 24 representative hours (one per hour), boundary values
  (0, 5, 12, 17, 21, 23).
- **TimerModule.formatTime(seconds)** — spot checks: `0 → "00:00"`, `59 → "00:59"`,
  `3600 → "60:00"`, `1500 → "25:00"`.
- **TimerModule.validateDuration(n)** — boundaries: 0, 1, 60, 120, 121, −1.
- **TodoModule.validateTitle(str)** — empty string, whitespace-only, 200-char string, 201-char
  string, valid title.
- **TodoModule.sortTasks(tasks, order)** — mixed completion statuses, identical timestamps.
- **LinksModule.validateLink(label, url)** — all four invalid cases + a valid case.
- **StorageManager** — mock `localStorage` (using a simple Map-backed stub) to test save/load/
  error paths.

### Property-based tests

Property-based testing is appropriate here because the core logic (validation, sorting,
serialisation, state machines) consists of pure functions whose correctness must hold across a
wide and unbounded input space.

**Library**: [fast-check](https://github.com/dubzzz/fast-check) for JavaScript.
Each test runs a minimum of **100 iterations**.

Each test is tagged with a comment in the format:
`// Feature: day-dashboard, Property N: <property text>`

| Property | Test description | Arbitraries |
|---|---|---|
| 1 — Greeting boundary | `getGreeting(hour)` returns correct bucket for all hours 0–23 | `fc.integer({ min: 0, max: 23 })` |
| 2 — Timer MM:SS format | `formatTime(s)` returns correctly structured string | `fc.integer({ min: 0, max: 7200 })` |
| 3 — Duration round-trip | `save` then `load` preserves integer 1–120 | `fc.integer({ min: 1, max: 120 })` |
| 4 — Duration rejection | out-of-range `n` leaves duration unchanged, returns error | `fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 121 }))` |
| 5 — Task addition | valid title grows list by 1, item is present | `fc.string({ minLength: 1 }).filter(s => s.trim().length >= 1 && s.trim().length <= 200)` |
| 6 — Title rejection | whitespace / oversized title leaves list unchanged | `fc.oneof(fc.stringOf(fc.constantFrom(' ', '\t', '\n')), fc.string({ minLength: 201 }))` |
| 7 — Task deletion | delete removes exactly one item by id | `fc.array(taskArbitrary, { minLength: 1 })` |
| 8 — Completion toggle | double-toggle is identity on `done` field | `taskArbitrary` |
| 9 — Task persistence | round-trip through `StorageManager` | `fc.array(taskArbitrary)` |
| 10 — Sort order | `sortTasks` produces correct order for both modes | `fc.array(taskArbitrary, { minLength: 1 })` |
| 11 — Link validation | valid → accepted, invalid → rejected + error | `linkArbitrary` + `invalidLinkArbitrary` |
| 12 — Link persistence | round-trip through `StorageManager` | `fc.array(linkArbitrary)` |
| 13 — Theme toggle | double-toggle is identity, body attribute reflects value | `fc.constantFrom('light', 'dark')` |
| 14 — Storage fallback | absent/corrupt key returns default, module inits with defaults | `fc.string()` as corrupt JSON |

### Integration / smoke tests

Since the application is a static file with no server, integration tests are manual browser checks
or Playwright end-to-end tests that open `index.html` via `file://`:

- Clock ticks forward and greeting updates at hour boundary (smoke).
- Timer counts down, fires complete indicator at zero, is dismissible (smoke).
- Tasks survive a page reload (localStorage round-trip, 1 example).
- Theme persists across reload (1 example).
- Links open in new tab (1 example).
- Dashboard renders at 320 px and 2 560 px viewport widths (2 examples).
- Storage error banner appears when `localStorage` is disabled (1 example via browser settings or
  mocked `localStorage`).

### Accessibility checks

- All interactive elements have accessible names (`aria-label` or associated `<label>`).
- Error containers use `role="alert"` and `aria-live="polite"`.
- Keyboard navigation: Tab order follows visual order; all controls reachable by keyboard.
- Contrast ratios for both themes meet WCAG AA (4.5:1 for normal text, 3:1 for large text).

> **Note**: Full WCAG compliance requires manual testing with assistive technologies and expert
> accessibility review beyond what automated tooling can verify.
