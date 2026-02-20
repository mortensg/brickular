# Header Groups – Plan and Behavior Spec

This document defines the intended behavior for **header groups** (column categories) and a phased plan to fix current issues and stabilize the feature.

---

## 1. Goal and scope

- **Header groups** are optional bands above the column headers that group columns into categories (e.g. "Customer", "Status & Spend").
- Columns declare membership via `headerGroupId`; groups are defined via `headerGroups` input (`{ id, label }[]`).
- Only **center (non-pinned)** columns participate in the group row; left/right pinned columns have fixed spacers so the group row aligns with the three panes.
- The feature should work correctly with: column reorder (drag/drop), pinning, resize, and existing table behavior.
- **Planned (Phase D):** ungrouped columns full height (span both header rows), pin column → leave group, pin/drag/resize entire groups; these will require significant refactoring.

---

## 2. Desired behavior (target spec)

### 2.1 Static display

- When `headerGroups.length > 0` and there are center columns with `headerGroupId` in the group list:
  - A **group row** is rendered above the header row, with one cell per contiguous group of columns.
  - Each group cell shows the group `label` and has width = sum of its columns’ widths.
  - Ungrouped center columns (no `headerGroupId` or id not in `headerGroups`) do **not** get a group cell; they create a visual gap (no label above them).
  - Left/right spacers in the group row match `leftPinnedWidth` / `rightPinnedWidth` and stay sticky; the center segment scrolls with the center pane and has total width `centerTotalWidth`.

- **Ungrouped columns – full height (planned)**  
  - A column may optionally **not** be in any group. Such columns should span the **full height** of the header: one cell that covers both the group row and the header row (so the column header appears in a single tall cell, no separate group band above it).
  - This will require **significant refactoring**: the header layout today has a separate group row and header row; ungrouped full-height columns need a different DOM/layout path (e.g. row-span or a merged cell that crosses both rows).

### 2.2 Column reorder and groups

- **Reorder within the same group**
  - User can drag a column to another position **within** the same group (before/after any column in that group).
  - The **group row** does **not** show a placeholder or gap; the band stays one continuous strip.
  - Preview and committed order: column moves to the exact before/after position chosen.

- **Reorder into a different group**
  - User can drag a column **into** another group and place it **anywhere** within that group (before/after any column, including between two columns in the group).
  - Placeholder and committed position follow the exact before/after target from the drag (same as reorder within same group or ungrouped).
  - On drop: column is inserted at that position and its `headerGroupId` is set to the target column’s group (via overrides or parent update).

- **Reorder into “no group” (ungrouped area)**
  - If there are ungrouped center columns, dropping before/after them should work as today (exact position); no group assignment.

### 2.3 Drag UX

- **While dragging**
  - The column’s **original** group label must **not** appear above the placeholder (no “ghost” group name over the drag slot).
  - When hovering over a **different** group: that group’s band should **visually expand/highlight** (e.g. background + padding) to show “drop here to join this group”.
  - When reordering **within the same** group: no gap in the group row; the band stays continuous.

- **Empty group**
  - When the **last** column in a group is being dragged out (or reordered such that the group would be empty), that group must **not** be shown (no zero-width or empty group band).

### 2.4 Pin and group interaction

- **Pin column → leave group**  
  - When a column is pinned left or right, it is **removed from its assigned group**. Pinned columns do not participate in the group row; they sit in the left/right pane with no group label above them. Group overrides for that column can be cleared on pin, or kept so that if the column is unpinned later it returns to the same group (product choice; plan: clear on pin so pinned = ungrouped).

- **Pin a group (planned)**  
  - User can pin an **entire group** left or right. The group and **all its columns** move together to the pinned pane. This implies:
    - Group-level pin state (e.g. `groupPinned: Record<groupId, 'left' | 'right' | undefined>`).
    - When a group is pinned, all columns in that group are laid out in the left (or right) pane; the group row shows the group label in the pinned area; header/filter/body rows show those columns in the same pane.
  - Likely requires refactoring: today “pinned” is per-column; group pin means deriving column pin from group pin and keeping group + columns in sync.

- **Drag a group (planned)**  
  - User can **drag a group** (the group label/band in the group row) to reorder **groups** (like dragging columns). Dropping the group between two other groups (or at start/end) moves the whole group and all its columns to that position. Implementation: group order state + mapping column order from group order.

- **Resize groups (planned)**  
  - Groups can be **resized** like columns: a resize handle on the group cell allows the user to change the group’s total width. Behavior to define: either (a) the group width is distributed to its columns (proportionally or to a single “flex” column), or (b) the group has an explicit width and column widths within it are derived. Likely requires group-level width state and resize UX in the group row.

### 2.5 Persistence and API

