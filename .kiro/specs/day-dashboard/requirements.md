# Requirements Document

## Introduction

The Day Dashboard is a client-side personal productivity web page that helps users organize their day. It displays the current time and date with a contextual greeting, a configurable Pomodoro focus timer, a persistent to-do list, and a quick-links panel for favorite websites. The application is built with HTML, CSS, and vanilla JavaScript, stores all data in the browser's Local Storage, and requires no backend server.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Clock**: The component that displays the current time and date.
- **Greeting**: The text message shown to the user based on the current time of day.
- **Focus_Timer**: The configurable countdown timer used for focused work sessions (Pomodoro-style).
- **Session_Duration**: The user-configured duration of a Focus_Timer session, in minutes.
- **Todo_List**: The component that manages the user's task list.
- **Task**: A single item in the Todo_List with a title, completion status, and creation timestamp.
- **Quick_Links**: The component that manages and displays user-defined website shortcuts.
- **Link**: A single Quick_Links entry consisting of a label and a URL.
- **Local_Storage**: The browser's `localStorage` API used for client-side data persistence.
- **Theme**: The visual color scheme of the Dashboard, either light or dark.
- **Sort_Order**: The ordering applied to the Todo_List, either by creation time or by completion status.

---

## Requirements

### Requirement 1: Clock and Greeting Display

**User Story:** As a user, I want to see the current time, date, and a contextual greeting, so that I have immediate temporal context when I open the Dashboard.

#### Acceptance Criteria

1. THE Clock SHALL display the current time in HH:MM:SS format, updated every second.
2. THE Clock SHALL display the current date including the full day name, numeric calendar date, full month name, and 4-digit year (e.g., "Saturday, 29 August 2026").
3. WHEN the local time is between 05:00 and 11:59, THE Greeting SHALL display a morning greeting message.
4. WHEN the local time is between 12:00 and 16:59, THE Greeting SHALL display an afternoon greeting message.
5. WHEN the local time is between 17:00 and 20:59, THE Greeting SHALL display an evening greeting message.
6. WHEN the local time is between 21:00 and 04:59, THE Greeting SHALL display a night greeting message.
7. WHEN the local time crosses a greeting time boundary, THE Greeting SHALL update to the appropriate message automatically without requiring a page reload.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a configurable countdown timer, so that I can manage focused work sessions using the Pomodoro technique.

#### Acceptance Criteria

1. THE Focus_Timer SHALL default to a Session_Duration of 25 minutes on first load.
2. WHEN the user activates the start control, THE Focus_Timer SHALL begin counting down from the current Session_Duration.
3. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL update the displayed time remaining every second in MM:SS format.
4. WHEN the user activates the stop control, THE Focus_Timer SHALL pause the countdown and retain the time remaining.
5. WHEN the user activates the reset control, THE Focus_Timer SHALL stop the countdown and restore the displayed time to the current Session_Duration.
6. WHEN the countdown reaches zero, THE Focus_Timer SHALL stop, display "00:00", and present a visible session-complete indicator that remains visible until the user activates the start or reset control.
7. WHEN the user sets a new Session_Duration between 1 and 120 minutes, THE Focus_Timer SHALL apply that duration on the next reset or immediately if the timer is not running.
8. IF the user enters a Session_Duration outside the range of 1 to 120 minutes, THEN THE Focus_Timer SHALL reject the input, display an error message indicating the valid range of 1 to 120 minutes, and retain the previous valid Session_Duration.
9. THE Focus_Timer SHALL persist the configured Session_Duration to Local_Storage so that it is restored on the next page load.
10. WHEN the user activates the start control while the Focus_Timer is already counting down, THE Focus_Timer SHALL ignore the activation and continue the current countdown unchanged.
11. IF Local_Storage is unavailable or contains an invalid Session_Duration value, THEN THE Focus_Timer SHALL fall back to the default Session_Duration of 25 minutes.

---

### Requirement 3: To-Do List - Task Management

**User Story:** As a user, I want to add, edit, complete, and delete tasks, so that I can track what I need to accomplish during the day.

#### Acceptance Criteria

