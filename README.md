# 📅 Day Dashboard

A clean, minimal productivity dashboard to help you organize your day — all in one tab.
Built with pure HTML, CSS, and vanilla JavaScript. No frameworks, no build steps, no server required.

**[🔗 Live Demo](https://nadineartauli.github.io/coding-camp/)**

---

## ✨ Features

### 🕐 Clock & Greeting
- Live clock displaying the current time (`HH:MM:SS`)
- Full date display (e.g. *Saturday, August 29, 2026*)
- Smart greeting based on time of day:
  - 🌅 **Good morning** — 05:00–11:59
  - ☀️ **Good afternoon** — 12:00–16:59
  - 🌆 **Good evening** — 17:00–20:59
  - 🌙 **Good night** — 21:00–04:59

### ⏱ Focus Timer
- Default 25-minute Pomodoro timer
- **Configurable duration** — set any value from 1 to 120 minutes
- Start, Stop, and Reset controls
- Completion indicator when the session ends
- Timer duration persists across page reloads

### ✅ To-Do List
- Add tasks with the input field or press **Enter**
- **Inline editing** — click ✏️ to edit in place; press Enter to save, Escape to cancel
- Mark tasks complete with a toggle button
- Delete individual tasks
- **Sort tasks** by:
  - Creation time (oldest first)
  - Completion status (incomplete first)
- All tasks saved to `localStorage` and survive page reloads

### 🔗 Quick Links
- Save your favourite websites as one-click buttons
- Each link opens in a new tab
- Favicon auto-loaded for each site
- Add and delete links at any time
- Links persist in `localStorage`

### 🌗 Light / Dark Mode
- Toggle between light and dark themes with one click
- Smooth 180ms transition between themes
- Preference saved — remembered across sessions

---

## 📸 Preview

| Light Mode | Dark Mode |
|---|---|
| ![Light mode preview](https://placehold.co/480x300?text=Light+Mode) | ![Dark mode preview](https://placehold.co/480x300?text=Dark+Mode) |

> Replace the placeholder images above with real screenshots once deployed.

---

## 🚀 Getting Started

No installation or build step needed.

### Run locally
1. Clone or download this repository
```bash
git clone https://github.com/nadineartauli/coding-camp.git
```
2. Open `index.html` in any modern browser — that's it.

### Deploy to GitHub Pages
1. Go to your repo → **Settings → Pages**
2. Source: `Deploy from a branch` → branch `main`, folder `/ (root)`
3. Save — your site will be live at `https://<your-username>.github.io/<repo-name>/`

---

## 🗂 Project Structure

```
coding-camp/
├── index.html        # App structure and markup
├── css/
│   └── styles.css    # All styles: layout, components, light/dark themes
└── js/
    └── app.js        # All logic: clock, timer, to-do list, links, theme
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic elements, ARIA) |
| Styling | CSS3 (custom properties, Grid, `clamp()`) |
| Logic | Vanilla JavaScript (ES2020, no frameworks) |
| Storage | Browser `localStorage` API |

---

## ♿ Accessibility

- All interactive controls have `aria-label` attributes
- Error messages use `role="alert"` and `aria-live="polite"` for screen readers
- Full keyboard navigation — every control is reachable by Tab
- Respects `prefers-reduced-motion` — animations disabled when the user opts out
- Supports Windows High Contrast mode via `forced-colors` media query
- Color contrast meets WCAG AA for both light and dark themes

---

## 📦 Browser Support

| Browser | Supported |
|---|---|
| Chrome / Edge (modern) | ✅ |
| Firefox (modern) | ✅ |
| Safari (modern) | ✅ |

Works as a standalone web page or as a browser new-tab / homepage replacement.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