- Group assignment changes (drag from one group to another) are reflected in the table via **header group overrides** (internal state keyed by column id).
- Optionally: emit an event (e.g. `columnGroupChange`) so the parent can persist column definitions (including `headerGroupId`).
- When the column set is re-initialized (new `columnDefs`), overrides can be cleared so the table doesn’t keep stale group assignments for removed columns.

---

## 3. Current implementation (summary)

| Area | What exists today |
|------|-------------------|
| **Data** | `BrickHeaderGroupDef`, `BrickTableColumnDef.headerGroupId`, `headerGroups` input, `headerGroupOverrides` signal. |
| **Layout** | Group row with left spacer, center group row (scrollable), right spacer; pure `computeHeaderGroupSegments()` in `table-header-groups.ts` builds segments. |
| **Drag** | Drop target (targetColumnId + before) from last dragover; column can be placed anywhere within a group; drop on group band = insert after last column of that group. |
| **Ungroup** | Explicit 5px edge zones on left/right of each group band. Drop on edge = place column ungrouped next to that edge. Table uses `ungroupAtEdge` from drag hint. |
| **Placeholder in group row** | `__drag-gap` only when the drop target is over ungrouped columns (no group). Same-group reorder and drop-into-group keep one segment. |
| **Empty group** | When the only column in a group is dragged, that group has no segment. |
| **Drop target highlight** | `dropTargetColumnId` / `dropTargetGroupId`; `.b-table__header-group-cell--drop-target` expands/highlights the group under cursor. |

---

## 4. Known issues and gaps

1. ~~**First/last only in target group**~~ Resolved: any position within the target group is allowed.

2. **Same-group reorder**
   - “No placeholder in group row” is implemented via `draggingColumnOriginalGroupId` and same-group check, but edge cases may remain (e.g. no drop target yet, or target in another group then back to same group).

3. **Group row alignment**
   - Group row widths are derived from column widths; any mismatch (flex, rounding, resize) can cause misalignment between group band and column boundaries.

4. **Pinned columns and groups**
   - Select column / pinned columns are excluded from the group row. Plan: when a column is pinned, it is removed from its group (clear override). Pin-a-group, drag group, and resize group are planned in Phase D.

5. **No official API / contract**
   - Header groups are not yet part of TABLE_BEHAVIOR_CONTRACT_P1 or the feature matrix “Column groups” row; persistence (overrides vs parent-controlled) and events are not specified.

6. **Accessibility**
   - Group row semantics (role, labels) and screen reader behavior are not defined.

---

## 5. Phased plan

### Phase A – Stabilize current behavior (no new features)

- **A1** – **Spec and tests**
  - Add a short “Header groups” section to the behavior contract (or a P2 appendix) describing: when the group row is shown, how segments are built, any-position drop within a group, no gap for same-group reorder, no empty group.
  - Add unit/integration tests for: `computedHeaderGroups` (with/without drag, same-group vs different-group), and `onHeaderDrop` (order + group override).

- **A2** – **Same-group reorder**
  - Ensure when `dropTargetColumnId` is null (e.g. drag over empty area or before first dragover), we don’t show a gap for the same group (e.g. keep treating dragged column as in its original group when `draggingColumnOriginalGroupId` is set and there is no other group target). Verify: drag within group, no __drag-gap; drag out then back into same group, then drop.

- **A3** – **Empty group and last column**
  - Confirm: when the only column in a group is dragged, the group disappears; when that column is dropped elsewhere (or back), the group appears again. No zero-width group cells.

### Phase B – Alignment and robustness

- **B1** – **Group row width alignment**
  - Ensure group segment widths use the same source as column widths (e.g. `columnWidths` / resolved widths) and that the group row’s total width matches the center pane content width so the band never visibly overshoots or undershoots column boundaries.

- **B2** – **Pin column → leave group**
  - When a column is pinned left or right, remove it from its assigned group: clear its group override (or treat as ungrouped). Pinned columns do not show in the group row. When unpinning, either leave ungrouped or restore previous group (product choice; plan: clear on pin so pinned = ungrouped).

### Phase C – API and polish

- **C1** – **Optional columnGroupChange output**
  - Add `columnGroupChange` output (e.g. `{ columnId, headerGroupId: string | undefined }`) emitted when a column is dropped into another group (or out of a group). Parent can persist to column defs.

- **C2** – **Feature matrix and docs**
  - Update TABLE_FEATURE_MATRIX.md “Column groups (basic grouping in header)” to reflect current state (e.g. “[x] Implemented (basic)” or “[ ] P2 with follow-ups”).
  - Add a short “Header groups” subsection in the table README or storybook describing `headerGroups`, `headerGroupId`, and drag behavior.

