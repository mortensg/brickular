---
name: brickular-angular-component-library
overview: Set up the Brickular Angular 20 component library with a workspace structure inspired by Angular Material and implement a first, well-architected data table with core features, published via a single npm package.
todos:
  - id: scaffold-workspace
    content: Scaffold an Angular 20 workspace with a `brickular` library and a dev app, configured for standalone components and strict TypeScript.
    status: completed
  - id: design-library-structure
    content: Set up the `brickular` library folder and public API structure inspired by Angular Material, with a `table` feature area as the first component family.
    status: in_progress
  - id: implement-core-table
    content: Implement the Brickular data table component with column definitions, sorting, basic filtering, pagination, selection, and virtualization-ready rendering using signals.
    status: pending
  - id: add-styling-theming
    content: Create a theming system with CSS variables and light/dark themes, and apply it to the table component with accessible styles.
    status: pending
  - id: tests-and-dev-app
    content: Add unit tests, optional harness utilities, and a dev app page demonstrating various table configurations.
    status: pending
  - id: publish-setup
    content: Configure the build and npm publishing pipeline so `npm install brickular` exposes the table component(s) to other Angular projects.
    status: pending
  - id: scaffold-docs-app
    content: Scaffold a standalone Angular docs app (brickular-docs) that consumes the brickular library and showcases the data table with multiple examples.
    status: pending
  - id: docs-content
    content: Implement docs pages (overview, examples, API) for the data table, including a playground with configurable columns, data size, and themes.
    status: pending
  - id: github-pages-deploy
    content: Set up GitHub Actions and GitHub Pages to build and deploy the docs app to the gh-pages branch for https://mortensg.github.io/brickular/.
    status: pending
isProject: false
---

### Goals

- **Create the Brickular workspace and library** targeting Angular 20., with a structure inspired by Angular Material.
- **Expose all components (starting with a data table)** from a single npm package install.
- **Implement a first-version data table** focused on core essentials: columns, sorting, basic filtering, pagination, selection, and virtualization-ready rendering.

### High-level architecture

- **Workspace type**
  - Use a **plain Angular workspace** (via `ng new` with `standalone` and `no-ng-modules`) containing:
    - A central `**brickular` library (all public UI components exported from here).
    - A `**dev-app**` (or `demo-app`) used to test components locally.
    - Optional later: a `**docs-app**` (for documentation and live examples), but not required for v1.
- **Library layout (similar in spirit to Angular Material)**
  - Root structure:
    - `[root]/projects/brickular/` — core UI library published as `brickular` on npm.
    - `[root]/projects/brickular/src/lib/` — one folder per component family, e.g. `table/`, `button/`, `form-field/` (start with `table/`).
    - `[root]/projects/brickular/src/public-api.ts` — re-export public component APIs (single entry point, like `@angular/material` main entry).
    - `[root]/projects/brickular/testing/` — optional testing utilities for consumers.
  - Each component family (e.g. `table`) structured with:
    - `table/brickular-table.component.ts` — main table component.
    - `table/table-column.directive.ts` or `table-column.component.ts` — API for describing columns.
    - `table/table-tokens.ts` — DI tokens/config interfaces if needed.
    - `table/table-types.ts` — shared TypeScript types & interfaces.
    - `table/table-*.spec.ts` — unit tests.
- **Consumption model**
  - Consumers install once via `npm install brickular` and import components using **standalone imports**, e.g. `import { BrickTable } from 'brickular/table';` or from `brickular` root depending on our public API design.
  - Keep **all Angular components standalone** with `changeDetection: ChangeDetectionStrategy.OnPush` and signals-based internal state.

### Data table v1 scope (core minimal)

- **Column system**
  - Define a **strongly-typed column definition model** (e.g. `BrickTableColumnDef<T>`):
    - `field` / `key` path into row data.
    - `header` label.
    - `sortable`, `filterable`, `resizable`, `pinnable`, etc. (flags for extensibility; not all must be implemented immediately).
    - `width`, `minWidth`, `maxWidth`, `flex` for layout.
    - `cellRenderer`, `headerRenderer`, `valueFormatter`, and `valueGetter` as optional callbacks.
  - Implement **basic column features now**:
    - Show/hide columns.
    - Column resizing (drag handles) with basic min/max widths.
    - Column moving (drag to reorder) for core use cases.
    - Column pinning (left/right) with separate pinned containers.
    - Header tooltips (via standard title attribute or custom template).
  - Design the API so we can later extend to column groups, spanning, advanced header components, and suppression/locking behaviors.
- **Row model & rendering**
  - Use a **client-side row model** for v1:
    - Input signal for `data: T[]`.
    - Internal **derived state with `computed()**` for sorted/filtered/paginated data.
  - Support:
    - Configurable **row height** (single fixed height initially, with room for dynamic later).
    - Row selection state (single and multi-select via checkboxes or row-click).
    - Row pinning (top/bottom) planned in the API, but can be a follow-up feature if needed.
  - Implement **DOM virtualization** for rows (and prepare for column virtualization):
    - Use a viewport container div with `overflow: auto` and only render visible rows.
    - Track scroll offset and visible index range via signals.
- **Sorting**
  - Implement **single-column sorting** via header clicks.
  - Implement **multi-column sorting** with modifier key (e.g. Shift-click).
  - Allow **custom sort comparators** per column.
  - Add configuration for sort order cycle (asc → desc → none).
