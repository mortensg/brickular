import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
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
  BrickColumnPin,
  BrickCellEditEvent,
  BrickFilterValue,
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

      <div class="b-table__scroll-shell" role="grid" [attr.aria-rowcount]="filteredRows().length">
        <div #headScroller class="b-table__head-scroller">
          <b-table-header
            [columns]="renderedColumns()"
            [columnWidths]="resolvedColumnWidths()"
            [allVisibleSelected]="allVisibleSelected()"
            [someVisibleSelected]="someVisibleSelected()"
            [sortIndicator]="sortIndicatorForHeader"
            [filters]="filters()"
            (toggleSelectVisibleRows)="toggleSelectVisibleRows($event)"
            (toggleSort)="toggleSortById($event.columnId, $event.addToSort)"
            (headerDragStart)="onHeaderDragStart($event.columnId, $event.event)"
            (headerDrop)="onHeaderDrop($event)"
            (resizeStart)="startResizeById($event.columnId, $event.event)"
            (cyclePinned)="cyclePinned($event)"
            (textFilterChange)="setTextFilter($event.columnId, $event.value)"
            (numberFilterChange)="setNumberFilter($event.columnId, $event.edge, $event.value)"
            (dateFilterChange)="setDateFilter($event.columnId, $event.edge, $event.value)"
          />
        </div>

        <div
          #viewport
          class="b-table__viewport"
          [style.--b-row-height.px]="rowHeight()"
          (scroll)="onViewportScroll($event)"
        >
          <div class="b-table__spacer" [style.height.px]="totalHeightPx()"></div>
          <div class="b-table__window" [style.transform]="'translateY(' + translateYPx() + 'px)'">
            @for (row of visibleRows(); track row.sourceIndex; let visibleRowIndex = $index) {
              <b-table-row
                [row]="row"
                [visibleRowIndex]="visibleRowIndex"
                [columns]="renderedColumns()"
                [columnWidths]="resolvedColumnWidths()"
                [selectedIndices]="selectedIndices()"
                [editingCell]="editingCell()"
                [activeCell]="activeCell()"
                (toggleSelection)="toggleRowSelection($event.rowIndex, $event.shiftKey)"
                (startEdit)="startEdit($event.rowIndex, $event.columnId)"
                (commitCellEdit)="commitEdit($event.row, $event.rowIndex, $event.columnId, $event.nextValue)"
                (cancelEdit)="cancelEdit()"
                (cellFocus)="setActiveCell($event.rowIndex, $event.columnIndex)"
                (cellKeydown)="onCellKeydown($event)"
              />
            }
          </div>
        </div>
      </div>

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
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  readonly headScroller = viewChild<ElementRef<HTMLDivElement>>('headScroller');

  readonly data = input<readonly T[]>([]);
  readonly columnDefs = input<readonly BrickTableColumnDef<T>[]>([]);
  readonly pageSizeOptions = input<readonly number[]>([10, 25, 50, 100]);
  readonly defaultPageSize = input(25);
  readonly paginationEnabled = input(true);
  readonly rowHeight = input(40);
  readonly quickFilterPlaceholder = input('Search table...');
  readonly selectionMode = input<BrickSelectionMode>('multiple');

  readonly selectionChange = output<BrickSelectionChange<T>>();
  readonly sortChange = output<readonly BrickSortState[]>();
  readonly pageChange = output<BrickTablePageState>();
  readonly editCommit = output<BrickCellEditEvent<T>>();

  protected readonly quickFilter = signal('');
  protected readonly filters = signal<Record<string, BrickFilterValue>>({});
  private readonly sortState = signal<readonly BrickSortState[]>([]);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize());
  protected readonly selectedIndices = signal<readonly number[]>([]);
  protected readonly editingCell = signal<{ rowIndex: number; columnId: string } | null>(null);
  protected readonly activeCell = signal<{ rowIndex: number; columnIndex: number }>({
    rowIndex: -1,
    columnIndex: -1,
  });
  private readonly headerOrder = signal<readonly string[]>([]);
  private readonly pinnedColumns = signal<Record<string, BrickColumnPin | undefined>>({});
  private readonly hiddenColumns = signal<Record<string, boolean>>({});
  protected readonly columnWidths = signal<Record<string, number>>({});
  private readonly dragColumnId = signal<string | null>(null);
  private readonly isResizing = signal(false);
  private readonly resizeEndedAt = signal(0);
  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(540);
  private readonly viewportWidth = signal(0);
  private readonly lastSelectedIndex = signal<number | null>(null);
  protected readonly sortIndicatorForHeader = (columnId: string): string => this.sortIndicator(columnId);

  protected readonly renderedColumns = computed(() => {
    return resolveRenderedColumns(this.columnDefs(), this.hiddenColumns(), this.headerOrder(), this.pinnedColumns());
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
  protected readonly translateYPx = computed(() => this.visibleRange().start * this.rowHeight());
  protected readonly visibleRows = computed(() => {
    const range = this.visibleRange();
    return this.pagedRows().slice(range.start, range.end);
  });
  protected readonly resolvedColumnWidths = computed<Record<string, number>>(() => {
    const columns = this.renderedColumns();
    const widths = this.columnWidths();
    const viewportWidth = this.viewportWidth();
    if (columns.length === 0 || viewportWidth <= 0) {
      return widths;
    }

    const selectionWidthPx = 36;
    const baseTotal = columns.reduce((sum, column) => sum + (widths[column.id] ?? column.width ?? 160), 0);
    const extra = viewportWidth - (baseTotal + selectionWidthPx);
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
      const defs = this.columnDefs();
      if (defs.length === 0) {
        return;
      }

      this.headerOrder.set(defs.map((column) => column.id));
      this.columnWidths.set(
        defs.reduce<Record<string, number>>((acc, column) => {
          acc[column.id] = column.width ?? Math.max(column.minWidth ?? 80, 160);
          return acc;
        }, {}),
      );
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
    });

    effect((onCleanup) => {
      const viewportRef = this.viewport();
      if (!viewportRef) {
        return;
      }
      const viewportElement = viewportRef.nativeElement;
      const sync = (): void => this.syncViewportMetrics(viewportElement);
      sync();
      requestAnimationFrame(sync);

      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => sync());
        observer.observe(viewportElement);
        onCleanup(() => observer.disconnect());
      }
    });

    effect(() => {
      const maxPage = this.totalPages() - 1;
      if (this.pageIndex() > maxPage) {
        this.pageIndex.set(maxPage);
      }
    });

    effect(() => {
      const rowCount = this.visibleRows().length;
      const columnCount = this.renderedColumns().length;
      const current = this.activeCell();
      if (rowCount === 0 || columnCount === 0 || current.rowIndex < 0 || current.columnIndex < 0) {
        return;
      }
      const rowIndex = Math.min(Math.max(current.rowIndex, 0), rowCount - 1);
      const columnIndex = Math.min(Math.max(current.columnIndex, 0), columnCount - 1);
      if (rowIndex !== current.rowIndex || columnIndex !== current.columnIndex) {
        this.activeCell.set({ rowIndex, columnIndex });
      }
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

  protected onViewportScroll(event: Event): void {
    const viewport = event.target as HTMLDivElement;
    this.scrollTop.set(viewport.scrollTop);
    this.syncViewportMetrics(viewport);
    const headScroller = this.headScroller();
    if (headScroller) {
      headScroller.nativeElement.scrollLeft = viewport.scrollLeft;
    }
  }

  protected startResize(column: BrickTableColumnDef<T>, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing.set(true);
    const startX = event.clientX;
    const startWidth = this.columnWidths()[column.id] ?? column.width ?? 160;
    const minWidth = column.minWidth ?? 80;
    const maxWidth = column.maxWidth ?? 600;
    const onMouseMove = (moveEvent: MouseEvent): void => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
      this.columnWidths.update((current) => ({ ...current, [column.id]: nextWidth }));
    };
    const onMouseUp = (): void => {
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
    this.dragColumnId.set(columnId);
    event.dataTransfer?.setData('text/plain', columnId);
    event.dataTransfer!.effectAllowed = 'move';
  }

  protected onHeaderDrop(targetColumnId: string): void {
    const sourceColumnId = this.dragColumnId();
    if (!sourceColumnId || sourceColumnId === targetColumnId) {
      return;
    }
    this.headerOrder.update((order) => {
      const sourceIndex = order.indexOf(sourceColumnId);
      const targetIndex = order.indexOf(targetColumnId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return order;
      }
      const next = [...order];
      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, sourceColumnId);
      return next;
    });
    this.dragColumnId.set(null);
  }

  protected cyclePinned(columnId: string): void {
    this.pinnedColumns.update((current) => {
      const nextPinned = current[columnId] === 'left' ? 'right' : current[columnId] === 'right' ? undefined : 'left';
      return { ...current, [columnId]: nextPinned };
    });
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

  protected onCellKeydown(event: { rowIndex: number; columnIndex: number; key: string; shiftKey: boolean }): void {
    if (event.key === 'c' || event.key === 'C') {
      const keyboard = (window.event ?? null) as KeyboardEvent | null;
      if (keyboard && (keyboard.ctrlKey || keyboard.metaKey)) {
        const rows = this.visibleRows();
        const columns = this.renderedColumns();
        const row = rows[event.rowIndex];
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
    const rowCount = this.visibleRows().length;
    const columnCount = this.renderedColumns().length;
    if (rowCount === 0 || columnCount === 0) {
      return;
    }

    let nextRow = event.rowIndex;
    let nextColumn = event.columnIndex;

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (event.columnIndex === 0) {
          nextRow = Math.max(event.rowIndex - 1, 0);
          nextColumn = columnCount - 1;
        } else {
          nextColumn = event.columnIndex - 1;
        }
      } else {
        if (event.columnIndex === columnCount - 1) {
          nextRow = Math.min(event.rowIndex + 1, rowCount - 1);
          nextColumn = 0;
        } else {
          nextColumn = event.columnIndex + 1;
        }
      }
    } else {
      const rowDelta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      const columnDelta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      nextRow = Math.min(Math.max(event.rowIndex + rowDelta, 0), rowCount - 1);
      nextColumn = Math.min(Math.max(event.columnIndex + columnDelta, 0), columnCount - 1);

      if (event.key === 'Home') {
        nextColumn = 0;
      }
      if (event.key === 'End') {
        nextColumn = columnCount - 1;
      }
    }

    const viewport = this.viewport()?.nativeElement;
    if (!viewport) {
      return;
    }
    this.focusCell(nextRow, nextColumn, viewport);
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

  protected setActiveCell(rowIndex: number, columnIndex: number): void {
    this.activeCell.set({ rowIndex, columnIndex });
  }

  private focusCell(rowIndex: number, columnIndex: number, viewport: HTMLDivElement): void {
    this.activeCell.set({ rowIndex, columnIndex });
    const selector = `.b-table__cell[data-nav-row="${rowIndex}"][data-nav-col="${columnIndex}"]`;
    const targetCell = viewport.querySelector<HTMLElement>(selector);
    targetCell?.focus();
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
