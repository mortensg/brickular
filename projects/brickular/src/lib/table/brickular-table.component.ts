import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BrickCellContext,
  BrickCellEditEvent,
  BrickFilterType,
  BrickFilterValue,
  BrickRowData,
  BrickSelectionChange,
  BrickSortState,
  BrickTableColumnDef,
  BrickTablePageState,
  BrickTableRow,
} from './table-types';
import {
  createRows,
  displayValue as engineDisplayValue,
  filterRows,
  nextSortDirection,
  paginateRows,
  rawValue as engineRawValue,
  resolveFilterType as engineResolveFilterType,
  resolveRenderedColumns,
  sortRows,
  visibleRange as engineVisibleRange,
} from './table-engine';

@Component({
  selector: 'b-table',
  imports: [CommonModule],
  template: `
    <section class="b-table" role="region" aria-label="Brickular data table">
      <header class="b-table__toolbar">
        <label class="b-table__toolbar-search">
          <span class="b-visually-hidden">Quick filter</span>
          <input
            type="text"
            [value]="quickFilter()"
            [placeholder]="quickFilterPlaceholder()"
            (input)="onQuickFilterInput($event)"
          />
        </label>
        <label class="b-table__toolbar-pagesize">
          <span>Rows</span>
          <select [value]="pageSize()" (change)="onPageSizeChange($event)">
            @for (size of pageSizeOptions(); track size) {
              <option [value]="size">{{ size }}</option>
            }
          </select>
        </label>
      </header>

      <div class="b-table__scroll-shell">
        <div
          #viewport
          class="b-table__viewport"
          role="grid"
          [attr.aria-rowcount]="filteredRows().length"
          [style.--b-row-height.px]="rowHeight()"
          (scroll)="onViewportScroll($event)"
        >
          <div class="b-table__header-row" role="row">
            <div class="b-table__select-cell" role="columnheader">
              <input
                type="checkbox"
                [checked]="allVisibleSelected()"
                [indeterminate]="someVisibleSelected()"
                (change)="toggleSelectVisibleRows($event)"
                aria-label="Select visible rows"
              />
            </div>
            @for (column of renderedColumns(); track column.id) {
              <div
                class="b-table__header-cell"
                [class.b-table__header-cell--sortable]="column.sortable !== false"
                [class.b-table__header-cell--pinned-left]="column.pinned === 'left'"
                [class.b-table__header-cell--pinned-right]="column.pinned === 'right'"
                [style.width.px]="columnWidths()[column.id]"
                [style.minWidth.px]="column.minWidth ?? 80"
                [style.maxWidth.px]="column.maxWidth ?? 600"
                [title]="column.tooltip ?? column.header"
                draggable="true"
                role="columnheader"
                tabindex="0"
                (click)="toggleSort(column, $event.shiftKey)"
                (dragstart)="onHeaderDragStart(column.id, $event)"
                (dragover)="onHeaderDragOver($event)"
                (drop)="onHeaderDrop(column.id)"
              >
                <span>{{ column.header }}</span>
                <button
                  type="button"
                  class="b-table__pin-button"
                  [disabled]="column.pinnable === false"
                  (click)="cyclePinned(column.id, $event)"
                  [attr.aria-label]="'Pin column ' + column.header"
                >
                  {{ pinnedLabel(column.pinned) }}
                </button>
                <span class="b-table__sort-indicator">{{ sortIndicator(column.id) }}</span>
                @if (column.resizable !== false) {
                  <button
                    type="button"
                    class="b-table__resize-handle"
                    draggable="false"
                    (dragstart)="$event.preventDefault(); $event.stopPropagation()"
                    (mousedown)="startResize(column, $event)"
                    [attr.aria-label]="'Resize column ' + column.header"
                  ></button>
                }
              </div>
            }
          </div>

          <div class="b-table__filter-row" role="row">
            <div class="b-table__select-cell b-table__select-cell--empty"></div>
            @for (column of renderedColumns(); track column.id) {
              <div class="b-table__filter-cell">
                @if (column.filterable !== false) {
                  @if (resolveFilterType(column) === 'number') {
                    <input
                      type="number"
                      [value]="numberFilterMin(column.id)"
                      placeholder="Min"
                      (input)="setNumberFilter(column.id, 'min', $event)"
                    />
                    <input
                      type="number"
                      [value]="numberFilterMax(column.id)"
                      placeholder="Max"
                      (input)="setNumberFilter(column.id, 'max', $event)"
                    />
                  } @else if (resolveFilterType(column) === 'date') {
                    <input
                      type="date"
                      [value]="dateFilterStart(column.id)"
                      (input)="setDateFilter(column.id, 'start', $event)"
                    />
                    <input
                      type="date"
                      [value]="dateFilterEnd(column.id)"
                      (input)="setDateFilter(column.id, 'end', $event)"
                    />
                  } @else {
                    <input
                      type="text"
                      [value]="textFilter(column.id)"
                      placeholder="Filter"
                      (input)="setTextFilter(column.id, $event)"
                    />
                  }
                }
              </div>
            }
          </div>

          <div class="b-table__spacer" [style.height.px]="totalHeightPx() + headerOffsetPx()"></div>
          <div class="b-table__window" [style.transform]="'translateY(' + (translateYPx() + headerOffsetPx()) + 'px)'">

            @for (row of visibleRows(); track row.sourceIndex) {
              <div class="b-table__row" role="row">
                <div class="b-table__select-cell" role="gridcell">
                  <input
                    type="checkbox"
                    [checked]="isRowSelected(row.sourceIndex)"
                    (click)="toggleRowSelection(row.sourceIndex, $event.shiftKey); $event.stopPropagation()"
                    aria-label="Toggle row selection"
                  />
                </div>

                @for (column of renderedColumns(); track column.id) {
                  <div
                    class="b-table__cell"
                    [class.b-table__cell--editable]="column.editable === true"
                    [class.b-table__cell--selected]="isRowSelected(row.sourceIndex)"
                    [class.b-table__cell--pinned-left]="column.pinned === 'left'"
                    [class.b-table__cell--pinned-right]="column.pinned === 'right'"
                    [class]="cellClass(column, row.source, row.sourceIndex)"
                    [style.width.px]="columnWidths()[column.id]"
                    role="gridcell"
                    tabindex="0"
                    (keydown)="onCellKeydown($event, row.sourceIndex, column.id)"
                    (dblclick)="startEdit(row.sourceIndex, column.id)"
                  >
                    @if (isEditingCell(row.sourceIndex, column.id) && column.editable === true) {
                      <input
                        class="b-table__editor"
                        [value]="displayValue(column, row.source)"
                        (keydown.enter)="commitEdit(row.source, row.sourceIndex, column, $event)"
                        (keydown.escape)="cancelEdit()"
                        (blur)="commitEdit(row.source, row.sourceIndex, column, $event)"
                      />
                    } @else {
                      {{ displayValue(column, row.source) }}
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <footer class="b-table__footer">
        <button type="button" (click)="goToPage(pageIndex() - 1)" [disabled]="pageIndex() <= 0">
          Previous
        </button>
        <span>Page {{ pageIndex() + 1 }} / {{ totalPages() }}</span>
        <button
          type="button"
          (click)="goToPage(pageIndex() + 1)"
          [disabled]="pageIndex() + 1 >= totalPages()"
        >
          Next
        </button>
      </footer>
    </section>
  `,
  styleUrl: './brickular-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickTableComponent<T extends BrickRowData = BrickRowData> {
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');

  readonly data = input<readonly T[]>([]);
  readonly columnDefs = input<readonly BrickTableColumnDef<T>[]>([]);
  readonly pageSizeOptions = input<readonly number[]>([10, 25, 50, 100]);
  readonly defaultPageSize = input(25);
  readonly rowHeight = input(40);
  readonly quickFilterPlaceholder = input('Search table...');
  readonly selectionMode = input<'single' | 'multiple'>('multiple');

  readonly selectionChange = output<BrickSelectionChange<T>>();
  readonly sortChange = output<readonly BrickSortState[]>();
  readonly pageChange = output<BrickTablePageState>();
  readonly editCommit = output<BrickCellEditEvent<T>>();

  protected readonly quickFilter = signal('');
  private readonly filters = signal<Record<string, BrickFilterValue>>({});
  private readonly sortState = signal<readonly BrickSortState[]>([]);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize());
  private readonly selectedIndices = signal<readonly number[]>([]);
  private readonly editingCell = signal<{ rowIndex: number; columnId: string } | null>(null);
  private readonly headerOrder = signal<readonly string[]>([]);
  private readonly pinnedColumns = signal<Record<string, 'left' | 'right' | undefined>>({});
  private readonly hiddenColumns = signal<Record<string, boolean>>({});
  protected readonly columnWidths = signal<Record<string, number>>({});
  private readonly dragColumnId = signal<string | null>(null);
  private readonly isResizing = signal(false);
  private readonly resizeEndedAt = signal(0);
  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(540);
  private readonly lastSelectedIndex = signal<number | null>(null);

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
    return paginateRows(this.sortedRows(), this.pageIndex(), this.pageSize());
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sortedRows().length / this.pageSize())));
  protected readonly headerOffsetPx = computed(() => this.rowHeight() * 2);
  protected readonly totalHeightPx = computed(() => this.pagedRows().length * this.rowHeight());
  protected readonly visibleRange = computed(() => {
    return engineVisibleRange(this.scrollTop(), this.viewportHeight(), this.rowHeight(), this.pagedRows().length);
  });
  protected readonly translateYPx = computed(() => this.visibleRange().start * this.rowHeight());
  protected readonly visibleRows = computed(() => {
    const range = this.visibleRange();
    return this.pagedRows().slice(range.start, range.end);
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
        defs.reduce<Record<string, 'left' | 'right' | undefined>>((acc, column) => {
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

    effect(() => {
      const maxPage = this.totalPages() - 1;
      if (this.pageIndex() > maxPage) {
        this.pageIndex.set(maxPage);
      }
    });
  }

  protected onQuickFilterInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.quickFilter.set(input.value);
    this.pageIndex.set(0);
  }

  protected onPageSizeChange(event: Event): void {
    const nextSize = Number((event.target as HTMLSelectElement).value);
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

  protected resolveFilterType(column: BrickTableColumnDef<T>): BrickFilterType {
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
    this.filters.update((current) => ({ ...current, [columnId]: { type: 'text', value } }));
    this.pageIndex.set(0);
  }

  protected setNumberFilter(columnId: string, edge: 'min' | 'max', event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.filters.update((current) => {
      const existing = current[columnId]?.type === 'number' ? current[columnId] : { type: 'number' as const };
      const next = {
        ...existing,
        [edge]: Number.isFinite(value) ? value : undefined,
      };
      return { ...current, [columnId]: next };
    });
    this.pageIndex.set(0);
  }

  protected setDateFilter(columnId: string, edge: 'start' | 'end', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filters.update((current) => {
      const existing = current[columnId]?.type === 'date' ? current[columnId] : { type: 'date' as const };
      const next = { ...existing, [edge]: value || undefined };
      return { ...current, [columnId]: next };
    });
    this.pageIndex.set(0);
  }

  protected toggleSelectVisibleRows(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
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

  protected isRowSelected(sourceIndex: number): boolean {
    return this.selectedIndices().includes(sourceIndex);
  }

  protected onViewportScroll(event: Event): void {
    const viewport = event.target as HTMLDivElement;
    this.scrollTop.set(viewport.scrollTop);
    this.viewportHeight.set(viewport.clientHeight);
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

  protected onHeaderDragOver(event: DragEvent): void {
    event.preventDefault();
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

  protected cyclePinned(columnId: string, event: Event): void {
    event.stopPropagation();
    this.pinnedColumns.update((current) => {
      const nextPinned = current[columnId] === 'left' ? 'right' : current[columnId] === 'right' ? undefined : 'left';
      return { ...current, [columnId]: nextPinned };
    });
  }

  protected pinnedLabel(pinned: 'left' | 'right' | undefined): string {
    if (pinned === 'left') {
      return 'L';
    }
    if (pinned === 'right') {
      return 'R';
    }
    return '-';
  }

  protected cellClass(column: BrickTableColumnDef<T>, row: T, rowIndex: number): string {
    const cellClass = column.cellClass;
    if (!cellClass) {
      return '';
    }
    if (typeof cellClass === 'string') {
      return cellClass;
    }
    const context: BrickCellContext<T> = {
      column,
      row,
      rowIndex,
      value: engineRawValue(column, row),
    };
    return cellClass(context);
  }

  protected startEdit(rowIndex: number, columnId: string): void {
    this.editingCell.set({ rowIndex, columnId });
  }

  protected isEditingCell(rowIndex: number, columnId: string): boolean {
    const current = this.editingCell();
    return current?.rowIndex === rowIndex && current.columnId === columnId;
  }

  protected commitEdit(row: T, rowIndex: number, column: BrickTableColumnDef<T>, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.editCommit.emit({
      row,
      rowIndex,
      columnId: column.id,
      nextValue: value,
    });
    this.editingCell.set(null);
  }

  protected cancelEdit(): void {
    this.editingCell.set(null);
  }

  protected onCellKeydown(event: KeyboardEvent, rowIndex: number, columnId: string): void {
    if (event.key !== 'Enter') {
      return;
    }
    this.startEdit(rowIndex, columnId);
  }

  protected displayValue(column: BrickTableColumnDef<T>, row: T): string {
    return engineDisplayValue(column, row);
  }

  private emitSelectionChange(): void {
    const selected = new Set(this.selectedIndices());
    const selectedRows = this.data().filter((_, index) => selected.has(index));
    this.selectionChange.emit({ selectedRows });
  }
}