1. WHEN the user submits a non-empty task title, THE Todo_List SHALL add a new Task with that title, an incomplete status, and a creation timestamp, and display it in the task list without requiring a page reload.
2. IF the user submits an empty or whitespace-only task title, THEN THE Todo_List SHALL reject the submission, display an inline validation message within the input area, and retain focus on the input field.
3. WHEN the user activates the edit control on a Task, THE Todo_List SHALL present the task title in an editable field pre-populated with the current title, with the cursor positioned at the end of the text.
4. WHEN the user saves an edited Task with a non-empty title (1-200 characters after trimming leading and trailing whitespace), THE Todo_List SHALL update the Task title to the trimmed value.
5. IF the user saves an edited Task with an empty or whitespace-only title, THEN THE Todo_List SHALL reject the save, retain the original Task title, and display an inline validation message within the edit field.
6. IF the user submits a task title exceeding 200 characters, THEN THE Todo_List SHALL reject the submission and display an inline validation message indicating the 200-character limit.
7. WHEN the user activates the complete control on an incomplete Task, THE Todo_List SHALL mark the Task as complete and apply a strikethrough style to the task title.
8. WHEN the user activates the complete control on a completed Task, THE Todo_List SHALL mark the Task as incomplete and remove the strikethrough style from the task title.
9. WHEN the user activates the delete control on a Task, THE Todo_List SHALL remove that Task from the list immediately without requiring a confirmation step.
10. THE Todo_List SHALL persist all Tasks to Local_Storage after every add, edit, complete, or delete operation, storing each Task's title, completion status, and creation timestamp.
11. WHEN the Dashboard loads, THE Todo_List SHALL restore all Tasks from Local_Storage and display them in the order they were created.
12. IF Local_Storage is unavailable or returns a parse error on Dashboard load, THEN THE Todo_List SHALL display an empty task list and show an inline message indicating tasks could not be restored.

---

### Requirement 4: To-Do List - Sorting

**User Story:** As a user, I want to sort my tasks, so that I can view them in an order that is most useful to me.

#### Acceptance Criteria

1. WHEN the user selects the "by creation time" Sort_Order, THE Todo_List SHALL display Tasks ordered from oldest to newest by creation timestamp.
2. WHEN the user selects the "by completion status" Sort_Order, THE Todo_List SHALL display incomplete Tasks before completed Tasks, preserving creation-time order within each group.
3. WHEN the user selects a Sort_Order, THE Todo_List SHALL persist the selected Sort_Order to Local_Storage.
4. WHEN the page loads and a valid Sort_Order is found in Local_Storage, THE Todo_List SHALL restore and apply that Sort_Order.
5. IF no Sort_Order is found in Local_Storage or the stored value is not a recognised Sort_Order, THEN THE Todo_List SHALL apply the "by creation time" Sort_Order as the default.

---

### Requirement 5: Quick Links

**User Story:** As a user, I want to save and access shortcuts to my favorite websites, so that I can navigate to them quickly from the Dashboard.

#### Acceptance Criteria

1. WHEN the user submits a Link with a non-empty label of at most 100 characters and a valid URL of at most 2048 characters beginning with "http://" or "https://", THE Quick_Links SHALL add the Link to the list and display it as a clickable button showing the label text.
2. IF the user submits a Link with an empty label or an empty URL, THEN THE Quick_Links SHALL reject the submission, preserve the entered values in the input fields, and display an inline validation message indicating which field is empty.
3. IF the user submits a Link with a URL that does not begin with "http://" or "https://", THEN THE Quick_Links SHALL reject the submission, preserve the entered URL value in the input field, and display an inline validation message indicating an invalid URL format.
4. IF the user submits a Link with a label exceeding 100 characters or a URL exceeding 2048 characters, THEN THE Quick_Links SHALL reject the submission and display an inline validation message indicating the field length limit.
5. WHEN the user activates a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab without navigating away from the Dashboard.
6. WHEN the user activates the delete control on a Link, THE Quick_Links SHALL remove that Link from the list immediately.
7. THE Quick_Links SHALL persist all Links to Local_Storage after every add or delete operation, storing each Link's label and URL.
8. WHEN the Dashboard loads, THE Quick_Links SHALL restore all Links from Local_Storage and display them as clickable buttons in the order they were added.
9. IF Local_Storage is unavailable or returns a read error on Dashboard load, THEN THE Quick_Links SHALL display an empty link list and show an inline error message indicating that saved links could not be loaded.

---

### Requirement 6: Light/Dark Theme