- **Filtering (basic)**
  - Implement **text/number/date filters** as simple column-level filter models for v1:
    - For text fields: contains / startsWith.
    - For number/date: simple equality and range for now.
  - Provide a basic **filter UI per column** (e.g. click icon → small popup or inline control in header).
  - Add **quick filter** input in table toolbar for global search across visible columns.
  - Design the filter model so we can later support **custom filters**, floating filters, external filters, and set/multi filters.
- **Editing (basic)**
  - Provide **single-cell editing**:
    - Optional editable flag per column.
    - Simple editors: text, number, date.
  - Emit events for edit start, commit, and cancel.
  - Defer complex editors (rich select, popup editors, full row editing) to later phases.
- **Selection**
  - Single-row selection (click row).
  - Multi-row selection via **checkbox column + Shift-click range selection** (basic implementation).
  - Header-level checkbox for **Select All (current page)**.
  - Events and output signals for consumer to observe and control selection.
- **Pagination**
  - **Client-side pagination** with configurable page size.
  - Simple pagination UI component integrated into the table footer.
  - API to control page programmatically and to react to page changes.
  - Keep API compatible with potential future server-side / infinite row models.
- **Styling & theming**
  - Define a **design token / CSS variables based theme system**:
    - Base tokens for spacing, typography, colors, borders.
    - Table-specific variables (row hover color, header background, border style, selected row color, etc.).
  - Ship **two starter themes**: a light default and a dark variant.
  - Structure styles so that each component has:
    - Local SCSS/CSS with BEM-like or Angular Material-like class naming (`b-table`, `b-table-row`, etc.).
    - Theme-level overrides included via a global styles entry in the library.
  - Ensure **high contrast and accessible focus states**.
- **Accessibility & keyboard support**
  - Implement **ARIA roles** (`grid`, `row`, `columnheader`, `gridcell`, etc.).
  - Full **keyboard navigation** between cells/rows (arrow keys, Home/End, PageUp/PageDown where reasonable).
  - Focus management that keeps focus visible during navigation and editing.
  - Screen reader-friendly semantics for selection state, sort order, and pagination.

### Tooling, quality, and DX

- **Build & packaging**
  - Configure the Angular workspace so that:
    - `ng build brickular` produces an **APF-compliant** library build for Angular 20..
    - Output is suitable for publishing to npm under the `brickular` name.
  - Ensure **strict TypeScript** and Angular compiler options are enabled.
  - Set up **single entry point** initially (`brickular`), with the option to add **secondary entry points** later (e.g. `brickular/table`, `brickular/button`) if we want a closer Angular Material feel.
- **Testing**
  - Add **unit tests** for:
    - Column definition parsing & rendering.
    - Sorting & filtering logic.
    - Pagination and selection behavior.
    - Virtual scroll calculations.
  - Add **component harness-style helpers** in `projects/brickular/testing` to facilitate consumer tests.
- **Dev app & examples**
  - Create a **dev application** that imports the library via local path and showcases:
    - Basic table with plain data.
    - Table with sorting, filtering, and pagination enabled.
    - Table with selection and editing enabled.
    - Light vs dark theme demo.
  - Optional: integrate **Storybook** later for more formal component docs.
- **API design & docs**
  - Document the **public API** for the table:
    - Inputs: data, columnDefs, pagination config, selection mode, etc.
    - Outputs: row selection changes, sort/filter changes, page changes, edit events.
    - Types/interfaces for column and filter configuration.
  - Add a `**README` section for Brickular Table describing installation, basic usage, and key examples.

### Docs app and GitHub Pages

- **Docs app (`brickular-docs`)**
  - Create a dedicated Angular 20 app (e.g. `projects/brickular-docs`) using standalone components and `ChangeDetectionStrategy.OnPush`.
  - The docs app must consume the built `brickular` library (not internal copies) so examples mirror real consumer usage.
  - Structure routes such as:
    - `/` — overview of Brickular, install instructions, version badge, link to GitHub.
    - `/table/overview` — concepts and goals of the data table.
    - `/table/examples` — multiple examples (basic table, large dataset, sorting/filtering, selection, editing).
    - `/table/api` — API reference for main table inputs, outputs, and types.
  - Layout:
    - Left sidebar navigation (Components → Table).
    - Top bar with theme toggle (light/dark) and link to the GitHub repo.
    - Central playground area where users can tweak:
      - Columns (toggle sorting, filtering, selection).
      - Data size (e.g. 100 / 10k rows) to showcase performance.
      - Theme and density (compact / comfortable).
- **GitHub Pages deployment**
  - Build configuration:
    - Configure the docs app so `ng build brickular-docs --base-href /brickular/` outputs to `dist/brickular-docs`.
  - GitHub Actions workflow:
    - Trigger on pushes to `main`.
    - Steps: checkout → `npm ci` → `ng build brickular-docs --configuration production` → deploy `dist/brickular-docs` to the `gh-pages` branch.
  - GitHub Pages settings:
    - Configure the `mortensg/brickular` repo to serve GitHub Pages from the `gh-pages` branch, root folder.
    - Public site URL: `https://mortensg.github.io/brickular/`.

### Future expansions (not in v1, but planned)

- Advanced row models (Infinite, Viewport) and server-side integration.
- Row grouping, pivoting, and aggregation features.
- Advanced filter types (Set, Multi, Excel-like filter builder).
- Master/detail rows, full-width rows, and tree data mode.
- Side bar, status bar, context menu and export features (CSV/Excel).

This plan keeps the initial release focused, high-quality, and aligned with Angular Material-style structure, while designing the APIs so we can layer in the rest of your AG Grid-like feature list over time.
