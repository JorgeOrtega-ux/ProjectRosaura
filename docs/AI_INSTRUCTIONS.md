# AI Development Instructions - Project Rosaura

This guide outlines the mandatory coding rules and architectural constraints that must be followed by any AI developer or coding assistant working on this codebase.

---

## 1. Zero Inline Styles (With Allowed Exceptions)
* **Rule**: Do not use or introduce static inline styling (`style="..."` attributes) in HTML, PHP templates, or dynamically injected Javascript elements when CSS classes can be used.
* **Action**: If you find static inline styles in code you are modifying, **remove them**. Do not replace them with CSS classes or alternative helper classes unless explicitly asked. Just delete the style attribute.
* **Mandatory Exceptions (Where Inline Styles ARE Allowed/Required)**:
  - **Dynamic Theme & Color Data**: Dynamic values generated at runtime from database or user data (e.g., subscription tier border/badge colors, custom dynamic category badges, user-configured themes).
  - **Email Templates**: HTML email templates and email notification bodies, where inline CSS is mandatory for cross-client email rendering compatibility.
  - **Dynamic Runtime Layout Calculations**: Javascript position/dimension calculations computed strictly at runtime when CSS classes or CSS variables cannot handle the requirement.

## 2. Zero Hardcoded User-Facing Text
* **Rule**: All user-facing text, alerts, placeholders, and tooltips must use translation keys. No raw Spanish or English strings in views or scripts.
* **Translation calls**:
  - In Javascript: `window.__('translation_key')` or `__('translation_key')`.
  - In PHP: `__('translation_key')` or `<?php echo __('translation_key'); ?>`.
* **Backend & System Logs**: 
  - Internal components such as backend logs (`Logger`), console error messages, system exceptions, and auxiliary files (e.g. Python scripts) **must be written in English**. 
  - Any system text that cannot use the client-side translator (like background worker messages, Python output, internal exceptions, or logs) must be in English.

## 3. Zero Fallbacks
* **Rule**: Do not write fallback values for translations or configuration keys.
  - **No Translation Fallbacks**: Do not write `window.__('key') || 'Fallback Text'`. If a translation key is missing, it is a configuration bug that must be addressed in the translations catalog, not in the code.
  - **No Credential / Env Fallbacks**: Do not write `$_ENV['KEY'] ?? 'fallback_val'`. Always read environment variables directly. If a configuration is missing, allow the system to fail fast instead of silently masking setup errors with defaults.

## 4. Centralized Route Catalog (`ApiRoutes`)
* **Rule**: Every backend route called by the frontend must be cataloged in [ApiRoutes.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/api/ApiRoutes.js).
* **Action**: Do not pass string literals directly into API client calls. Always import `ApiRoutes` and use its constants (e.g., `ApiRoutes.Auth.Login`).

## 5. HTTP requests via `ApiService`
* **Rule**: All backend HTTP calls must go through the standard `ApiService` wrapper (`public/assets/js/core/api/ApiService.js`).
* **Action**: Never use native `fetch()` or `XMLHttpRequest` for API endpoints. 
  - For standard JSON POST: `this.api.post(route, data, signal)`
  - For multipart/FormData POST: `this.api.postForm(route, formData, signal)`
  - For streaming chunks/events: `this.api.stream(route, data, signal)`
  - For file downloads (invoices, PDFs, exports): `this.api.downloadFile(route, data, filename, signal)`
  - For custom base URLs (like Nginx Go microservice bypasses): `this.api.postCustom(url, data, signal)`
  - *Exception*: Fetching static assets (like local `.json` configurations or image files) can use native `fetch()`.

## 6. Notice System & Feedback
* **Rule**: Do not use native `alert()` or inject raw HTML error messages to inform the user.
* **Action**: Always use `showMessage(message, type)` or `NoticeSystem` to display warnings, success messages, or error feedback to the user.

## 7. Controller Lifecycle & Memory Management
* **Rule**: All SPA controllers must implement standard lifecycle methods to prevent memory leaks during route transitions.
* **Requirements**:
  - `init()`: Setup AbortController, load initial state, and call `this.bindEvents()`.
  - `bindEvents()`: Attach event listeners. Ensure listeners are bound using stored handler references (e.g., `this._boundClick = this.handleClick.bind(this)`) and scoped to the controller's wrapper element rather than `document.body` where possible.
  - `destroy()`: Abort ongoing fetches via `this.abortController.abort()` and remove all attached event listeners.