- **C3** – **Accessibility**
  - Define roles and labels for the group row (e.g. `role="row"` and group cell labels) and ensure the group row doesn’t break keyboard navigation or screen reader order.

### Phase D – Planned enhancements (requires refactoring)

- **D1** – **Ungrouped columns full height**
  - Allow columns to opt out of any group. Render such columns with a **single header cell spanning both the group row and the header row** (full height of both rows). Requires refactoring: header layout today is two separate rows; need row-span or merged-cell path for ungrouped columns.

- **D2** – **Pin a group**
  - User can pin an entire group left or right; the group and all its columns move to the pinned pane. Requires: group-level pin state, deriving column pin from group pin, and group row rendering in the pinned area.

- **D3** – **Drag a group**
  - User can drag a group (the group label/band) to reorder groups (like column drag). Drop between groups moves the whole group and all its columns. Requires: group order state and mapping column order from group order.

- **D4** – **Resize groups**
  - Groups can be resized (resize handle on group cell). Define whether group width is distributed to columns or group has explicit width; add group-level width state and resize UX in the group row.

---

## 6. Out of scope (for this plan)

- Nested groups (groups inside groups).
- Group-level actions (e.g. sort/filter by group).

---

## 7. File reference

- **Types:** `table-types.ts` – `BrickHeaderGroupDef`, `headerGroupId` on `BrickTableColumnDef`.
- **Table component:** `brickular-table.component.ts` – `headerGroups`, `headerGroupOverrides`, `previewRenderedColumns`, `headerColumnsWithGroupOverrides`, `onHeaderDrop`, `draggingColumnOriginalGroupId`, `dropTargetColumnIdForHeader`.
- **Header component:** `table-header.component.ts` – `computedHeaderGroups()`, `dropTargetColumnId`, `draggingColumnOriginalGroupId`, `dropTargetGroupId`, group row template and __drag-gap / --drop-target.
- **Styles:** `brickular-table.component.scss` – `.b-table__header-group-*`, `--drag-gap`, `--drop-target`.

---

## 8. Refactor proposal: stable header group segments

### 8.1 Current pain points

1. **Single long stateful loop**  
   `computedHeaderGroups()` is one ~100-line loop over center columns that tracks `currentId`, `currentWidth`, `segmentStartIndex`, `centerColumnIndex`, with three distinct branches for the dragging column (same-group reorder, drop into group, drop between/ungrouped). Small changes repeatedly introduced edge cases because the same state is reused across all branches.

2. **Implicit contract**  
   Segment building assumes columns are in **preview** order, the dragged column has `headerGroupId` stripped, and `dropTargetGroupId` is the group of the column under the cursor. None of this is documented in one place.

3. **Width vs span**  
   Segments have both `width` and `columnStart`/`columnSpan`. Rounding and last-segment adjustment can drift from actual column boundaries.

4. **Two templates**  
   With groups: merged grid; without groups: single header row. Header cell markup is duplicated.

### 8.2 Recommended refactor

**A. Extract a pure segment function (two-phase)**

- **New module** (e.g. `table-header-groups.ts`):
  - **Input:** `centerColumns`, `getWidth(columnId)`, `headerGroups`, `totalWidth`, `options: { draggingColumnId, dropTargetColumnId, draggingOriginalGroupId }`. Derive `dropGroupId` from `dropTargetColumnId` + columns.
  - **Phase 1:** For each center column index, compute an **effective segment key**: normal column → `headerGroupId` or null; dragging column → same-group → original group, drop-in-group → target group, else `'__drag-gap'`.
  - **Phase 2:** Merge contiguous indices with the same key; output `{ id, label?, width, columnStart, columnSpan }`. Skip runs with key `null`.
  - **Phase 3:** Adjust last segment width so total matches `totalWidth`.
- **Benefits:** One place for “what segment does each column index belong to”; merging is separate and easy to unit test.

**B. Keep drag/group state in the table**  
Table continues to own preview order, overrides, and drop target. Header remains presentational and calls the pure function.

**C. Single header template (optional)**  
Unify “with groups” and “no groups” into one template to avoid duplicated header cell markup. Lower priority than (A).

### 8.3 Concrete steps

1. Add `table-header-groups.ts` with `computeHeaderGroupSegments(...)` (two-phase).
2. Replace `computedHeaderGroups()` in the header with a call to that function.
3. Add unit tests for the pure function: no drag; same-group (no gap); drop into group (no split); drop between (gap); last from A to start of B; ungrouped; empty group.
4. Leave template/styles as-is initially.

### 8.4 Out of scope for this refactor

- Group-level pin/drag/resize (Phase D).
- Changing preview order or overrides in the table.
- Nested groups.

---

*Last updated: added ungrouped full-height columns, pin column → leave group, pin/drag/resize group (Phase D); B2 aligned to “pin column leaves group”.*
