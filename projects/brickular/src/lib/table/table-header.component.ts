import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BRICK_SELECT_COLUMN_ID,
  BrickFilterValue,
  BrickHeaderGroupDef,
  BrickRowData,
  BrickTableColumnDef,
} from './table-types';
import { computeHeaderGroupSegments } from './table-header-groups';
import { resolveFilterType as engineResolveFilterType } from './table-engine';
import { tableHeaderCellVariants, toPinVariant } from './table-variants';

@Component({
  selector: 'b-table-header',
  imports: [CommonModule],
  template: `
    @if (headerGroups().length > 0 && computedHeaderGroups().length > 0) {
      <div
        class="b-table__header-merged"
        role="rowgroup"
        aria-label="Column groups and headers"
        [style.grid-template-columns]="headerGridTemplateColumns()"
      >
        @for (group of computedHeaderGroups(); track group.id) {
          <div
            class="b-table__header-group-cell"
            [class.b-table__header-group-cell--drag-gap]="group.id === '__drag-gap'"
            [class.b-table__header-group-cell--drop-target]="group.id !== '__drag-gap' && group.id === dropTargetGroupId()"
            [style.grid-column]="(centerColumnStart() + group.columnStart) + ' / span ' + group.columnSpan"
            [style.grid-row]="'1'"
            [attr.role]="group.id === '__drag-gap' ? null : 'columnheader'"
            [attr.aria-label]="group.id === '__drag-gap' ? null : group.label"
            [attr.aria-hidden]="group.id === '__drag-gap' ? true : null"
          >
            @if (group.id !== '__drag-gap') {
              {{ group.label }}
            }
          </div>
        }
        @for (column of columns(); track column.id; let colIndex = $index) {
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
              [style.grid-column]="(colIndex + 1) + ' / span 1'"
              [style.grid-row]="'2'"
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
              (drop)="onHeaderDropInternal(column.id)"
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
              [class.b-table__header-cell--ungrouped-full-height]="isUngroupedFullHeight(column)"
              [style.grid-column]="(colIndex + 1) + ' / span 1'"
              [style.grid-row]="isUngroupedFullHeight(column) ? '1 / -1' : '2'"
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
              (drop)="onHeaderDropInternal(column.id)"
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
              (drop)="onHeaderDropInternal(column.id)"
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
              (drop)="onHeaderDropInternal(column.id)"
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
  /** Emits current drop target during drag so parent can show preview order; null when drag ends. */
  readonly headerDragTarget = output<{ targetColumnId: string; before: boolean } | null>();
  /** Emits when a header drag ends without drop (e.g. cancel or drag outside). */
  readonly headerDragEnd = output<void>();
  readonly resizeStart = output<{ columnId: string; event: MouseEvent }>();
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
  /** Dragged column's original header group so we can avoid showing a gap when reordering within the same group. */
  readonly draggingColumnOriginalGroupId = input<string | null>(null);

  protected readonly dropTargetGroupId = computed(() => {
    const id = this.dropTargetColumnId();
    if (!id) return null;
    const col = this.columns().find((c) => c.id === id);
    return col?.headerGroupId ?? null;
  });

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
    this.headerDragTarget.emit({ targetColumnId, before });
  }

  protected onHeaderDragEnd(): void {
    this.clearDragPlaceholder();
    this.headerDragEnd.emit();
  }

  protected onHeaderDropInternal(targetColumnId: string): void {
    this.headerDrop.emit(targetColumnId);
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