## 8. Modal Management
* **Rule**: Never manually show or hide modals using DOM display properties (e.g., `element.style.display = 'none'`).
* **Action**: Modals must be shown using `window.modalSystem.show(template, data)` and dismissed using `window.modalSystem.closeCurrent()`.

## 9. Zero Annotations & Explanatory Comments
* **Rule**: Do not add any annotations or comments of any kind (such as JSDocs, PHPDocs, class/method parameter metadata, or inline comments explaining what a code block does or what edits were made).
* **Action**: The code must be self-documenting and remain completely clean. Do not leave explanatory notes, annotations, or change histories inside the source files.

## 10. Standard Javascript Class Structure (for SPA/Settings/Admin Controllers)
To maintain consistency across controllers, all class-based JS modules must follow this strict layout:

1. **Imports (Alphabetical Order)**: Grouped at the top of the file, ordered alphabetically by the path/package name.
2. **Class Declaration**: `export class ControllerName`
3. **Constructor**:
   - Instantiate static components/services (`this.api = new ApiService();`).
   - Store bound handlers to instance properties (e.g., `this._boundClick = this.handleClick.bind(this);`).
   - Initialize instance state properties.
4. **Lifecycle Hooks**:
   - `init()`: Establishes dynamic context (like `AbortController`), calls `this.bindEvents()`, and starts initial data fetch if required.
   - `bindEvents()`: Scopes event listeners to the wrapper element using the bound references.
   - `destroy()`: Disposes of active listeners, clears intervals/timeouts, and aborts pending network calls.
5. **Main Event Handlers**:
   - `handleClick(e)`, `handleChange(e)`, etc. (usually verifying paths/selectors and routing to helper functions).
6. **Helper Methods**:
   - Private business logic or data fetching actions (prefixed with `_` or locally named).
7. **Alternative Exports**: Alias/named exports at the very end of the file.

### Example Template:
```javascript
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

class FeatureController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;

        this._boundClick = this.handleClick.bind(this);
    }

    async init() {
        this.container = document.querySelector('[data-ref="feature-wrapper"]');
        this.abortController = new AbortController();
        this.bindEvents();
        await this._loadData();
    }

    bindEvents() {
        if (this.container) {
            this.container.addEventListener('click', this._boundClick);
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        if (this.container) {
            this.container.removeEventListener('click', this._boundClick);
        }
    }

    handleClick(e) {
        const actionBtn = e.target.closest('[data-action="performAction"]');
        if (actionBtn) {
            this._executeAction(actionBtn);
        }
    }

    async _executeAction(btn) {
        // Business logic...
    }

    async _loadData() {
        // Data fetch...
    }
}
export { FeatureController as AliasName };
```

*Note: Utilities, global loaders (like `AppInit.js`), and direct objects do not need to wrap logic inside this class template, but must still respect all other constraints (e.g., no inline styles, no hardcoded texts, etc.).*

---

## 11. Zero Console Logs
* **Rule**: Do not use or introduce any `console.log()` statements in production code.
* **Exceptions**: The only allowed console logs are those generated by the WebSocket client upon successfully connecting to or disconnecting from a canvas server (e.g., `console.log(\`[Network] Connected to WebSocket server: ${data.node_id}\`);`). Remove all other debugging logs.

## 12. Zero Neutral / Unclassed Divs
* **Rule**: Do not create or introduce generic HTML elements without classes (e.g. `<div></div>`). 
* **Action**: Every HTML/DOM element must have descriptive component or layout CSS classes (e.g. `.component-...`, `.view-...`).

## 13. Strict HTML Attribute Ordering
* **Rule**: All HTML/DOM elements must order their attributes strictly in the following sequence:
  1. `class="..."`
  2. `data-*` attributes (`data-ref="..."`, `data-action="..."`, `data-value="..."`, etc.)
  3. Other native attributes (`type`, `placeholder`, `autocomplete`, etc.)

## 14. Zero `id` Attributes (Use `data-*` System)
* **Rule**: Do not use `id="..."` attributes in HTML templates or JavaScript selectors.
* **Action**: Replace element identifiers with `data-ref="..."` or `data-action="..."` (except for rare browser-required input/label accessibility attributes).

## 15. Zero Hidden Inputs (Use `data-value` System)
* **Rule**: Minimize or avoid using `<input type="hidden">` elements.
* **Action**: Use the platform's native `data-value="..."` attribute on container or trigger elements (e.g. `<div data-ref="field" data-value="value"></div>`), which is automatically extracted by forms and `ModalSystem`.


