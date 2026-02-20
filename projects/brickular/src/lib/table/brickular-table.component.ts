import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrickTableHeaderComponent } from './table-header.component';
import { BrickTableRowComponent } from './table-row.component';
import { BrickTableToolbarComponent } from './table-toolbar.component';
import { BrickTableFooterComponent } from './table-footer.component';
import {
  BRICK_SELECT_COLUMN_ID,
  BrickColumnGroupChange,
  BrickColumnPin,
  BrickCellEditEvent,
  BrickFilterValue,
  BrickHeaderGroupDef,
  BrickRowData,
  BrickSelectionMode,
  BrickSelectionChange,
  BrickSortState,
  BrickTableColumnDef,
  BrickTablePageState,
  BrickTableRow,
} from './table-types';
import {
  createRows,
  filterRows,
  nextSortDirection,
  paginateRows,
  resolveRenderedColumns,
  sortRows,
  visibleRange as engineVisibleRange,
} from './table-engine';
import { ColumnReorderAnimator } from './column-reorder-animator';

@Component({
  selector: 'b-table',
  imports: [
    CommonModule,
    BrickTableToolbarComponent,
    BrickTableHeaderComponent,
    BrickTableRowComponent,
    BrickTableFooterComponent,
  ],
  template: `
    <section class="b-table space-y-3" role="region" aria-label="Brickular data table">
      <b-table-toolbar
        [quickFilter]="quickFilter()"
        [quickFilterPlaceholder]="quickFilterPlaceholder()"
        [paginationEnabled]="paginationEnabled()"
        [pageSize]="pageSize()"
        [pageSizeOptions]="pageSizeOptions()"
        (quickFilterChange)="onQuickFilterChange($event)"
        (pageSizeChange)="onPageSizeChange($event)"
      />

      <div
        #scrollShell
        class="b-table__scroll-shell"
        [class.b-table--vertical-borders]="showVerticalBorders()"
        [class.b-table--auto-header-height]="autoHeaderHeight()"
        role="grid"
        [attr.aria-rowcount]="filteredRows().length"
      >
        <div class="b-table__head-row">
          <div #headScroller class="b-table__head-scroller" (wheel)="onHeaderWheel($event)">
            <b-table-header
              [columns]="headerColumnsWithGroupOverrides()"
              [columnWidths]="resolvedColumnWidths()"
              [stickyLeftPx]="stickyLeftPx()"
              [stickyRightPx]="stickyRightPx()"
              [leftPinnedWidth]="leftPaneWidth()"
              [rightPinnedWidth]="rightPaneWidth()"
              [centerTotalWidth]="centerColumnsTotalWidth()"
              [centerScrollLeft]="centerScrollLeft()"
              [lastLeftColumnId]="lastLeftColumnId()"
              [firstRightColumnId]="firstRightColumnId()"
              [allVisibleSelected]="allVisibleSelected()"
              [someVisibleSelected]="someVisibleSelected()"
              [sortIndicator]="sortIndicatorForHeader"
              [filters]="filters()"
              [draggingColumnId]="dragColumnId()"
              [headerGroups]="headerGroups()"
              [dropTargetColumnId]="dropTargetColumnIdForHeader()"
              [draggingColumnOriginalGroupId]="draggingColumnOriginalGroupId()"
              (toggleSelectVisibleRows)="toggleSelectVisibleRows($event)"
              (toggleSort)="toggleSortById($event.columnId, $event.addToSort)"
              (headerDragStart)="onHeaderDragStart($event.columnId, $event.event)"
              (headerDrop)="onHeaderDrop($event)"
              (headerDragTarget)="onHeaderDragTarget($event)"
              (headerDragEnd)="onHeaderDragEnd()"
              (resizeStart)="startResizeById($event.columnId, $event.event)"
              (headerContextMenu)="openHeaderContextMenu($event.columnId, $event.x, $event.y)"
              (textFilterChange)="setTextFilter($event.columnId, $event.value)"
              (numberFilterChange)="setNumberFilter($event.columnId, $event.edge, $event.value)"
              (dateFilterChange)="setDateFilter($event.columnId, $event.edge, $event.value)"
            />
          </div>
          <div class="b-table__scrollbar-v-corner" aria-hidden="true"></div>
        </div>

        <div class="b-table__body" [style.--b-row-height.px]="rowHeight()">
          <div class="b-table__body-row">
            <div
              #bodyContent
              class="b-table__grid-area"
              (wheel)="onGridWheel($event)"
            >
              <!-- Row window: inner offset so visible rows are positioned correctly (no clipping of last rows) -->
              <div
                class="b-table__row-window"
                [style.height.px]="viewportHeight()"
              >
                <div
                  class="b-table__row-window-inner"
                  [style.height.px]="visibleRows().length * rowHeight()"
                  [style.transform]="'translateY(' + ((visibleRange().start * rowHeight()) - scrollTop()) + 'px)'"
                >
                @if (leftColumns().length > 0) {
                  <div
                    class="b-table__pane b-table__pane--left"
                    [style.width.px]="leftPaneWidth()"
                  >
                    @for (row of visibleRows(); track row.sourceIndex; let visibleRowIndex = $index) {
                      <b-table-row
                        [row]="row"
                        [visibleRowIndex]="visibleRowIndex"
                        [pagedRowIndex]="visibleRange().start + visibleRowIndex"
                        [columnIndexOffset]="0"
                        [isRowHovered]="hoveredVisibleRowIndex() === visibleRowIndex"
                        [columns]="leftColumns()"
                        [panePosition]="'left'"
                        [columnWidths]="resolvedColumnWidths()"
                        [stickyLeftPx]="stickyLeftPx()"
                        [stickyRightPx]="stickyRightPx()"
                        [selectedIndices]="selectedIndices()"
                        [editingCell]="editingCell()"
                        [activeCell]="activeCell()"
                        [dragColumnId]="dragColumnId()"
                        (toggleSelection)="toggleRowSelection($event.rowIndex, $event.shiftKey)"
                        (startEdit)="startEdit($event.rowIndex, $event.columnId)"
                        (commitCellEdit)="commitEdit($event.row, $event.rowIndex, $event.columnId, $event.nextValue)"
                        (cancelEdit)="cancelEdit()"
                        (cellFocus)="setActiveCell($event.pagedRowIndex, $event.columnIndex)"
                        (cellKeydown)="onCellKeydown($event)"
                        (rowMouseEnter)="onRowMouseEnter(visibleRowIndex)"
                        (rowMouseLeave)="onRowMouseLeave()"
                      />
                    }
                  </div>
                }
                <div
                  class="b-table__pane b-table__pane--center"
                  [style.width.px]="centerPaneWidth()"
                >
                  <!-- Center only: horizontal offset via translateX (scrollbar drives centerScrollLeft) -->
                  <div
                    class="b-table__center-offset"
                    [style.min-width.px]="centerColumnsTotalWidth()"
                    [style.transform]="'translateX(' + (-centerScrollLeft()) + 'px)'"
                  >
                    @for (row of visibleRows(); track row.sourceIndex; let visibleRowIndex = $index) {
                      <b-table-row
                        [row]="row"
                        [visibleRowIndex]="visibleRowIndex"
                        [pagedRowIndex]="visibleRange().start + visibleRowIndex"
                        [columnIndexOffset]="leftColumns().length"
                        [isRowHovered]="hoveredVisibleRowIndex() === visibleRowIndex"
                        [columns]="centerColumns()"
                        [panePosition]="'center'"
                        [columnWidths]="resolvedColumnWidths()"
                        [stickyLeftPx]="stickyLeftPx()"
                        [stickyRightPx]="stickyRightPx()"
                        [selectedIndices]="selectedIndices()"
                        [editingCell]="editingCell()"
                        [activeCell]="activeCell()"
                        [dragColumnId]="dragColumnId()"
                        (toggleSelection)="toggleRowSelection($event.rowIndex, $event.shiftKey)"
                        (startEdit)="startEdit($event.rowIndex, $event.columnId)"
                        (commitCellEdit)="commitEdit($event.row, $event.rowIndex, $event.columnId, $event.nextValue)"
                        (cancelEdit)="cancelEdit()"
                        (cellFocus)="setActiveCell($event.pagedRowIndex, $event.columnIndex)"
                        (cellKeydown)="onCellKeydown($event)"
                        (rowMouseEnter)="onRowMouseEnter(visibleRowIndex)"
                        (rowMouseLeave)="onRowMouseLeave()"
                      />
                    }
                  </div>
                </div>
                @if (rightColumns().length > 0) {
                  <div
                    class="b-table__pane b-table__pane--right"
                    [style.width.px]="rightPaneWidth()"
                  >
                    @for (row of visibleRows(); track row.sourceIndex; let visibleRowIndex = $index) {
                      <b-table-row
                        [row]="row"
                        [visibleRowIndex]="visibleRowIndex"
                        [pagedRowIndex]="visibleRange().start + visibleRowIndex"
                        [columnIndexOffset]="leftColumns().length + centerColumns().length"
                        [isRowHovered]="hoveredVisibleRowIndex() === visibleRowIndex"
                        [columns]="rightColumns()"
                        [panePosition]="'right'"
                        [columnWidths]="resolvedColumnWidths()"
                        [stickyLeftPx]="stickyLeftPx()"
                        [stickyRightPx]="stickyRightPx()"
                        [selectedIndices]="selectedIndices()"
                        [editingCell]="editingCell()"
                        [activeCell]="activeCell()"
                        [dragColumnId]="dragColumnId()"
                        (toggleSelection)="toggleRowSelection($event.rowIndex, $event.shiftKey)"
                        (startEdit)="startEdit($event.rowIndex, $event.columnId)"
                        (commitCellEdit)="commitEdit($event.row, $event.rowIndex, $event.columnId, $event.nextValue)"
                        (cancelEdit)="cancelEdit()"
                        (cellFocus)="setActiveCell($event.pagedRowIndex, $event.columnIndex)"
                        (cellKeydown)="onCellKeydown($event)"
                        (rowMouseEnter)="onRowMouseEnter(visibleRowIndex)"
                        (rowMouseLeave)="onRowMouseLeave()"
                      />
                    }
                  </div>
                }
                </div>
              </div>
            </div>
            <div class="b-table__scrollbar-v">
              <div
                #verticalScrollbar
                class="b-table__scrollbar-v-inner"
                (scroll)="onVerticalScrollbarScroll($event)"
              >
                <div class="b-table__spacer" [style.height.px]="totalHeightPx()"></div>
              </div>
            </div>
          </div>
          <div class="b-table__scrollbar-h-row">
            <div class="b-table__scrollbar-h-spacer" [style.width.px]="leftPaneWidth()"></div>
            <div class="b-table__scrollbar-h">
              <div
                #horizontalScrollbar
                class="b-table__scrollbar-h-inner"
                (scroll)="onHorizontalScrollbarScroll($event)"
              >
                <div class="b-table__spacer-h" [style.width.px]="centerColumnsTotalWidth()"></div>
              </div>
            </div>
            <div class="b-table__scrollbar-h-spacer" [style.width.px]="rightPaneWidth()"></div>
            <div class="b-table__scrollbar-h-v-gap" aria-hidden="true"></div>
          </div>
        </div>

      </div>

      @if (headerMenuVisible()) {
        <div
          class="b-table__header-menu"
          [style.left.px]="headerMenuPosition().x"
          [style.top.px]="headerMenuPosition().y"
          (click)="$event.stopPropagation()"
        >
          <button type="button" (click)="pinColumnFromMenu('left')">Pin left</button>
          <button type="button" (click)="pinColumnFromMenu('right')">Pin right</button>
          <button type="button" (click)="pinColumnFromMenu(undefined)">Unpin</button>
        </div>
      }

      <b-table-footer
        [paginationEnabled]="paginationEnabled()"
        [pageIndex]="pageIndex()"
        [totalPages]="totalPages()"
        (pageIndexChange)="goToPage($event)"
      />
    </section>
  `,
  styleUrl: './brickular-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BrickTableComponent<T extends BrickRowData = BrickRowData> {
  private readonly destroyRef = inject(DestroyRef);

  readonly scrollShell = viewChild<ElementRef<HTMLDivElement>>('scrollShell');
  readonly bodyContent = viewChild<ElementRef<HTMLDivElement>>('bodyContent');
  readonly verticalScrollbar = viewChild<ElementRef<HTMLDivElement>>('verticalScrollbar');
  readonly horizontalScrollbar = viewChild<ElementRef<HTMLDivElement>>('horizontalScrollbar');
  readonly headScroller = viewChild<ElementRef<HTMLDivElement>>('headScroller');

  readonly data = input<readonly T[]>([]);
  readonly columnDefs = input<readonly BrickTableColumnDef<T>[]>([]);
  readonly pageSizeOptions = input<readonly number[]>([10, 25, 50, 100]);
  readonly defaultPageSize = input(25);
  readonly paginationEnabled = input(true);
  readonly rowHeight = input(40);
  readonly quickFilterPlaceholder = input('Search table...');
  readonly selectionMode = input<BrickSelectionMode>('multiple');
  /** When true, show vertical borders between all columns. When false (default), only show borders at left/right pane edges. */
  readonly showVerticalBorders = input(false);
  /** When true, header cells can grow vertically based on content instead of fixed row height. */
  readonly autoHeaderHeight = input(false);
  /** Optional header group definitions for grouping columns into bands. */
  readonly headerGroups = input<readonly BrickHeaderGroupDef[]>([]);

  readonly selectionChange = output<BrickSelectionChange<T>>();
  readonly sortChange = output<readonly BrickSortState[]>();
  readonly pageChange = output<BrickTablePageState>();
  readonly editCommit = output<BrickCellEditEvent<T>>();
  /** Emitted when a column's header group changes (drag-drop into another group or pin leaves group). */
  readonly columnGroupChange = output<BrickColumnGroupChange>();

  protected readonly quickFilter = signal('');
  protected readonly filters = signal<Record<string, BrickFilterValue>>({});
  private readonly sortState = signal<readonly BrickSortState[]>([]);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize());
  protected readonly selectedIndices = signal<readonly number[]>([]);
  protected readonly editingCell = signal<{ rowIndex: number; columnId: string } | null>(null);
  /** Active cell by index in paged rows (so it does not change when scrolling). */
  protected readonly activeCell = signal<{ pagedRowIndex: number; columnIndex: number }>({
    pagedRowIndex: -1,
    columnIndex: -1,
  });
  private readonly headerOrder = signal<readonly string[]>([]);
  private readonly pinnedColumns = signal<Record<string, BrickColumnPin | undefined>>({});
  private readonly hiddenColumns = signal<Record<string, boolean>>({});
  /** When a column is dropped onto another, assign it to that column's header group. */
  private readonly headerGroupOverrides = signal<Record<string, string | undefined>>({});
  protected readonly columnWidths = signal<Record<string, number>>({});
  protected readonly dragColumnId = signal<string | null>(null);
  /** During drag: where the column would drop (so we can show preview order). */
  private readonly dragDropTarget = signal<{ targetColumnId: string; before: boolean } | null>(null);
  private readonly isResizing = signal(false);
  private readonly resizeEndedAt = signal(0);
  protected readonly scrollTop = signal(0);
  protected readonly centerScrollLeft = signal(0);
  protected readonly viewportHeight = signal(540);
  private readonly viewportWidth = signal(0);
  private readonly lastSelectedIndex = signal<number | null>(null);
  /** Tracks which visible row index is hovered so left/center/right segments all show hover. */
  protected readonly hoveredVisibleRowIndex = signal<number | null>(null);
  protected readonly sortIndicatorForHeader = (columnId: string): string => this.sortIndicator(columnId);
  private readonly headerMenuColumnId = signal<string | null>(null);
  protected readonly headerMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  protected readonly headerMenuVisible = signal(false);
  private columnReorderAnimator: ColumnReorderAnimator | null = null;
  /** Tracks last column set we initialized from, so we only reset order/pin/width when columns actually change. */
  private readonly lastInitColumnKey = signal<string>('');

  /** Column defs with built-in selection column prepended when selection is enabled. Selection column is a normal column, pinned left by default. */
  protected readonly effectiveColumnDefs = computed((): readonly BrickTableColumnDef<T>[] => {
    const mode = this.selectionMode();
    if (mode !== 'single' && mode !== 'multiple') {
      return this.columnDefs();
    }
    const selectColumn: BrickTableColumnDef<T> = {
      id: BRICK_SELECT_COLUMN_ID,
      header: '',
      pinned: 'left',
      pinnable: true,
      width: 36,
      minWidth: 36,
      maxWidth: 36,
      sortable: false,
      filterable: false,
      resizable: false,
      editable: false,
    };
    return [selectColumn, ...this.columnDefs()];
  });

  protected readonly renderedColumns = computed(() => {
    return resolveRenderedColumns(
      this.effectiveColumnDefs(),
      this.hiddenColumns(),
      this.headerOrder(),
      this.pinnedColumns(),
    );
  });

  /** Column order for display: when dragging, reorder so the grid shows the drop result. Uses exact drop target (any position within a group). */
  protected readonly previewRenderedColumns = computed(() => {
    const cols = this.renderedColumns();
    const dragId = this.dragColumnId();
    const target = this.dragDropTarget();
    if (!dragId || !target) {
      return cols;
    }
    const without = cols.filter((c) => c.id !== dragId);
    const draggedCol = cols.find((c) => c.id === dragId);
    if (!draggedCol) {
      return cols;
    }
    const targetColumn = without.find((c) => c.id === target.targetColumnId);
    const targetIdx = without.findIndex((c) => c.id === target.targetColumnId);
    if (targetIdx === -1) {
      return cols;
    }
    // Preview pin state as well so header/body panes stay aligned while dragging.
    const previewDraggedColumn = targetColumn
      ? { ...draggedCol, pinned: targetColumn.pinned }
      : draggedCol;
    const insertAt = target.before ? targetIdx : targetIdx + 1;
    return [...without.slice(0, insertAt), previewDraggedColumn, ...without.slice(insertAt)];
  });

  /** Drop target column id for header (to highlight the group under cursor). */
  protected readonly dropTargetColumnIdForHeader = computed(() => this.dragDropTarget()?.targetColumnId ?? null);

  /** Dragged column's original header group (before strip), so header can hide the gap when reordering within same group. Uses overrides so a column moved to another group is treated as belonging to that group on the next drag. */
  protected readonly draggingColumnOriginalGroupId = computed(() => {
    const id = this.dragColumnId();
    if (!id) return null;
    const overrides = this.headerGroupOverrides();
    if (Object.prototype.hasOwnProperty.call(overrides, id)) {
      return overrides[id] ?? null;
    }
    const col = this.renderedColumns().find((c) => c.id === id);
    return col?.headerGroupId ?? null;
  });

  /** Columns for header with headerGroupId overrides applied (from drag-drop onto another group). During drag, the dragged column has no group so no label appears above the placeholder. */
  protected readonly headerColumnsWithGroupOverrides = computed(() => {
    const cols = this.previewRenderedColumns();
    const overrides = this.headerGroupOverrides();
    const dragId = this.dragColumnId();
    return cols.map((c) => {
      if (c.id === dragId) {
        return { ...c, headerGroupId: undefined };
      }
      if (Object.prototype.hasOwnProperty.call(overrides, c.id)) {
        return { ...c, headerGroupId: overrides[c.id] };
      }
      return c;
    }) as readonly BrickTableColumnDef<T>[];
  });

  protected readonly filteredRows = computed<readonly BrickTableRow<T>[]>(() => {
    return filterRows(createRows(this.data()), this.renderedColumns(), this.filters(), this.quickFilter());
  });

  protected readonly sortedRows = computed<readonly BrickTableRow<T>[]>(() => {
    return sortRows(this.filteredRows(), this.renderedColumns(), this.sortState());
  });

  protected readonly pagedRows = computed(() => {
    if (!this.paginationEnabled()) {
      return this.sortedRows();
    }
    return paginateRows(this.sortedRows(), this.pageIndex(), this.pageSize());
  });

  protected readonly totalPages = computed(() =>
    this.paginationEnabled() ? Math.max(1, Math.ceil(this.sortedRows().length / this.pageSize())) : 1,
  );
  protected readonly totalHeightPx = computed(() => this.pagedRows().length * this.rowHeight());
  protected readonly visibleRange = computed(() => {
    return engineVisibleRange(this.scrollTop(), this.viewportHeight(), this.rowHeight(), this.pagedRows().length);
  });
  protected readonly visibleRows = computed(() => {
    const range = this.visibleRange();
    return this.pagedRows().slice(range.start, range.end);
  });
  protected readonly leftColumns = computed(() =>
    this.previewRenderedColumns().filter((column) => column.pinned === 'left'),
  );
  protected readonly rightColumns = computed(() =>
    this.previewRenderedColumns().filter((column) => column.pinned === 'right'),
  );
  protected readonly centerColumns = computed(() =>
    this.previewRenderedColumns().filter((column) => !column.pinned),
  );
  protected readonly lastLeftColumnId = computed(() => {
    const left = this.leftColumns();
    return left.length > 0 ? left[left.length - 1].id : null;
  });
  protected readonly firstRightColumnId = computed(() => {
    const right = this.rightColumns();
    return right.length > 0 ? right[0].id : null;
  });

  /** Cumulative left offset (px) for each left-pinned column for sticky positioning. First left column gets 0, second gets width(first), etc. */
  protected readonly stickyLeftPx = computed(() => {
    const columns = this.previewRenderedColumns();
    const widths = this.resolvedColumnWidths();
    const result: Record<string, number> = {};
    let left = 0;
    for (const column of columns) {
      if (column.pinned === 'left') {
        result[column.id] = left;
        left += widths[column.id] ?? column.width ?? 160;
      }
    }
    return result;
  });

  /** Cumulative right offset (px) for each right-pinned column for sticky positioning. Rightmost column gets 0, next gets width(rightmost), etc. */
  protected readonly stickyRightPx = computed(() => {
    const right = this.rightColumns();
    const widths = this.resolvedColumnWidths();
    const result: Record<string, number> = {};
    let offset = 0;
    for (let i = right.length - 1; i >= 0; i--) {
      const column = right[i];
      result[column.id] = offset;
      offset += widths[column.id] ?? column.width ?? 160;
    }
    return result;
  });

  protected readonly leftPaneWidth = computed(() => {
    const widths = this.resolvedColumnWidths();
    const left = this.leftColumns();
    if (left.length === 0) {
      return 0;
    }
    return left.reduce(
      (sum, column) => sum + (widths[column.id] ?? column.width ?? 160),
      0,
    );
  });
  protected readonly rightPaneWidth = computed(() => {
    const widths = this.resolvedColumnWidths();
    const right = this.rightColumns();
    if (right.length === 0) {
      return 0;
    }
    return right.reduce(
      (sum, column) => sum + (widths[column.id] ?? column.width ?? 160),
      0,
    );
  });
  protected readonly centerColumnsTotalWidth = computed(() => {
    const widths = this.resolvedColumnWidths();
    return this.centerColumns().reduce(
      (sum, column) => sum + (widths[column.id] ?? column.width ?? 160),
      0,
    );
  });
  protected readonly totalTableWidthPx = computed(
    () =>
      this.leftPaneWidth() + this.centerColumnsTotalWidth() + this.rightPaneWidth(),
  );
  protected readonly centerPaneWidth = computed(() => {
    const viewport = this.viewportWidth();
    if (viewport <= 0) {
      return 0;
    }
    const contentWidth = this.centerColumnsTotalWidth();
    const available = viewport - this.leftPaneWidth() - this.rightPaneWidth();
    if (available <= 0 || contentWidth <= 0) {
      return 0;
    }
    // The center pane should never be wider than its content; otherwise there will be a gap on the right.
    const width = Math.min(contentWidth, available);
    return Math.ceil(width);
  });
  protected readonly resolvedColumnWidths = computed<Record<string, number>>(() => {
    const columns = this.renderedColumns();
    const widths = this.columnWidths();
    const viewportWidth = this.viewportWidth();
    if (columns.length === 0 || viewportWidth <= 0) {
      return widths;
    }

    const baseTotal = columns.reduce((sum, column) => sum + (widths[column.id] ?? column.width ?? 160), 0);
    const extra = viewportWidth - baseTotal;
    if (extra <= 0) {
      return widths;
    }

    const flexColumns = columns.filter((column) => (column.flex ?? 0) > 0);
    const growColumns = flexColumns.length > 0 ? flexColumns : columns;
    const totalFlex = growColumns.reduce((sum, column) => sum + (column.flex ?? 1), 0);
    if (totalFlex <= 0) {
      return widths;
    }

    return columns.reduce<Record<string, number>>((acc, column) => {
      const current = widths[column.id] ?? column.width ?? 160;
      if (!growColumns.includes(column)) {
        acc[column.id] = current;
        return acc;
      }
      const ratio = (column.flex ?? 1) / totalFlex;
      const grown = current + extra * ratio;
      const min = column.minWidth ?? 80;
      const max = column.maxWidth ?? 600;
      acc[column.id] = Math.min(max, Math.max(min, grown));
      return acc;
    }, {});
  });

  protected readonly leftPinnedScrollbarWidth = computed(() => {
    const columns = this.renderedColumns();
    const widths = this.resolvedColumnWidths();
    if (columns.length === 0) {
      return 0;
    }
    return columns
      .filter((column) => column.pinned === 'left')
      .reduce((sum, column) => sum + (widths[column.id] ?? column.width ?? 160), 0);
  });

  protected readonly rightPinnedScrollbarWidth = computed(() => {
    const columns = this.renderedColumns();
    const widths = this.resolvedColumnWidths();
    if (columns.length === 0) {
      return 0;
    }
    return columns
      .filter((column) => column.pinned === 'right')
      .reduce((sum, column) => sum + (widths[column.id] ?? column.width ?? 160), 0);
  });

  protected readonly allVisibleSelected = computed(() => {
    const selected = new Set(this.selectedIndices());
    const visibleRows = this.pagedRows();
    return visibleRows.length > 0 && visibleRows.every((row) => selected.has(row.sourceIndex));
  });
  protected readonly someVisibleSelected = computed(() => {
    const selected = new Set(this.selectedIndices());
    const visibleRows = this.pagedRows();
    return visibleRows.some((row) => selected.has(row.sourceIndex)) && !this.allVisibleSelected();
  });

  constructor() {
    effect(() => {
      const defs = this.effectiveColumnDefs();
      if (defs.length === 0) {
        return;
      }
      const columnIdsKey = defs.map((c) => c.id).join(',');
      const prevKey = this.lastInitColumnKey();
      if (columnIdsKey === prevKey) {
        return;
      }
      const keyExpanded = prevKey !== '' && columnIdsKey.startsWith(prevKey + ',');
      this.lastInitColumnKey.set(columnIdsKey);

      this.headerOrder.set(defs.map((column) => column.id));
      this.headerGroupOverrides.set({});
      this.columnWidths.set(
        defs.reduce<Record<string, number>>((acc, column) => {
          acc[column.id] = column.width ?? Math.max(column.minWidth ?? 80, 160);
          return acc;
        }, {}),
      );
      if (keyExpanded) {
        this.pinnedColumns.update((current) => {
          const next: Record<string, BrickColumnPin | undefined> = { ...current };
          for (const column of defs) {
            if (!Object.prototype.hasOwnProperty.call(next, column.id)) {
              next[column.id] = column.pinned;
            }
          }
          return next;
        });
        this.hiddenColumns.update((current) => {
          const next: Record<string, boolean> = { ...current };
          for (const column of defs) {
            if (!Object.prototype.hasOwnProperty.call(next, column.id)) {
              next[column.id] = Boolean(column.hidden);
            }
          }
          return next;
        });
      } else {
        this.pinnedColumns.set(
          defs.reduce<Record<string, BrickColumnPin | undefined>>((acc, column) => {
            acc[column.id] = column.pinned;
            return acc;
          }, {}),
        );
        this.hiddenColumns.set(
          defs.reduce<Record<string, boolean>>((acc, column) => {
            acc[column.id] = Boolean(column.hidden);
            return acc;
          }, {}),
        );
      }
    });

    effect((onCleanup) => {
      const contentRef = this.bodyContent();
      if (!contentRef) {
        return;
      }
      const contentElement = contentRef.nativeElement;
      const sync = (): void => this.syncViewportMetrics(contentElement);
      sync();
      requestAnimationFrame(sync);

      if (typeof ResizeObserver !== 'undefined') {
        let rafId: number | null = null;
        const observer = new ResizeObserver(() => {
          if (rafId !== null) {
            return;
          }
          rafId = requestAnimationFrame(() => {
            rafId = null;
            sync();
          });
        });
        observer.observe(contentElement);
        onCleanup(() => {
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
          }
          observer.disconnect();
        });
      }
    });

    effect((onCleanup) => {
      const head = this.headScroller()?.nativeElement;
      const body = this.bodyContent()?.nativeElement;
      if (!head || !body) {
        return;
      }
      this.columnReorderAnimator = new ColumnReorderAnimator({
        headElement: head,
        bodyElement: body,
        // Phase 1+2 default: animate visible rows but keep cap conservative.
        maxAnimatedRows: 40,
        durationMs: 220,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
      onCleanup(() => {
        this.columnReorderAnimator?.reset();
        this.columnReorderAnimator = null;
      });
    });

    effect(() => {
      const top = this.scrollTop();
      const vBar = this.verticalScrollbar()?.nativeElement;
      if (vBar && Math.abs(vBar.scrollTop - top) > 1) {
        vBar.scrollTop = top;
      }
    });

    effect(() => {
      const left = this.centerScrollLeft();
      const hBar = this.horizontalScrollbar()?.nativeElement;
      const head = this.headScroller()?.nativeElement;
      if (hBar && Math.abs(hBar.scrollLeft - left) > 1) {
        hBar.scrollLeft = left;
      }
      if (head && Math.abs(head.scrollLeft - left) > 1) {
        head.scrollLeft = left;
      }
    });

    effect(() => {
      const maxPage = this.totalPages() - 1;
      if (this.pageIndex() > maxPage) {
        this.pageIndex.set(maxPage);
      }
    });

    effect(() => {
      const pagedRowCount = this.pagedRows().length;
      const columnCount = this.renderedColumns().length;
      const current = this.activeCell();
      if (pagedRowCount === 0 || columnCount === 0 || current.pagedRowIndex < 0 || current.columnIndex < 0) {
        return;
      }
      const pagedRowIndex = Math.min(Math.max(current.pagedRowIndex, 0), pagedRowCount - 1);
      const columnIndex = Math.min(Math.max(current.columnIndex, 0), columnCount - 1);
      if (pagedRowIndex !== current.pagedRowIndex || columnIndex !== current.columnIndex) {
        this.activeCell.set({ pagedRowIndex, columnIndex });
      }
    });

    effect(() => {
      if (this.headerMenuVisible()) {
        const close = (): void => {
          this.headerMenuVisible.set(false);
          this.headerMenuColumnId.set(null);
        };
        const onClick = (): void => close();
        const onEscape = (event: KeyboardEvent): void => {
          if (event.key === 'Escape') {
            close();
          }
        };
        window.addEventListener('click', onClick);
        window.addEventListener('keydown', onEscape);
        return () => {
          window.removeEventListener('click', onClick);
          window.removeEventListener('keydown', onEscape);
        };
      }
      return;
    });

    effect(() => {
      const shell = this.scrollShell()?.nativeElement;
      if (!shell) {
        return;
      }
      const onDocKeydown = (event: KeyboardEvent): void => {
        const navKeys = new Set([
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Home',
          'End',
          'Tab',
        ]);
        if (!navKeys.has(event.key)) {
          return;
        }
        const active = this.activeCell();
        if (active.pagedRowIndex < 0 || active.columnIndex < 0) {
          return;
        }
        const target = event.target as Node | null;
        if (!target) {
          return;
        }
        const isInsideCell =
          target instanceof HTMLElement &&
          target.closest?.('.b-table__cell, .b-table__select-cell');
        if (isInsideCell) {
          return;
        }
        const isInsideTable = shell.contains(target);
        const isBody = target === document.body;
        if (!isInsideTable && !isBody) {
          return;
        }
        event.preventDefault();
        const content = this.bodyContent()?.nativeElement;
        if (content) {
          this.focusCell(active.pagedRowIndex, active.columnIndex, content);
        }
      };
      document.addEventListener('keydown', onDocKeydown, true);
      return () => document.removeEventListener('keydown', onDocKeydown, true);
    });
  }

  protected onQuickFilterChange(value: string): void {
    this.quickFilter.set(value);
    this.pageIndex.set(0);
  }

  protected onPageSizeChange(nextSize: number): void {
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }
    this.pageSize.set(nextSize);
    this.pageIndex.set(0);
    this.pageChange.emit({ pageIndex: this.pageIndex(), pageSize: nextSize });
  }

  protected goToPage(nextPageIndex: number): void {
    if (nextPageIndex < 0 || nextPageIndex >= this.totalPages()) {
      return;
    }
    this.pageIndex.set(nextPageIndex);
    this.pageChange.emit({ pageIndex: nextPageIndex, pageSize: this.pageSize() });
  }

  protected toggleSort(column: BrickTableColumnDef<T>, addToSort: boolean): void {
    if (Date.now() - this.resizeEndedAt() < 160) {
      return;
    }
    if (column.sortable === false) {
      return;
    }

    const current = this.sortState();
    const existing = current.find((entry) => entry.columnId === column.id);
    const nextDirection = nextSortDirection(existing?.direction);
    const withoutColumn = current.filter((entry) => entry.columnId !== column.id);
    let next: readonly BrickSortState[];

    if (!nextDirection) {
      next = addToSort ? withoutColumn : [];
    } else {
      const nextEntry: BrickSortState = { columnId: column.id, direction: nextDirection };
      next = addToSort ? [...withoutColumn, nextEntry] : [nextEntry];
    }

    this.sortState.set(next);
    this.sortChange.emit(next);
  }

  protected sortIndicator(columnId: string): string {
    const state = this.sortState().find((entry) => entry.columnId === columnId);
    if (!state) {
      return '';
    }
    return state.direction === 'asc' ? '▲' : '▼';
  }

  protected setTextFilter(columnId: string, value: string): void {
    this.filters.update((current) => ({ ...current, [columnId]: { type: 'text', value } }));
    this.pageIndex.set(0);
  }

  protected setNumberFilter(columnId: string, edge: 'min' | 'max', value?: number): void {
    this.filters.update((current) => {
      const existing = current[columnId]?.type === 'number' ? current[columnId] : { type: 'number' as const };
      const next = {
        ...existing,
        [edge]: value,
      };
      return { ...current, [columnId]: next };
    });
    this.pageIndex.set(0);
  }

  protected setDateFilter(columnId: string, edge: 'start' | 'end', value?: string): void {
    this.filters.update((current) => {
      const existing = current[columnId]?.type === 'date' ? current[columnId] : { type: 'date' as const };
      const next = { ...existing, [edge]: value };
      return { ...current, [columnId]: next };
    });
    this.pageIndex.set(0);
  }

  protected toggleSelectVisibleRows(checked: boolean): void {
    const visibleIndices = this.pagedRows().map((row) => row.sourceIndex);
    if (checked) {
      const union = new Set([...this.selectedIndices(), ...visibleIndices]);
      this.selectedIndices.set([...union]);
    } else {
      this.selectedIndices.set(this.selectedIndices().filter((index) => !visibleIndices.includes(index)));
    }
    this.emitSelectionChange();
  }

  protected toggleRowSelection(sourceIndex: number, shiftKey: boolean): void {
    const selectionMode = this.selectionMode();
    if (selectionMode === 'single') {
      this.selectedIndices.set([sourceIndex]);
      this.lastSelectedIndex.set(sourceIndex);
      this.emitSelectionChange();
      return;
    }

    if (shiftKey && this.lastSelectedIndex() !== null) {
      const currentRows = this.sortedRows();
      const from = currentRows.findIndex((row) => row.sourceIndex === this.lastSelectedIndex());
      const to = currentRows.findIndex((row) => row.sourceIndex === sourceIndex);
      if (from >= 0 && to >= 0) {
        const [start, end] = from <= to ? [from, to] : [to, from];
        const range = currentRows.slice(start, end + 1).map((row) => row.sourceIndex);
        this.selectedIndices.update((indices) => [...new Set([...indices, ...range])]);
        this.lastSelectedIndex.set(sourceIndex);
        this.emitSelectionChange();
        return;
      }
    }

    this.selectedIndices.update((indices) =>
      indices.includes(sourceIndex) ? indices.filter((index) => index !== sourceIndex) : [...indices, sourceIndex],
    );
    this.lastSelectedIndex.set(sourceIndex);
    this.emitSelectionChange();
  }

  protected onVerticalScrollbarScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    this.scrollTop.set(el.scrollTop);
  }

  protected onHorizontalScrollbarScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    this.centerScrollLeft.set(el.scrollLeft);
  }

  protected onGridWheel(event: WheelEvent): void {
    const vBar = this.verticalScrollbar()?.nativeElement;
    const hBar = this.horizontalScrollbar()?.nativeElement;
    const horizontalDelta = event.deltaX !== 0 ? event.deltaX : (event.shiftKey ? event.deltaY : 0);
    const verticalDelta = !event.shiftKey && event.deltaY !== 0 ? event.deltaY : 0;
    if (verticalDelta !== 0 && vBar) {
      event.preventDefault();
      vBar.scrollTop += verticalDelta;
      this.scrollTop.set(vBar.scrollTop);
    }
    if (horizontalDelta !== 0 && hBar) {
      event.preventDefault();
      hBar.scrollLeft += horizontalDelta;
      this.centerScrollLeft.set(hBar.scrollLeft);
    }
  }

  protected onHeaderWheel(event: WheelEvent): void {
    const hBar = this.horizontalScrollbar()?.nativeElement;
    const horizontalDelta = event.deltaX !== 0 ? event.deltaX : (event.shiftKey ? event.deltaY : 0);
    if (horizontalDelta !== 0 && hBar) {
      event.preventDefault();
      hBar.scrollLeft += horizontalDelta;
      this.centerScrollLeft.set(hBar.scrollLeft);
    }
  }

  protected onHeaderDragEnd(): void {
    this.dragColumnId.set(null);
    this.dragDropTarget.set(null);
    this.columnReorderAnimator?.reset();
  }

  protected onHeaderDragTarget(hint: { targetColumnId: string; before: boolean } | null): void {
    if (!this.dragColumnId()) {
      this.dragDropTarget.set(null);
      this.columnReorderAnimator?.reset();
      return;
    }
    if (!hint) {
      this.dragDropTarget.set(null);
      this.columnReorderAnimator?.reset();
      return;
    }

    const current = this.dragDropTarget();
    if (
      current &&
      current.targetColumnId === hint.targetColumnId &&
      current.before === hint.before
    ) {
      return;
    }

    this.columnReorderAnimator?.captureBefore();
    this.dragDropTarget.set(hint);

    requestAnimationFrame(() => {
      this.columnReorderAnimator?.animateAfter();
    });
  }

  protected openHeaderContextMenu(columnId: string, x: number, y: number): void {
    this.headerMenuColumnId.set(columnId);
    this.headerMenuPosition.set({ x, y });
    this.headerMenuVisible.set(true);
  }

  protected startResize(column: BrickTableColumnDef<T>, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing.set(true);
    const startX = event.clientX;
    const startWidth = this.columnWidths()[column.id] ?? column.width ?? 160;
    const minWidth = column.minWidth ?? 80;
    const maxWidth = column.maxWidth ?? 600;
    let rafId: number | null = null;
    let lastMoveEvent: MouseEvent | null = null;
    const flushResize = (): void => {
      rafId = null;
      const moveEvent = lastMoveEvent;
      lastMoveEvent = null;
      if (moveEvent) {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
        this.columnWidths.update((current) => ({ ...current, [column.id]: nextWidth }));
      }
    };
    const onMouseMove = (moveEvent: MouseEvent): void => {
      lastMoveEvent = moveEvent;
      if (rafId === null) {
        rafId = requestAnimationFrame(flushResize);
      }
    };
    const onMouseUp = (): void => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastMoveEvent = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.isResizing.set(false);
      this.resizeEndedAt.set(Date.now());
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  protected onHeaderDragStart(columnId: string, event: DragEvent): void {
    if (this.isResizing()) {
      event.preventDefault();
      return;
    }
    const column = this.renderedColumns().find((entry) => entry.id === columnId);
    if (column?.suppressMove) {
      event.preventDefault();
      return;
    }
    this.dragColumnId.set(columnId);
    event.dataTransfer?.setData('text/plain', columnId);
    event.dataTransfer!.effectAllowed = 'move';
  }

  protected onHeaderDrop(targetColumnId: string): void {
    const sourceColumnId = this.dragColumnId();
    const hint = this.dragDropTarget();
    if (!sourceColumnId) {
      this.dragDropTarget.set(null);
      this.dragColumnId.set(null);
      this.columnReorderAnimator?.reset();
      return;
    }
    const effectiveTargetColumnId = hint?.targetColumnId ?? targetColumnId;
    const insertBefore = hint?.before ?? true;
    if (sourceColumnId === effectiveTargetColumnId) {
      this.dragDropTarget.set(null);
      this.dragColumnId.set(null);
      this.columnReorderAnimator?.reset();
      return;
    }
    this.headerOrder.update((order) => {
      const sourceIndex = order.indexOf(sourceColumnId);
      if (sourceIndex < 0) {
        return order;
      }
      const next = order.filter((id) => id !== sourceColumnId);
      const targetIndex = next.indexOf(effectiveTargetColumnId);
      if (targetIndex < 0) {
        return order;
      }
      const insertAt = insertBefore ? targetIndex : targetIndex + 1;
      next.splice(insertAt, 0, sourceColumnId);
      return next;
    });

    const columns = this.renderedColumns();
    const sourceColumn = columns.find((column) => column.id === sourceColumnId);
    const targetColumn = columns.find((column) => column.id === effectiveTargetColumnId);

    if (sourceColumn && targetColumn) {
      const targetPinned = targetColumn.pinned;
      const currentPinned = this.pinnedColumns()[sourceColumnId];
      if (targetPinned !== currentPinned) {
        this.pinnedColumns.update((current) => ({
          ...current,
          [sourceColumnId]: targetPinned,
        }));
      }
      // Assign dragged column to the target column's header group when using header groups. When dropping onto a pinned column, remove from group (pin column → leave group).
      if (this.headerGroups().length > 0) {
        const newGroupId: string | undefined = targetPinned ? undefined : targetColumn.headerGroupId;
        this.headerGroupOverrides.update((current) => {
          const next = { ...current };
          if (targetPinned) {
            delete next[sourceColumnId];
          } else {
            next[sourceColumnId] = targetColumn.headerGroupId;
          }
          return next;
        });
        this.columnGroupChange.emit({ columnId: sourceColumnId, headerGroupId: newGroupId });
      }
    }

    this.dragDropTarget.set(null);
    this.dragColumnId.set(null);
    this.columnReorderAnimator?.reset();
  }

  protected cyclePinned(columnId: string): void {
    this.pinnedColumns.update((current) => {
      const nextPinned = current[columnId] === 'left' ? 'right' : current[columnId] === 'right' ? undefined : 'left';
      return { ...current, [columnId]: nextPinned };
    });
    const pinned = this.pinnedColumns()[columnId];
    if (pinned && this.headerGroups().length > 0) {
      this.headerGroupOverrides.update((current) => {
        const next = { ...current };
        delete next[columnId];
        return next;
      });
      this.columnGroupChange.emit({ columnId, headerGroupId: undefined });
    }
  }

  protected pinColumnFromMenu(direction: BrickColumnPin | undefined): void {
    const columnId = this.headerMenuColumnId();
    if (!columnId) {
      return;
    }
    const defs = this.effectiveColumnDefs();
    const def = defs.find((column) => column.id === columnId);
    if (def?.lockPinned) {
      this.headerMenuVisible.set(false);
      this.headerMenuColumnId.set(null);
      return;
    }
    this.pinnedColumns.update((current) => ({
      ...current,
      [columnId]: direction,
    }));
    if (direction && this.headerGroups().length > 0) {
      this.headerGroupOverrides.update((current) => {
        const next = { ...current };
        delete next[columnId];
        return next;
      });
      this.columnGroupChange.emit({ columnId, headerGroupId: undefined });
    }
    this.headerMenuVisible.set(false);
    this.headerMenuColumnId.set(null);
  }

  protected startEdit(rowIndex: number, columnId: string): void {
    this.editingCell.set({ rowIndex, columnId });
  }

  protected commitEdit(row: BrickRowData, rowIndex: number, columnId: string, value: string): void {
    this.editCommit.emit({
      row: row as T,
      rowIndex,
      columnId,
      nextValue: value,
    });
    this.editingCell.set(null);
  }

  protected cancelEdit(): void {
    this.editingCell.set(null);
  }

  protected onCellKeydown(event: {
    pagedRowIndex: number;
    columnIndex: number;
    key: string;
    shiftKey: boolean;
  }): void {
    if (event.key === 'c' || event.key === 'C') {
      const keyboard = (window.event ?? null) as KeyboardEvent | null;
      if (keyboard && (keyboard.ctrlKey || keyboard.metaKey)) {
        const pagedRows = this.pagedRows();
        const columns = this.renderedColumns();
        const row = pagedRows[event.pagedRowIndex];
        const column = columns[event.columnIndex];
        if (row && column) {
          const value = this.displayValueForClipboard(column, row.source as T);
          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            void navigator.clipboard.writeText(value);
          }
        }
        return;
      }
    }
    const pagedRowCount = this.pagedRows().length;
    const columnCount = this.renderedColumns().length;
    if (pagedRowCount === 0 || columnCount === 0) {
      return;
    }

    let nextPagedRow = event.pagedRowIndex;
    let nextColumn = event.columnIndex;

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (event.columnIndex === 0) {
          nextPagedRow = Math.max(event.pagedRowIndex - 1, 0);
          nextColumn = columnCount - 1;
        } else {
          nextColumn = event.columnIndex - 1;
        }
      } else {
        if (event.columnIndex === columnCount - 1) {
          nextPagedRow = Math.min(event.pagedRowIndex + 1, pagedRowCount - 1);
          nextColumn = 0;
        } else {
          nextColumn = event.columnIndex + 1;
        }
      }
    } else {
      const rowDelta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      const columnDelta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      nextPagedRow = Math.min(Math.max(event.pagedRowIndex + rowDelta, 0), pagedRowCount - 1);
      nextColumn = Math.min(Math.max(event.columnIndex + columnDelta, 0), columnCount - 1);

      if (event.key === 'Home') {
        nextColumn = 0;
      }
      if (event.key === 'End') {
        nextColumn = columnCount - 1;
      }
    }

    const content = this.bodyContent()?.nativeElement;
    if (!content) {
      return;
    }
    this.focusCell(nextPagedRow, nextColumn, content);
  }

  protected toggleSortById(columnId: string, addToSort: boolean): void {
    const column = this.renderedColumns().find((entry) => entry.id === columnId);
    if (!column) {
      return;
    }
    this.toggleSort(column, addToSort);
  }

  protected startResizeById(columnId: string, event: MouseEvent): void {
    const column = this.renderedColumns().find((entry) => entry.id === columnId);
    if (!column) {
      return;
    }
    this.startResize(column, event);
  }

  /** Auto-size one or more columns to fit header + visible row content. When no ids are provided, all resizable columns are sized. */
  autoSizeColumns(columnIds?: readonly string[]): void {
    const head = this.headScroller()?.nativeElement;
    const body = this.bodyContent()?.nativeElement;
    if (!head || !body) {
      return;
    }
    const rendered = this.renderedColumns();
    const defsById = new Map(rendered.map((column) => [column.id, column]));
    const targetIds: readonly string[] =
      columnIds && columnIds.length > 0 ? columnIds : rendered.map((column) => column.id);

    const currentWidths = this.columnWidths();
    const nextWidths: Record<string, number> = { ...currentWidths };

    const maxBodyCellsPerColumn = 50;

    for (const columnId of targetIds) {
      if (columnId === BRICK_SELECT_COLUMN_ID) {
        continue;
      }
      const def = defsById.get(columnId);
      if (!def || def.resizable === false) {
        continue;
      }

      let maxWidth = 0;
      const headerCell = head.querySelector<HTMLElement>(
        `.b-table__header-row [data-column-id="${columnId}"], .b-table__header-merged [data-column-id="${columnId}"]`,
      );
      if (headerCell) {
        maxWidth = Math.max(maxWidth, headerCell.getBoundingClientRect().width);
      }

      const bodyCells = body.querySelectorAll<HTMLElement>(
        `.b-table__row [data-column-id="${columnId}"]`,
      );
      let count = 0;
      bodyCells.forEach((cell) => {
        if (count >= maxBodyCellsPerColumn) {
          return;
        }
        const width = cell.getBoundingClientRect().width;
        if (width > maxWidth) {
          maxWidth = width;
        }
        count += 1;
      });

      if (maxWidth <= 0) {
        continue;
      }

      const min = def.minWidth ?? 80;
      const max = def.maxWidth ?? 600;
      const clamped = Math.min(max, Math.max(min, Math.ceil(maxWidth)));
      nextWidths[columnId] = clamped;
    }

    this.columnWidths.set(nextWidths);
  }

  private emitSelectionChange(): void {
    const selected = new Set(this.selectedIndices());
    const selectedRows = this.data().filter((_, index) => selected.has(index));
    this.selectionChange.emit({ selectedRows });
  }

  private syncViewportMetrics(viewport: HTMLDivElement): void {
    const height = viewport.clientHeight;
    const width = viewport.clientWidth;
    if (height > 0) {
      this.viewportHeight.set(height);
    }
    if (width > 0) {
      this.viewportWidth.set(width);
    }
  }

  protected setActiveCell(pagedRowIndex: number, columnIndex: number): void {
    this.activeCell.set({ pagedRowIndex, columnIndex });
  }

  protected onRowMouseEnter(visibleRowIndex: number): void {
    this.hoveredVisibleRowIndex.set(visibleRowIndex);
  }

  protected onRowMouseLeave(): void {
    this.hoveredVisibleRowIndex.set(null);
  }

  private focusCell(pagedRowIndex: number, columnIndex: number, viewport: HTMLDivElement): void {
    this.scrollRowIntoView(pagedRowIndex);
    this.scrollColumnIntoView(columnIndex);
    this.activeCell.set({ pagedRowIndex, columnIndex });
    setTimeout(() => {
      if (this.destroyRef.destroyed) {
        return;
      }
      const range = this.visibleRange();
      if (pagedRowIndex < range.start || pagedRowIndex >= range.end) {
        return;
      }
      const visibleRowIndex = pagedRowIndex - range.start;
      const selector = `.b-table__cell[data-nav-row="${visibleRowIndex}"][data-nav-col="${columnIndex}"], .b-table__select-cell[data-nav-row="${visibleRowIndex}"][data-nav-col="${columnIndex}"]`;
      const targetCell = viewport.querySelector<HTMLElement>(selector);
      targetCell?.focus();
    }, 0);
  }

  private scrollRowIntoView(pagedRowIndex: number): void {
    const rowH = this.rowHeight();
    const viewportH = this.viewportHeight();
    const currentScrollTop = this.scrollTop();

    const rowTop = pagedRowIndex * rowH;
    const rowBottom = rowTop + rowH;
    const viewportTop = currentScrollTop;
    const viewportBottom = currentScrollTop + viewportH;

    let newScrollTop = currentScrollTop;

    if (rowTop < viewportTop) {
      newScrollTop = Math.max(0, rowTop - rowH * 0.5);
    } else if (rowBottom > viewportBottom) {
      newScrollTop = Math.max(0, rowBottom - viewportH + rowH * 0.5);
    }

    if (Math.abs(newScrollTop - currentScrollTop) < 1) {
      return;
    }

    this.scrollTop.set(newScrollTop);
    const vBar = this.verticalScrollbar()?.nativeElement;
    if (vBar) {
      vBar.scrollTop = newScrollTop;
    }
  }

  private scrollColumnIntoView(columnIndex: number): void {
    const L = this.leftColumns().length;
    const C = this.centerColumns().length;
    if (columnIndex < L || columnIndex >= L + C) {
      return;
    }
    const columns = this.renderedColumns();
    const widths = this.resolvedColumnWidths();
    let columnLeft = 0;
    for (let i = L; i < columnIndex; i++) {
      const col = columns[i];
      columnLeft += widths[col.id] ?? col.width ?? 160;
    }
    const activeCol = columns[columnIndex];
    const columnWidth = widths[activeCol.id] ?? activeCol.width ?? 160;
    const columnRight = columnLeft + columnWidth;
    const paneW = this.centerPaneWidth();
    const maxScroll = Math.max(0, this.centerColumnsTotalWidth() - paneW);
    let newScrollLeft = this.centerScrollLeft();
    if (columnLeft < newScrollLeft) {
      newScrollLeft = Math.max(0, columnLeft - 24);
    } else if (columnRight > newScrollLeft + paneW) {
      newScrollLeft = Math.min(maxScroll, columnRight - paneW + 24);
    }
    newScrollLeft = Math.min(maxScroll, Math.max(0, newScrollLeft));
    newScrollLeft = Math.round(newScrollLeft);
    if (Math.abs(newScrollLeft - this.centerScrollLeft()) < 1) {
      return;
    }
    this.centerScrollLeft.set(newScrollLeft);
    const hBar = this.horizontalScrollbar()?.nativeElement;
    const head = this.headScroller()?.nativeElement;
    if (hBar) {
      hBar.scrollLeft = newScrollLeft;
    }
    if (head) {
      head.scrollLeft = newScrollLeft;
    }
  }

  private displayValueForClipboard(column: BrickTableColumnDef<T>, row: T): string {
    const raw = column.valueGetter ? column.valueGetter(row) : column.field ? row[column.field] : undefined;
    if (column.cellRenderer) {
      return column.cellRenderer(raw, row);
    }
    if (column.valueFormatter) {
      return column.valueFormatter(raw, row);
    }
    return raw === undefined || raw === null ? '' : String(raw);
  }
}
