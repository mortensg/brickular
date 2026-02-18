import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrickColumnPin, BrickFilterValue, BrickRowData, BrickTableColumnDef } from './table-types';
import { resolveFilterType as engineResolveFilterType } from './table-engine';
import { tableHeaderCellVariants, toPinVariant } from './table-variants';

@Component({
  selector: 'b-table-header',
  imports: [CommonModule],
  template: `
    <div class="b-table__header-row" role="row">
      <div class="b-table__select-cell" role="columnheader">
        <input
          type="checkbox"
          [checked]="allVisibleSelected()"
          [indeterminate]="someVisibleSelected()"
          (change)="onSelectVisibleChange($event)"
          aria-label="Select visible rows"
        />
      </div>
      @for (column of columns(); track column.id) {
        <div
          [class]="headerCellClass(column)"
          [style.width.px]="columnWidths()[column.id]"
          [style.minWidth.px]="column.minWidth ?? 80"
          [style.maxWidth.px]="column.maxWidth ?? 600"
          [title]="column.tooltip ?? column.header"
          draggable="true"
          role="columnheader"
          tabindex="0"
          (click)="toggleSort.emit({ columnId: column.id, addToSort: $event.shiftKey })"
          (dragstart)="headerDragStart.emit({ columnId: column.id, event: $event })"
          (dragover)="onHeaderDragOver($event)"
          (drop)="headerDrop.emit(column.id)"
        >
          <span>{{ column.header }}</span>
          <button
            type="button"
            class="b-table__pin-button"
            [disabled]="column.pinnable === false"
            (click)="cyclePinned.emit(column.id); $event.stopPropagation()"
            [attr.aria-label]="'Pin column ' + column.header"
          >
            {{ pinnedLabel(column.pinned) }}
          </button>
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
        </div>
      }
    </div>

    <div class="b-table__filter-row" role="row">
      <div class="b-table__select-cell b-table__select-cell--empty"></div>
      @for (column of columns(); track column.id) {
        <div
          class="b-table__filter-cell"
          [style.width.px]="columnWidths()[column.id]"
          [style.minWidth.px]="column.minWidth ?? 80"
          [style.maxWidth.px]="column.maxWidth ?? 600"
        >
          @if (column.filterable !== false) {
            @if (resolveFilterType(column) === 'number') {
              <div class="b-table__filter-range">
                <input
                  type="number"
                  class="b-table__filter-input"
                  [value]="numberFilterMin(column.id)"
                  placeholder="Min"
                  (input)="setNumberFilter(column.id, 'min', $event)"
                />
                <input
                  type="number"
                  class="b-table__filter-input"
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
                  [value]="dateFilterStart(column.id)"
                  (input)="setDateFilter(column.id, 'start', $event)"
                />
                <input
                  type="date"
                  class="b-table__filter-input"
                  [value]="dateFilterEnd(column.id)"
                  (input)="setDateFilter(column.id, 'end', $event)"
                />
              </div>
            } @else {
              <input
                type="text"
                class="b-table__filter-input"
                [value]="textFilter(column.id)"
                placeholder="Filter"
                (input)="setTextFilter(column.id, $event)"
              />
            }
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickTableHeaderComponent<T extends BrickRowData = BrickRowData> {
  readonly columns = input<readonly BrickTableColumnDef<T>[]>([]);
  readonly columnWidths = input<Record<string, number>>({});
  readonly allVisibleSelected = input(false);
  readonly someVisibleSelected = input(false);
  readonly sortIndicator = input<(columnId: string) => string>(() => '');
  readonly filters = input<Record<string, BrickFilterValue>>({});

  readonly toggleSelectVisibleRows = output<boolean>();
  readonly toggleSort = output<{ columnId: string; addToSort: boolean }>();
  readonly headerDragStart = output<{ columnId: string; event: DragEvent }>();
  readonly headerDrop = output<string>();
  readonly resizeStart = output<{ columnId: string; event: MouseEvent }>();
  readonly cyclePinned = output<string>();
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

  protected onHeaderDragOver(event: DragEvent): void {
    event.preventDefault();
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

  protected pinnedLabel(pinned: BrickColumnPin | undefined): string {
    if (pinned === 'left') {
      return 'L';
    }
    if (pinned === 'right') {
      return 'R';
    }
    return '-';
  }
}
