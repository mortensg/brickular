## Brickular table behavior contracts (P1)

This document captures the **observable behavior guarantees** for the Brickular table in the current P1 scope. It is intended as a reference for consumers and as a target for tests. Anything not listed here is considered implementation detail and may change between minor versions.

### Data, columns and layout

- **Row identity and order**
  - Input `data` is treated as an ordered list. Rows are rendered in the **same order** as provided after applying sorting and pagination.
  - Each row is wrapped into an internal `BrickTableRow` with a stable `sourceIndex` equal to its index in the original `data` array.

- **Column identity**
  - Each column is identified by a **stable `id` string**. Column order, pinning and visibility are all driven by this id.
  - The selection column uses the reserved id `BRICK_SELECT_COLUMN_ID` and is injected automatically when `selectionMode` is `'single'` or `'multiple'`.

- **Column layout**
  - Columns are split into three panes: **left pinned**, **center**, and **right pinned**.
  - Left- and right-pinned columns are laid out using cumulative sticky offsets so header, filter and body cells always stay horizontally aligned.
  - The center pane horizontally scrolls, while pinned panes remain fixed.
  - Column widths:
    - Start from `column.width` (or a sensible default) and are tracked per-column.
    - Respect `minWidth` / `maxWidth` bounds.
    - Can grow using `flex` when there is extra horizontal space; flex distribution is deterministic and based on the relative `flex` weights.

- **Virtualization**
  - The table virtualizes **rows only**; all columns are present for each rendered row.
  - `visibleRange` is derived from `scrollTop`, `viewportHeight` and `rowHeight`. It represents the **true viewport window**, not an oversized buffer.
  - `visibleRows` is always `pagedRows.slice(visibleRange.start, visibleRange.end)`.

### Sorting

- Sorting is driven by a list of `BrickSortState` objects: `{ columnId, direction: 'asc' | 'desc' }`.
- Clicking a sortable header cycles that column through **ascending → descending → off**.
- When **multi-sort** is enabled (Shift-click), additional sort states are appended in click order; clearing a column’s sort removes only that entry.
- If a column is not sortable (`sortable: false`), header clicks never change the sort state.
- `sortChange` is emitted **after** each sort interaction with the full new sort state array.

### Filtering

- Filtering is applied in the fixed order:
  1. Quick filter (text across all filterable columns),
  2. Per-column filters (text / number / date).
- Filters are **pure** with respect to sorting and pagination:
  - `filteredRows` depends only on `data`, `renderedColumns`, `filters` and `quickFilter`.
  - Sorting and pagination operate on `filteredRows` without mutating it.
- Changing any filter (including quick filter) always:
  - Resets the current `pageIndex` to `0`.
  - Recomputes `filteredRows`, `sortedRows` and `pagedRows`.

### Pagination

- When `paginationEnabled` is `true`:
  - `pagedRows` is a slice of `sortedRows` based on `pageIndex` and `pageSize`.
  - `totalPages` is `max(1, ceil(sortedRows.length / pageSize))`.
  - `pageIndex` is always clamped to `[0, totalPages - 1]`.
  - `pageChange` is emitted whenever the effective page (index or size) changes.
- When `paginationEnabled` is `false`:
  - `pagedRows === sortedRows`.
  - `totalPages` is `1` and `pageIndex` is effectively `0`.

### Selection

- Modes:
  - `'single'`: at most **one** row can be selected at a time.
  - `'multiple'`: any number of rows can be selected.
- The selection column:
  - Appears only when `selectionMode` is `'single'` or `'multiple'`.
  - Is pinned left by default but can be reordered or re-pinned like other columns.
- Behavior:
  - `toggleSelectVisibleRows(true)` selects **all currently paged rows**.
  - `toggleSelectVisibleRows(false)` deselects all currently paged rows.
  - Clicking a row’s checkbox toggles that row’s selection.
  - Shift-click in `'multiple'` mode selects a **contiguous range** between the last clicked row and the current row, based on the **sorted** order.
  - `selectionChange` emits `{ selectedRows }` where `selectedRows` are the original `data` rows in input order.
- The selection header cell wrapper is not clickable; only the checkbox itself is interactive.

### Column resize

- Columns marked `resizable !== false` show a resize handle in the header.
- Dragging the handle:
  - Adjusts only that column’s width within `[minWidth, maxWidth]`.
  - Keeps header, filter and body cell widths in sync.
- During active resize:
  - Column reordering **cannot** be started (drag-start on headers while resizing is ignored).
  - Sorting is temporarily suppressed for a short “cooldown” to avoid accidental clicks after a resize.

### Column reorder and pinning

- Headers of reorderable columns are draggable:
  - Dragging a header shows a **live preview**:
    - All panes (left / center / right) render with the column in its prospective drop position.
    - The dragged column is rendered as an empty “drag slot” with a visible placeholder border down the entire grid.
  - FLIP animation:
    - Other columns animate horizontally to their new positions in both header and body.
    - The selection column is excluded from FLIP transforms to preserve sticky behavior.
- Drop behavior:
  - The committed drop position matches the **current preview** (including insert-before/after and pin pane).
  - `headerOrder` is updated by removing the source `id` and inserting it at the resolved target index.
  - The source column’s `pinned` state is updated to match the target column’s pinned state when they differ.
  - Dropping a column onto itself is a no-op.

### Keyboard and focus

- **Cell focus model**
  - At most one data cell has `tabindex="0"`; all others have `tabindex="-1"`.
  - Clicking a data cell moves the active focus to that cell **without** changing row selection.
  - Arrow keys (`ArrowUp/Down/Left/Right`) move the active cell within the grid, clamped to valid row/column bounds.
  - `Home` moves focus to the first column in the current row; `End` moves to the last column in the current row.
  - `Tab` / `Shift+Tab` move focus to the next/previous cell across rows.

- **Row/column scrolling**
  - Moving focus with arrow keys:
    - Vertically: if the target row is outside the current viewport, `scrollRowIntoView` adjusts `scrollTop` so the row becomes visible with a small buffer.
    - Horizontally: if the target column is outside the center pane, `scrollColumnIntoView` adjusts `centerScrollLeft` to reveal it.
  - Row virtualization respects keyboard navigation: the active cell is only focused after its row is within the `visibleRange`.

- **Global keyboard handling**
  - When the table already has an active cell, arrow/tab/home/end key presses originating **inside the table region or on `document.body`** will delegate to the table’s internal navigation instead of scrolling the page.
  - Key events originating inside focused cells or other interactive elements maintain native behavior; the table does not intercept them.

- **Clipboard**
  - Pressing `Ctrl/Cmd + C` while a cell is active copies that cell’s display value to the clipboard, using `cellRenderer` or `valueFormatter` when provided.

### Accessibility (P1 scope)

- The outer container uses `role="region"` with `aria-label="Brickular data table"`.
- The scroll shell uses `role="grid"` with `aria-rowcount` equal to the filtered row count.
- Rows and cells use semantic divs with keyboard-focusable cells for navigation; screen readers experience is **functional** but not yet fully ARIA-rich (more ARIA will be added beyond P1).

---

These contracts are considered **frozen for P1**. Bug fixes should preserve them unless explicitly called out as breaking changes in a later phase.

