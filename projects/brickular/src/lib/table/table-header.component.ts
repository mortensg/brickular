import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BRICK_SELECT_COLUMN_ID,
  BrickFilterValue,
  BrickHeaderDragTarget,
  BrickHeaderGroupDef,
  BrickHeaderGroupDragTarget,
  BrickRowData,
  BrickTableColumnDef,
} from './table-types';
import {
  computeHeaderGroupSegments,
  computeHeaderSectionDescriptors,
} from './table-header-groups';
import { resolveFilterType as engineResolveFilterType } from './table-engine';
import { tableHeaderCellVariants, toPinVariant } from './table-variants';

@Component({
  selector: 'b-table-header',
  imports: [CommonModule],
  template: `
    @if (headerGroups().length > 0 && computedHeaderGroups().length > 0) {
      <div
        class="b-table__header-container"
        role="rowgroup"
        aria-label="Column groups and headers"
        (dragover)="onHeaderContainerDragOver($event)"
        (drop)="onHeaderContainerDrop($event)"
        (dragend)="onHeaderDragEnd()"
      >
        @if (leftColumns().length > 0) {
          <div class="b-table__header-section b-table__header-section--left" [style.width.px]="sectionWidthPx({ type: 'ungrouped', columns: leftColumns() })">
            @for (column of leftColumns(); track column.id) {
              @if (column.id === BRICK_SELECT_COLUMN_ID) {
                <div
                  class="b-table__select-cell b-table__header-select-cell"
                  [class.b-table__select-cell--pinned-left]="true"
                  [class.b-table__header-cell--left-boundary]="column.id === lastLeftColumnId()"
                  [class.b-table__header-cell--right-boundary]="column.id === firstRightColumnId()"
                  [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()"
                  role="columnheader"
                  [attr.data-column-id]="column.id"
                  [style.width.px]="columnWidths()[column.id]"
                  [style.left.px]="column.pinned === 'left' ? stickyLeftPx()[column.id] : null"
                  [style.right.px]="column.pinned === 'right' ? stickyRightPx()[column.id] : null"
                  [style.position]="'sticky'"
                  [style.zIndex]="9"
                  draggable="true"
                  tabindex="0"
                  (click)="$event.preventDefault(); $event.stopPropagation()"
                  (contextmenu)="onHeaderContextMenu($event, column)"
                  (dragstart)="headerDragStart.emit({ columnId: column.id, event: $event })"
                  (dragover)="onHeaderDragOver($event, column.id)"
                  (dragend)="onHeaderDragEnd()"
                  (drop)="onHeaderDropInternal($event, column.id)"
                >
                  @if (column.id !== draggingColumnId()) {
                  <input
                    type="checkbox"
                    [checked]="allVisibleSelected()"
                    [indeterminate]="someVisibleSelected()"
                    (change)="onSelectVisibleChange($event); $event.stopPropagation()"
                    (click)="$event.stopPropagation()"
                    aria-label="Select visible rows"
                  />
                  }
                </div>
              } @else {
                <div
                  [class]="headerCellClass(column)"
                  [class.b-table__header-cell--left-boundary]="column.id === lastLeftColumnId()"
                  [class.b-table__header-cell--right-boundary]="column.id === firstRightColumnId()"
                  [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()"
                  role="columnheader"
                  [attr.data-column-id]="column.id"
                  [style.width.px]="columnWidths()[column.id]"
                  [style.left.px]="stickyLeftPx()[column.id]"
                  [style.position]="'sticky'"
                  [style.zIndex]="9"
                  [style.minWidth.px]="column.minWidth ?? 80"
                  [style.maxWidth.px]="column.maxWidth ?? 600"
                  [title]="column.tooltip ?? column.header"
                  [attr.draggable]="column.suppressMove ? null : 'true'"
                  tabindex="0"
                  (click)="toggleSort.emit({ columnId: column.id, addToSort: $event.shiftKey })"
                  (contextmenu)="onHeaderContextMenu($event, column)"
                  (dragstart)="onHeaderDragStart($event, column)"
                  (dragover)="onHeaderDragOver($event, column.id)"
                  (dragend)="onHeaderDragEnd()"
                  (drop)="onHeaderDropInternal($event, column.id)"
                >
                  @if (column.id !== draggingColumnId()) {
                  <span>{{ resolveHeaderLabel(column) }}</span>
                  <span class="b-table__sort-indicator">{{ sortIndicator()(column.id) }}</span>
                  @if (column.resizable !== false) {
                    <button type="button" class="b-table__resize-handle" draggable="false" (dragstart)="$event.preventDefault(); $event.stopPropagation()" (mousedown)="resizeStart.emit({ columnId: column.id, event: $event }); $event.stopPropagation()" [attr.aria-label]="'Resize column ' + column.header"></button>
                  }
                  }
                </div>
              }
            }
          </div>
        }
        @for (section of centerHeaderSectionsWithGroupPlaceholder(); track sectionTrack(section)) {
          <div class="b-table__header-section" [style.width.px]="sectionWidthPx(section)">
            @switch (section.type) {
              @case ('group') {
                <div
                  class="b-table__header-group-container"
                  [class.b-table__header-group-cell--drop-target]="section.id === dropTargetGroupId() && !dropTargetUngroupAtEdge()"
                  [style.grid-template-columns]="sectionGridColumns(section.columns)"
                >
                  <div
                    class="b-table__header-group-cell"
                    [class.b-table__header-group-cell--dragging]="draggingGroupId() === section.id"
                    [class.b-table__header-group-cell--drop-target-before]="groupDropTarget()?.targetGroupId === section.id && groupDropTarget()?.before"
                    [class.b-table__header-group-cell--drop-target-after]="groupDropTarget()?.targetGroupId === section.id && !groupDropTarget()?.before"
                    [attr.role]="'columnheader'"
                    [attr.aria-label]="section.label"
                    draggable="true"
                    (dragstart)="onGroupBarDragStart($event, section.id)"
                    (dragend)="onGroupBarDragEnd()"
                  >
                    <div class="b-table__header-group-edge b-table__header-group-edge--left" [class.b-table__header-group-edge--drop-target]="isUngroupEdgeDropTarget(section.id, 'left')" (dragover)="onGroupEdgeDragOver($event, section.id, 'left')" (drop)="onGroupEdgeDrop($event, section.id, 'left')"></div>
                    <div class="b-table__header-group-middle" (dragover)="onGroupMiddleDragOver($event, section.id)" (drop)="onGroupMiddleDrop($event, section.id)">
                      <span class="b-table__header-group-label">{{ section.label }}</span>
                    </div>
                    <div class="b-table__header-group-edge b-table__header-group-edge--right" [class.b-table__header-group-edge--drop-target]="isUngroupEdgeDropTarget(section.id, 'right')" (dragover)="onGroupEdgeDragOver($event, section.id, 'right')" (drop)="onGroupEdgeDrop($event, section.id, 'right')"></div>
                    @if (canResizeGroup(section)) {
                      <button
                        type="button"
                        class="b-table__header-group-resize-handle"
                        (mousedown)="onGroupResizeStart($event, section.id); $event.stopPropagation()"
                        (dragstart)="$event.preventDefault(); $event.stopPropagation()"
                        [attr.aria-label]="'Resize group ' + section.label"
                      ></button>
                    }
                  </div>
                  @for (column of section.columns; track column.id) {
                    @if (column.id === BRICK_SELECT_COLUMN_ID) {
                      <div class="b-table__select-cell b-table__header-select-cell" [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()" role="columnheader" [attr.data-column-id]="column.id" [style.width.px]="columnWidths()[column.id]" draggable="true" tabindex="0" (click)="$event.preventDefault(); $event.stopPropagation()" (contextmenu)="onHeaderContextMenu($event, column)" (dragstart)="headerDragStart.emit({ columnId: column.id, event: $event })" (dragover)="onHeaderDragOver($event, column.id)" (dragend)="onHeaderDragEnd()" (drop)="onHeaderDropInternal($event, column.id)">
                        @if (column.id !== draggingColumnId()) {
                        <input type="checkbox" [checked]="allVisibleSelected()" [indeterminate]="someVisibleSelected()" (change)="onSelectVisibleChange($event); $event.stopPropagation()" (click)="$event.stopPropagation()" aria-label="Select visible rows" />
                        }
                      </div>
                    } @else {
                      <div [class]="headerCellClass(column)" [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()" [class.b-table__header-cell--left-boundary]="column.id === lastLeftColumnId()" [class.b-table__header-cell--right-boundary]="column.id === firstRightColumnId()" role="columnheader" [attr.data-column-id]="column.id" [style.width.px]="columnWidths()[column.id]" [style.minWidth.px]="column.minWidth ?? 80" [style.maxWidth.px]="column.maxWidth ?? 600" [title]="column.tooltip ?? column.header" [attr.draggable]="column.suppressMove ? null : 'true'" tabindex="0" (click)="toggleSort.emit({ columnId: column.id, addToSort: $event.shiftKey })" (contextmenu)="onHeaderContextMenu($event, column)" (dragstart)="onHeaderDragStart($event, column)" (dragover)="onHeaderDragOver($event, column.id)" (dragend)="onHeaderDragEnd()" (drop)="onHeaderDropInternal($event, column.id)">
                        @if (column.id !== draggingColumnId()) {
                        <span>{{ resolveHeaderLabel(column) }}</span>
                        <span class="b-table__sort-indicator">{{ sortIndicator()(column.id) }}</span>
                        @if (column.resizable !== false) {
                          <button type="button" class="b-table__resize-handle" draggable="false" (dragstart)="$event.preventDefault(); $event.stopPropagation()" (mousedown)="resizeStart.emit({ columnId: column.id, event: $event }); $event.stopPropagation()" [attr.aria-label]="'Resize column ' + column.header"></button>
                        }
                        }
                      </div>
                    }
                  }
                </div>
              }
              @case ('ungrouped') {
                <div class="b-table__header-ungrouped" [style.grid-template-columns]="sectionGridColumns(section.columns)">
                  @for (column of section.columns; track column.id) {
                    @if (column.id === BRICK_SELECT_COLUMN_ID) {
                      <div class="b-table__select-cell b-table__header-select-cell" [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()" role="columnheader" [attr.data-column-id]="column.id" [style.width.px]="columnWidths()[column.id]" draggable="true" tabindex="0" (click)="$event.preventDefault(); $event.stopPropagation()" (contextmenu)="onHeaderContextMenu($event, column)" (dragstart)="headerDragStart.emit({ columnId: column.id, event: $event })" (dragover)="onHeaderDragOver($event, column.id)" (dragend)="onHeaderDragEnd()" (drop)="onHeaderDropInternal($event, column.id)">
                        @if (column.id !== draggingColumnId()) { <input type="checkbox" [checked]="allVisibleSelected()" [indeterminate]="someVisibleSelected()" (change)="onSelectVisibleChange($event); $event.stopPropagation()" (click)="$event.stopPropagation()" aria-label="Select visible rows" /> }
                      </div>
                    } @else {
                      <div [class]="headerCellClass(column)" [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()" [class.b-table__header-cell--left-boundary]="column.id === lastLeftColumnId()" [class.b-table__header-cell--right-boundary]="column.id === firstRightColumnId()" [class.b-table__header-cell--ungrouped-full-height]="(isUngroupedFullHeight(column) && column.id !== draggingColumnId()) || (column.id === draggingColumnId() && (dropTargetUngroupAtEdgeForSegments() || (!dropTargetGroupId() && !draggingColumnSourceGroupId())))" role="columnheader" [attr.data-column-id]="column.id" [style.width.px]="columnWidths()[column.id]" [style.minWidth.px]="column.minWidth ?? 80" [style.maxWidth.px]="column.maxWidth ?? 600" [title]="column.tooltip ?? column.header" [attr.draggable]="column.suppressMove ? null : 'true'" tabindex="0" (click)="toggleSort.emit({ columnId: column.id, addToSort: $event.shiftKey })" (contextmenu)="onHeaderContextMenu($event, column)" (dragstart)="onHeaderDragStart($event, column)" (dragover)="onHeaderDragOver($event, column.id)" (dragend)="onHeaderDragEnd()" (drop)="onHeaderDropInternal($event, column.id)">
                        @if (column.id !== draggingColumnId()) {
                        <span>{{ resolveHeaderLabel(column) }}</span>
                        <span class="b-table__sort-indicator">{{ sortIndicator()(column.id) }}</span>
                        @if (column.resizable !== false) {
                          <button type="button" class="b-table__resize-handle" draggable="false" (dragstart)="$event.preventDefault(); $event.stopPropagation()" (mousedown)="resizeStart.emit({ columnId: column.id, event: $event }); $event.stopPropagation()" [attr.aria-label]="'Resize column ' + column.header"></button>
                        }
                        }
                      </div>
                    }
                  }
                </div>
              }
              @case ('drag-gap') {
                <div
                  class="b-table__header-group-container b-table__header-group-cell--drag-gap"
                  style="width: 100%"
                  (dragover)="onDragGapDragOver($event)"
                  (drop)="onDragGapDrop($event)"
                >
                  <div
                    class="b-table__header-cell b-table__header-cell--drag-slot b-table__header-cell--drag-gap-full-height"
                    role="columnheader"
                    [attr.data-column-id]="draggingColumnId()"
                    style="width: 100%"
                  ></div>
                </div>
              }
              @case ('group-drag-gap') {
                <div
                  class="b-table__header-group-container b-table__header-group-cell--drag-gap b-table__header-group-cell--group-drag-gap"
                  style="width: 100%"
                  (dragover)="onGroupDragGapDragOver($event)"
                  (drop)="onGroupDragGapDrop($event, section.targetGroupId, section.before)"
                >
                  <div
                    class="b-table__header-cell b-table__header-cell--drag-gap-full-height"
                    role="columnheader"
                    style="width: 100%"
                    aria-label="Drop group here"
                  ></div>
                </div>
              }
            }
          </div>
        }
        @if (rightColumns().length > 0) {
          <div class="b-table__header-section b-table__header-section--right" [style.width.px]="sectionWidthPx({ type: 'ungrouped', columns: rightColumns() })">
            @for (column of rightColumns(); track column.id) {
              @if (column.id === BRICK_SELECT_COLUMN_ID) {
                <div class="b-table__select-cell b-table__header-select-cell" [class.b-table__select-cell--pinned-right]="true" [class.b-table__header-cell--left-boundary]="column.id === lastLeftColumnId()" [class.b-table__header-cell--right-boundary]="column.id === firstRightColumnId()" [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()" role="columnheader" [attr.data-column-id]="column.id" [style.width.px]="columnWidths()[column.id]" [style.right.px]="stickyRightPx()[column.id]" [style.position]="'sticky'" [style.zIndex]="9" draggable="true" tabindex="0" (click)="$event.preventDefault(); $event.stopPropagation()" (contextmenu)="onHeaderContextMenu($event, column)" (dragstart)="headerDragStart.emit({ columnId: column.id, event: $event })" (dragover)="onHeaderDragOver($event, column.id)" (dragend)="onHeaderDragEnd()" (drop)="onHeaderDropInternal($event, column.id)">
                  @if (column.id !== draggingColumnId()) {
                  <input type="checkbox" [checked]="allVisibleSelected()" [indeterminate]="someVisibleSelected()" (change)="onSelectVisibleChange($event); $event.stopPropagation()" (click)="$event.stopPropagation()" aria-label="Select visible rows" />
                  }
                </div>
              } @else {
                <div
                  [class]="headerCellClass(column)"
                  [class.b-table__header-cell--right-boundary]="column.id === firstRightColumnId()"
                  [class.b-table__header-cell--left-boundary]="column.id === lastLeftColumnId()"
                  [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()"
                  role="columnheader"
                  [attr.data-column-id]="column.id"
                  [style.width.px]="columnWidths()[column.id]"
                  [style.right.px]="stickyRightPx()[column.id]"
                  [style.position]="'sticky'"
                  [style.zIndex]="9"
                  [style.minWidth.px]="column.minWidth ?? 80"
                  [style.maxWidth.px]="column.maxWidth ?? 600"
                  [title]="column.tooltip ?? column.header"
                  [attr.draggable]="column.suppressMove ? null : 'true'"
                  tabindex="0"
                  (click)="toggleSort.emit({ columnId: column.id, addToSort: $event.shiftKey })"
                  (contextmenu)="onHeaderContextMenu($event, column)"
                  (dragstart)="onHeaderDragStart($event, column)"
                  (dragover)="onHeaderDragOver($event, column.id)"
                  (dragend)="onHeaderDragEnd()"
                  (drop)="onHeaderDropInternal($event, column.id)"
                >
                  @if (column.id !== draggingColumnId()) {
                  <span>{{ resolveHeaderLabel(column) }}</span>
                  <span class="b-table__sort-indicator">{{ sortIndicator()(column.id) }}</span>
                  @if (column.resizable !== false) {
                    <button type="button" class="b-table__resize-handle" draggable="false" (dragstart)="$event.preventDefault(); $event.stopPropagation()" (mousedown)="resizeStart.emit({ columnId: column.id, event: $event }); $event.stopPropagation()" [attr.aria-label]="'Resize column ' + column.header"></button>
                  }
                  }
                </div>
              }
            }
          </div>
        }
      </div>
    } @else {
      <div class="b-table__header-row" role="row">
        @for (column of columns(); track column.id) {
          @if (column.id === BRICK_SELECT_COLUMN_ID) {
            <div
              class="b-table__select-cell b-table__header-select-cell"
              [class.b-table__select-cell--pinned-left]="column.pinned === 'left'"
              [class.b-table__select-cell--pinned-right]="column.pinned === 'right'"
              [class.b-table__header-cell--left-boundary]="column.id === lastLeftColumnId()"
              [class.b-table__header-cell--right-boundary]="column.id === firstRightColumnId()"
              [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()"
              role="columnheader"
              [attr.data-column-id]="column.id"
              [style.position]="column.pinned ? 'sticky' : null"
              [style.zIndex]="column.pinned ? 9 : null"
              [style.width.px]="columnWidths()[column.id]"
              [style.left.px]="column.pinned === 'left' ? stickyLeftPx()[column.id] : null"
              [style.right.px]="column.pinned === 'right' ? stickyRightPx()[column.id] : null"
              draggable="true"
              tabindex="0"
              (click)="$event.preventDefault(); $event.stopPropagation()"
              (contextmenu)="onHeaderContextMenu($event, column)"
              (dragstart)="headerDragStart.emit({ columnId: column.id, event: $event })"
              (dragover)="onHeaderDragOver($event, column.id)"
              (dragend)="onHeaderDragEnd()"
              (drop)="onHeaderDropInternal($event, column.id)"
            >
              @if (column.id !== draggingColumnId()) {
              <input
                type="checkbox"
                [checked]="allVisibleSelected()"
                [indeterminate]="someVisibleSelected()"
                (change)="onSelectVisibleChange($event); $event.stopPropagation()"
                (click)="$event.stopPropagation()"
                aria-label="Select visible rows"
              />
              }
            </div>
          } @else {
            <div
              [class]="headerCellClass(column)"
              [class.b-table__header-cell--left-boundary]="column.id === lastLeftColumnId()"
              [class.b-table__header-cell--right-boundary]="column.id === firstRightColumnId()"
              [class.b-table__header-cell--drag-slot]="column.id === draggingColumnId()"
              [style.width.px]="columnWidths()[column.id]"
              [attr.data-column-id]="column.id"
              [style.left.px]="column.pinned === 'left' ? stickyLeftPx()[column.id] : null"
              [style.right.px]="column.pinned === 'right' ? stickyRightPx()[column.id] : null"
              [style.minWidth.px]="column.minWidth ?? 80"
              [style.maxWidth.px]="column.maxWidth ?? 600"
              [title]="column.tooltip ?? column.header"
              [attr.draggable]="column.suppressMove ? null : 'true'"
              role="columnheader"
              tabindex="0"
              (click)="toggleSort.emit({ columnId: column.id, addToSort: $event.shiftKey })"
              (contextmenu)="onHeaderContextMenu($event, column)"
              (dragstart)="onHeaderDragStart($event, column)"
              (dragover)="onHeaderDragOver($event, column.id)"
              (dragend)="onHeaderDragEnd()"
              (drop)="onHeaderDropInternal($event, column.id)"
            >
              @if (column.id !== draggingColumnId()) {
              <span>{{ resolveHeaderLabel(column) }}</span>
              <span class="b-table__sort-indicator">{{ sortIndicator()(column.id) }}</span>
              @if (column.resizable !== false) {
                <button
                  type="button"
                  class="b-table__resize-handle"
                  draggable="false"
                  (dragstart)="$event.preventDefault(); $event.stopPropagation()"
                  (mousedown)="resizeStart.emit({ columnId: column.id, event: $event }); $event.stopPropagation()"
                  [attr.aria-label]="'Resize column ' + column.header"
                ></button>
              }
              }
            </div>
          }
        }
      </div>
    }

    <div class="b-table__filter-row" role="row">
      @for (column of columns(); track column.id) {
        @if (column.id === BRICK_SELECT_COLUMN_ID) {
          <div
            class="b-table__select-cell b-table__select-cell--empty"
            [class.b-table__select-cell--pinned-left]="column.pinned === 'left'"
            [class.b-table__select-cell--pinned-right]="column.pinned === 'right'"
            [class.b-table__filter-cell--left-boundary]="column.id === lastLeftColumnId()"
            [class.b-table__filter-cell--right-boundary]="column.id === firstRightColumnId()"
            [class.b-table__filter-cell--drag-slot]="column.id === draggingColumnId()"
            role="gridcell"
            [attr.data-column-id]="column.id"
            [style.position]="column.pinned ? 'sticky' : null"
            [style.zIndex]="column.pinned ? 9 : null"
            [style.width.px]="columnWidths()[column.id]"
            [style.left.px]="column.pinned === 'left' ? stickyLeftPx()[column.id] : null"
            [style.right.px]="column.pinned === 'right' ? stickyRightPx()[column.id] : null"
          ></div>
        } @else {
        <div
          class="b-table__filter-cell"
          role="gridcell"
          [class.b-table__filter-cell--pinned-left]="column.pinned === 'left'"
          [class.b-table__filter-cell--pinned-right]="column.pinned === 'right'"
          [class.b-table__filter-cell--left-boundary]="column.id === lastLeftColumnId()"
          [class.b-table__filter-cell--right-boundary]="column.id === firstRightColumnId()"
          [class.b-table__filter-cell--drag-slot]="column.id === draggingColumnId()"
          [attr.data-column-id]="column.id"
          [style.width.px]="columnWidths()[column.id]"
          [style.left.px]="column.pinned === 'left' ? stickyLeftPx()[column.id] : null"
          [style.right.px]="column.pinned === 'right' ? stickyRightPx()[column.id] : null"
          [style.minWidth.px]="column.minWidth ?? 80"
          [style.maxWidth.px]="column.maxWidth ?? 600"
        >
          @if (column.filterable !== false && column.id !== draggingColumnId()) {
            @if (resolveFilterType(column) === 'number') {
              <div class="b-table__filter-range">
                <input
                  type="number"
                  class="b-table__filter-input"
                  [attr.aria-label]="'Min filter for ' + column.header"
                  [value]="numberFilterMin(column.id)"
                  placeholder="Min"
                  (input)="setNumberFilter(column.id, 'min', $event)"
                />
                <input
                  type="number"
                  class="b-table__filter-input"
                  [attr.aria-label]="'Max filter for ' + column.header"
                  [value]="numberFilterMax(column.id)"
                  placeholder="Max"
                  (input)="setNumberFilter(column.id, 'max', $event)"
                />
              </div>
            } @else if (resolveFilterType(column) === 'date') {
              <div class="b-table__filter-range">
                <input
                  type="date"
                  class="b-table__filter-input"
                  [attr.aria-label]="'Start date filter for ' + column.header"
                  [value]="dateFilterStart(column.id)"
                  (input)="setDateFilter(column.id, 'start', $event)"
                />
                <input
                  type="date"
                  class="b-table__filter-input"
                  [attr.aria-label]="'End date filter for ' + column.header"
                  [value]="dateFilterEnd(column.id)"
                  (input)="setDateFilter(column.id, 'end', $event)"
                />
              </div>
            } @else {
              <input
                type="text"
                class="b-table__filter-input"
                [attr.aria-label]="'Filter for ' + column.header"
                [value]="textFilter(column.id)"
                placeholder="Filter"
                (input)="setTextFilter(column.id, $event)"
              />
            }
          }
        </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickTableHeaderComponent<T extends BrickRowData = BrickRowData> {
  protected readonly BRICK_SELECT_COLUMN_ID = BRICK_SELECT_COLUMN_ID;
  readonly columns = input<readonly BrickTableColumnDef<T>[]>([]);
  readonly columnWidths = input<Record<string, number>>({});
  /** Cumulative left offset (px) per column id for left-pinned sticky positioning. */
  readonly stickyLeftPx = input<Record<string, number>>({});
  readonly stickyRightPx = input<Record<string, number>>({});
  readonly lastLeftColumnId = input<string | null>(null);
  readonly firstRightColumnId = input<string | null>(null);
  readonly allVisibleSelected = input(false);
  readonly someVisibleSelected = input(false);
  readonly sortIndicator = input<(columnId: string) => string>(() => '');
  readonly filters = input<Record<string, BrickFilterValue>>({});
  readonly draggingColumnId = input<string | null>(null);
  readonly headerGroups = input<readonly BrickHeaderGroupDef[]>([]);
  /** Total width of left-pinned columns so header groups can align with center pane. */
  readonly leftPinnedWidth = input(0);
  /** Total width of right-pinned columns so header groups can align with center pane. */
  readonly rightPinnedWidth = input(0);
  /** Total width of center columns so header groups scroll in sync with center pane. */
  readonly centerTotalWidth = input(0);
  /** Current horizontal scroll of center pane. */
  readonly centerScrollLeft = input(0);

  readonly toggleSelectVisibleRows = output<boolean>();
  readonly toggleSort = output<{ columnId: string; addToSort: boolean }>();
  readonly headerDragStart = output<{ columnId: string; event: DragEvent }>();
  readonly headerDrop = output<string>();
  /** Emits current drop target during drag so parent can show preview order; null when drag ends. ungroupAtEdge = drop on 5px edge = place ungrouped. */
  readonly headerDragTarget = output<BrickHeaderDragTarget | null>();
  /** Emits when a header drag ends without drop (e.g. cancel or drag outside). */
  readonly headerDragEnd = output<void>();
  readonly resizeStart = output<{ columnId: string; event: MouseEvent }>();
  /** Emitted when the user starts resizing a header group (mousedown on group resize handle). Parent should run group resize and distribute width to columns. */
  readonly groupResizeStart = output<{ groupId: string; event: MouseEvent }>();
  /** Emitted when the user starts dragging a header group bar. */
  readonly groupDragStart = output<{ groupId: string; event: DragEvent }>();
  /** Emitted during group drag when over another group bar (where the group would drop). */
  readonly groupDragTarget = output<BrickHeaderGroupDragTarget | null>();
  /** Emitted when a group is dropped on a target group (reorder). */
  readonly groupDrop = output<BrickHeaderGroupDragTarget>();
  /** Emitted when a group drag ends (cancel or drop). */
  readonly groupDragEnd = output<void>();
  readonly headerContextMenu = output<{ columnId: string; x: number; y: number }>();
  readonly textFilterChange = output<{ columnId: string; value: string }>();
  readonly numberFilterChange = output<{ columnId: string; edge: 'min' | 'max'; value?: number }>();
  readonly dateFilterChange = output<{ columnId: string; edge: 'start' | 'end'; value?: string }>();

  protected headerCellClass(column: BrickTableColumnDef<T>): string {
    return [
      'flex items-center gap-1.5 px-2 py-1.5',
      tableHeaderCellVariants({
        sortable: column.sortable !== false,
        pinned: toPinVariant(column.pinned),
      }),
    ].join(' ');
  }

  protected resolveHeaderLabel(column: BrickTableColumnDef<T>): string {
    return column.headerRenderer ? column.headerRenderer(column) : column.header;
  }

  /** True when column has no group and groups exist: render as full-height cell spanning group + header row. */
  protected isUngroupedFullHeight(column: BrickTableColumnDef<T>): boolean {
    if (this.headerGroups().length === 0 || column.pinned) {
      return false;
    }
    const id = column.headerGroupId;
    return id == null || id === '';
  }

  /** During drag, the column under the cursor (drop target) – used to highlight that group. */
  readonly dropTargetColumnId = input<string | null>(null);
  /** Whether the drop would be before the target column (true = before, false = after). */
  readonly dropTargetBefore = input<boolean>(true);
  /** Group id of the drop target column (from parent table). */
  readonly dropTargetGroupId = input<string | null>(null);
  /** True when drop would be on the 5px edge zone (drop = place column ungrouped next to that edge). */
  readonly dropTargetUngroupAtEdge = input<boolean>(false);
  /** Raw ungroup-at-edge from hint (for segment computation: hide group name above placeholder when over ungroup edge). */
  readonly dropTargetUngroupAtEdgeForSegments = input<boolean>(false);
  /** Dragged column's original header group so we can avoid showing a gap when reordering within the same group. */
  readonly draggingColumnOriginalGroupId = input<string | null>(null);
  /** Dragged column's group from def/override so the group band keeps full width when drop target is null. */
  readonly draggingColumnSourceGroupId = input<string | null>(null);
  /** During group drag: which group is being dragged. */
  readonly draggingGroupId = input<string | null>(null);
  /** During group drag: where the group would drop (for drop indicator). */
  readonly groupDropTarget = input<BrickHeaderGroupDragTarget | null>(null);
  /** When set, insert a group-drag-gap placeholder section at this position (same UX as column drag-gap). */
  readonly groupDragPlaceholder = input<{ width: number; targetGroupId: string; before: boolean } | null>(null);

  protected computedHeaderGroups(): readonly { id: string; label: string; width: number; columnStart: number; columnSpan: number }[] {
    const centerColumns = this.columns().filter((c) => !c.pinned);
    const widths = this.columnWidths();
    const groups = this.headerGroups();
    const getWidth = (columnId: string) => {
      const col = this.columns().find((c) => c.id === columnId);
      return widths[columnId] ?? col?.width ?? 160;
    };
    return computeHeaderGroupSegments(
      centerColumns,
      getWidth,
      groups,
      this.centerTotalWidth(),
      {
        draggingColumnId: this.draggingColumnId(),
        dropTargetColumnId: this.dropTargetColumnId(),
        draggingOriginalGroupId: this.draggingColumnOriginalGroupId(),
        dropGroupId: this.dropTargetGroupId(),
        draggingColumnSourceGroupId: this.draggingColumnSourceGroupId(),
        dropTargetUngroupAtEdge: this.dropTargetUngroupAtEdgeForSegments(),
      },
    );
  }

  /** Center columns only (no pinned) for grid layout. */
  protected readonly centerColumns = computed(() => this.columns().filter((c) => !c.pinned));

  /** 1-based grid column where center starts (after left-pinned). */
  protected readonly centerColumnStart = computed(() =>
    this.columns().filter((c) => c.pinned === 'left').length + 1,
  );

  /** grid-template-columns string for the merged header grid (all columns). */
  protected readonly headerGridTemplateColumns = computed(() => {
    const cols = this.columns();
    const w = this.columnWidths();
    return cols.map((c) => `${w[c.id] ?? c.width ?? 160}px`).join(' ');
  });

  /** Left-pinned columns only (for nested section DOM). */
  protected readonly leftColumns = computed(() =>
    this.columns().filter((c) => c.pinned === 'left'),
  );

  /** Right-pinned columns only (for nested section DOM). */
  protected readonly rightColumns = computed(() =>
    this.columns().filter((c) => c.pinned === 'right'),
  );

  /**
   * Center header sections: group (with columns), ungrouped (columns), drag-gap, or group-drag-gap.
   * Resolves segment descriptors to full column defs for the nested template.
   */
  protected readonly centerHeaderSections = computed(() => {
    const centerCols = this.centerColumns();
    const segments = this.computedHeaderGroups();
    const descriptors = computeHeaderSectionDescriptors(centerCols, segments);
    const colById = new Map(centerCols.map((c) => [c.id, c]));
    return descriptors.map((d) => {
      if (d.type === 'group') {
        return {
          type: 'group' as const,
          id: d.id,
          label: d.label,
          columnStart: d.columnStart,
          columnSpan: d.columnSpan,
          columns: d.columnIds.map((id) => colById.get(id)!).filter(Boolean),
        };
      }
      if (d.type === 'ungrouped') {
        return {
          type: 'ungrouped' as const,
          columnStart: d.columnStart,
          columnSpan: d.columnSpan,
          columns: d.columnIds.map((id) => colById.get(id)!).filter(Boolean),
        };
      }
      return {
        type: 'drag-gap' as const,
        columnStart: d.columnStart,
        columnSpan: d.columnSpan,
        width: d.width,
      };
    });
  });

  /** Center sections with group-drag placeholder inserted when dragging a group (same UX as column drag-gap). */
  protected readonly centerHeaderSectionsWithGroupPlaceholder = computed(() => {
    const sections = this.centerHeaderSections();
    const placeholder = this.groupDragPlaceholder();
    if (!placeholder) return sections;
    const idx = sections.findIndex(
      (s) => s.type === 'group' && s.id === placeholder.targetGroupId,
    );
    if (idx === -1) return sections;
    const gap: {
      type: 'group-drag-gap';
      width: number;
      targetGroupId: string;
      before: boolean;
    } = {
      type: 'group-drag-gap',
      width: placeholder.width,
      targetGroupId: placeholder.targetGroupId,
      before: placeholder.before,
    };
    const insertAt = placeholder.before ? idx : idx + 1;
    return [...sections.slice(0, insertAt), gap, ...sections.slice(insertAt)];
  });

  /** Width in px for a section (sum of column widths or single width for drag-gap / group-drag-gap). */
  protected sectionWidthPx(
    section:
      | { type: 'group'; columns: BrickTableColumnDef<T>[] }
      | { type: 'ungrouped'; columns: BrickTableColumnDef<T>[] }
      | { type: 'drag-gap'; width: number }
      | { type: 'group-drag-gap'; width: number; targetGroupId: string; before: boolean },
  ): number {
    if (section.type === 'drag-gap') {
      const id = this.draggingColumnId();
      if (id) {
        const w = this.columnWidths();
        const col = this.columns().find((c) => c.id === id);
        return w[id] ?? col?.width ?? 160;
      }
      return section.width;
    }
    if (section.type === 'group-drag-gap') return section.width;
    const w = this.columnWidths();
    return section.columns.reduce(
      (sum, c) => sum + (w[c.id] ?? c.width ?? 160),
      0,
    );
  }

  /** Track by for center header sections (including group-drag-gap). */
  protected sectionTrack(
    section:
      | { type: 'group'; id: string }
      | { type: 'ungrouped'; columnStart: number }
      | { type: 'drag-gap'; columnStart: number }
      | { type: 'group-drag-gap'; targetGroupId: string; before: boolean },
  ): string {
    if (section.type === 'group') return section.id;
    if (section.type === 'ungrouped') return 'ungrouped-' + section.columnStart;
    if (section.type === 'drag-gap') return 'drag-gap-' + section.columnStart;
    return `group-drag-gap-${section.targetGroupId}-${section.before}`;
  }

  /** grid-template-columns string for a section that has columns (group or ungrouped). */
  protected sectionGridColumns(columns: BrickTableColumnDef<T>[]): string {
    const w = this.columnWidths();
    return columns.map((c) => `${w[c.id] ?? c.width ?? 160}px`).join(' ');
  }

  /** True when the group has at least one resizable column (so we show the group resize handle). */
  protected canResizeGroup(section: { columns: BrickTableColumnDef<T>[] }): boolean {
    return section.columns.length > 0 && section.columns.some((c) => c.resizable !== false);
  }

  protected onGroupResizeStart(event: MouseEvent, groupId: string): void {
    event.preventDefault();
    this.groupResizeStart.emit({ groupId, event });
  }

  protected onHeaderContextMenu(event: MouseEvent, column: BrickTableColumnDef<T>): void {
    event.preventDefault();
    event.stopPropagation();
    this.headerContextMenu.emit({ columnId: column.id, x: event.clientX, y: event.clientY });
  }

  protected onHeaderDragStart(event: DragEvent, column: BrickTableColumnDef<T>): void {
    if (column.suppressMove) {
      event.preventDefault();
      return;
    }
    this.headerDragStart.emit({ columnId: column.id, event });
  }

  protected onHeaderDragOver(event: DragEvent, targetColumnId: string): void {
    event.preventDefault();
    const draggingId = this.draggingColumnId();
    if (!draggingId) {
      this.clearDragPlaceholder();
      return;
    }
    // When hovering over the drag-slot itself, keep the previous target so the placeholder
    // does not jitter back and forth as columns reorder.
    if (targetColumnId === draggingId) {
      return;
    }
    const element = event.currentTarget as HTMLElement | null;
    if (!element) {
      this.clearDragPlaceholder();
      return;
    }
    const rect = element.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const before = offsetX < rect.width / 2;
    this.headerDragTarget.emit({ targetColumnId, before, ungroupAtEdge: false });
  }

  protected onHeaderDragEnd(): void {
    this.clearDragPlaceholder();
    this.headerDragEnd.emit();
  }

  protected onHeaderDropInternal(event: DragEvent, targetColumnId: string): void {
    event.stopPropagation();
    this.headerDrop.emit(targetColumnId);
    this.clearDragPlaceholder();
  }

  /** When drop happens on the drag-gap placeholder (e.g. over ungrouped section), complete the drop using current target. */
  protected onDragGapDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  protected onDragGapDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const targetId = this.dropTargetColumnId();
    if (targetId) {
      this.headerDrop.emit(targetId);
    }
    this.clearDragPlaceholder();
  }

  /** Catch-all: allow drop over the whole header and complete drop using current hint when drop lands on container (e.g. gap band or after layout shift). */
  protected onHeaderContainerDragOver(event: DragEvent): void {
    if (this.draggingGroupId()) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      return;
    }
    if (!this.draggingColumnId()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  protected onHeaderContainerDrop(event: DragEvent): void {
    if (this.draggingGroupId()) {
      event.preventDefault();
      return;
    }
    if (!this.draggingColumnId()) return;
    event.preventDefault();
    const targetId = this.dropTargetColumnId();
    if (targetId) {
      this.headerDrop.emit(targetId);
    }
    this.clearDragPlaceholder();
  }

  /** First center column id in the given group (display order). */
  protected getFirstColumnIdInGroup(groupId: string): string | null {
    const center = this.columns().filter((c) => !c.pinned);
    const inGroup = center.filter((c) => c.headerGroupId === groupId);
    return inGroup.length > 0 ? inGroup[0].id : null;
  }

  /** Last center column id in the given group (display order). */
  protected getLastColumnIdInGroup(groupId: string): string | null {
    const center = this.columns().filter((c) => !c.pinned);
    const inGroup = center.filter((c) => c.headerGroupId === groupId);
    return inGroup.length > 0 ? inGroup[inGroup.length - 1].id : null;
  }

  /** True when this group's left or right edge is the current ungroup drop target. */
  protected isUngroupEdgeDropTarget(groupId: string, edge: 'left' | 'right'): boolean {
    if (!this.dropTargetUngroupAtEdge() || this.dropTargetGroupId() !== groupId) return false;
    const before = this.dropTargetBefore();
    return edge === 'left' ? before : !before;
  }

  protected onGroupBarDragStart(event: DragEvent, groupId: string): void {
    event.stopPropagation();
    this.groupDragStart.emit({ groupId, event });
  }

  protected onGroupBarDragEnd(): void {
    this.groupDragEnd.emit();
  }

  protected onGroupDragGapDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  protected onGroupDragGapDrop(event: DragEvent, targetGroupId: string, before: boolean): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.draggingGroupId() && this.draggingGroupId() !== targetGroupId) {
      this.groupDrop.emit({ targetGroupId, before });
    }
  }

  protected onGroupEdgeDragOver(event: DragEvent, groupId: string, edge: 'left' | 'right'): void {
    if (this.draggingGroupId() && this.draggingGroupId() !== groupId) {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      this.groupDragTarget.emit({ targetGroupId: groupId, before: edge === 'left' });
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const draggingId = this.draggingColumnId();
    if (!draggingId) return;
    const firstId = this.getFirstColumnIdInGroup(groupId);
    const lastId = this.getLastColumnIdInGroup(groupId);
    const sameGroup = this.draggingColumnOriginalGroupId() === groupId;
    if (edge === 'left' && firstId) {
      this.headerDragTarget.emit({ targetColumnId: firstId, before: true, ungroupAtEdge: !sameGroup });
    } else if (edge === 'right' && lastId) {
      this.headerDragTarget.emit({ targetColumnId: lastId, before: false, ungroupAtEdge: !sameGroup });
    }
  }

  protected onGroupEdgeDrop(event: DragEvent, groupId: string, edge: 'left' | 'right'): void {
    if (this.draggingGroupId()) {
      event.preventDefault();
      event.stopPropagation();
      if (this.draggingGroupId() !== groupId) {
        this.groupDrop.emit({ targetGroupId: groupId, before: edge === 'left' });
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const firstId = this.getFirstColumnIdInGroup(groupId);
    const lastId = this.getLastColumnIdInGroup(groupId);
    if (edge === 'left' && firstId) {
      this.headerDrop.emit(firstId);
    } else if (edge === 'right' && lastId) {
      this.headerDrop.emit(lastId);
    }
    this.clearDragPlaceholder();
  }

  protected onGroupMiddleDragOver(event: DragEvent, groupId: string): void {
    if (this.draggingGroupId() && this.draggingGroupId() !== groupId) {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      const el = event.currentTarget as HTMLElement | null;
      const rect = el?.getBoundingClientRect();
      const before = rect ? event.clientX - rect.left < rect.width / 2 : true;
      this.groupDragTarget.emit({ targetGroupId: groupId, before });
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const draggingId = this.draggingColumnId();
    if (!draggingId) return;
    const lastId = this.getLastColumnIdInGroup(groupId);
    if (lastId && lastId !== draggingId) {
      this.headerDragTarget.emit({ targetColumnId: lastId, before: false, ungroupAtEdge: false });
    }
  }

  protected onGroupMiddleDrop(event: DragEvent, groupId: string): void {
    if (this.draggingGroupId()) {
      event.preventDefault();
      event.stopPropagation();
      if (this.draggingGroupId() !== groupId) {
        const el = event.currentTarget as HTMLElement | null;
        const rect = el?.getBoundingClientRect();
        const before = rect ? event.clientX - rect.left < rect.width / 2 : true;
        this.groupDrop.emit({ targetGroupId: groupId, before });
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const lastId = this.getLastColumnIdInGroup(groupId);
    if (lastId) {
      this.headerDrop.emit(lastId);
    }
    this.clearDragPlaceholder();
  }

  private clearDragPlaceholder(): void {
    this.headerDragTarget.emit(null);
  }

  protected onSelectVisibleChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.toggleSelectVisibleRows.emit(checked);
  }

  protected resolveFilterType(column: BrickTableColumnDef<T>): 'text' | 'number' | 'date' {
    return engineResolveFilterType(column);
  }

  protected textFilter(columnId: string): string {
    const value = this.filters()[columnId];
    return value?.type === 'text' ? value.value : '';
  }

  protected numberFilterMin(columnId: string): string {
    const value = this.filters()[columnId];
    return value?.type === 'number' && value.min !== undefined ? String(value.min) : '';
  }

  protected numberFilterMax(columnId: string): string {
    const value = this.filters()[columnId];
    return value?.type === 'number' && value.max !== undefined ? String(value.max) : '';
  }

  protected dateFilterStart(columnId: string): string {
    const value = this.filters()[columnId];
    return value?.type === 'date' ? value.start ?? '' : '';
  }

  protected dateFilterEnd(columnId: string): string {
    const value = this.filters()[columnId];
    return value?.type === 'date' ? value.end ?? '' : '';
  }

  protected setTextFilter(columnId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.textFilterChange.emit({ columnId, value });
  }

  protected setNumberFilter(columnId: string, edge: 'min' | 'max', event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.numberFilterChange.emit({
      columnId,
      edge,
      value: Number.isFinite(value) ? value : undefined,
    });
  }

  protected setDateFilter(columnId: string, edge: 'start' | 'end', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dateFilterChange.emit({
      columnId,
      edge,
      value: value || undefined,
    });
  }
}