**User Story:** As a user, I want to toggle between a light and dark visual theme, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL default to the light Theme on first load when no Theme preference is stored in Local_Storage.
2. WHEN the user activates the theme toggle control, THE Dashboard SHALL switch from the current Theme to the opposite Theme within 200 milliseconds.
3. WHILE the dark Theme is active, THE Dashboard SHALL apply a dark color scheme to all visible components, including navigation, content areas, and interactive controls.
4. WHILE the light Theme is active, THE Dashboard SHALL apply a light color scheme to all visible components, including navigation, content areas, and interactive controls.
5. WHEN the user activates the theme toggle control, THE Dashboard SHALL persist the selected Theme to Local_Storage.
6. WHEN the Dashboard loads and a Theme value is present in Local_Storage, THE Dashboard SHALL restore the persisted Theme instead of defaulting to the light Theme.
7. IF Local_Storage is unavailable or the stored Theme value is not a recognized Theme identifier, THEN THE Dashboard SHALL default to the light Theme without displaying an error to the user.

---

### Requirement 7: Data Persistence and Storage

**User Story:** As a user, I want my tasks, links, timer settings, sort preference, and theme to be saved automatically, so that my Dashboard state is preserved between browser sessions.

#### Acceptance Criteria

1. THE Dashboard SHALL store the following data exclusively in Local_Storage using the browser's `localStorage` API, with no server-side communication: the task list, the quick-links list, timer Session_Duration, the active Sort_Order, and the active Theme.
2. WHEN any change is made to a persisted data item (task list, quick-links list, timer Session_Duration, Sort_Order, or Theme), THE Dashboard SHALL write the updated value to Local_Storage immediately before the next render cycle completes.
3. IF Local_Storage is unavailable or throws an error during a write operation, THEN THE Dashboard SHALL display a non-blocking warning message indicating that changes cannot be saved, which remains visible until the user dismisses it, and continue operating with in-memory state for the remainder of the session.
4. IF Local_Storage is unavailable or throws an error during a read operation on initial load, THEN THE Dashboard SHALL initialize all components with their default values: an empty task list, an empty quick-links list, a 25-minute Session_Duration, "by creation time" Sort_Order, and the light Theme.

---

### Requirement 8: Technical Constraints and Compatibility

**User Story:** As a developer, I want the Dashboard to be built with plain HTML, CSS, and vanilla JavaScript and to work in modern browsers, so that no build tools or server infrastructure are required.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and vanilla JavaScript with no external frameworks, libraries, or build tools, and SHALL NOT require any package manager, bundler, transpiler, or runtime dependency to function.
2. THE Dashboard SHALL be structured with exactly one CSS file located inside a `css/` directory and exactly one JavaScript file located inside a `js/` directory, and all HTML, CSS, and JavaScript source files SHALL be referenced by relative paths so the directory structure remains self-contained.
3. THE Dashboard SHALL be fully functional as a standalone file opened directly in a browser using a `file://` URL without a web server, meaning all assets SHALL load and all interactive features SHALL operate without any network requests to a local or remote server.
4. THE Dashboard SHALL render and operate correctly in the current stable releases of Chrome, Firefox, Edge, and Safari, using only Web APIs available in all four browsers without polyfills or vendor-prefixed properties.
5. THE Dashboard SHALL present a responsive layout that remains usable at viewport widths from 320px to 2560px, where "usable" means all interactive controls are reachable and operable, all text content is readable without horizontal scrolling, and no content is clipped or hidden by overflow at any width within that range.

---

### Requirement 9: Performance

**User Story:** As a user, I want the Dashboard to load and respond quickly, so that it does not interrupt my workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL complete initial render within 2 seconds on a standard desktop device with a stable broadband internet connection and no more than 100 tasks loaded.
2. WHEN the user adds a task, THE Dashboard SHALL reflect the new task in the task list within 100 milliseconds without requiring a full page reload.
3. WHEN the user toggles the theme, THE Dashboard SHALL apply the new theme to all visible UI elements within 100 milliseconds.
4. WHEN the user starts the timer, THE Dashboard SHALL display the timer in a running state within 100 milliseconds.
5. IF the initial render exceeds 2 seconds, THEN THE Dashboard SHALL display a loading indicator within 500 milliseconds of the page load being initiated.
