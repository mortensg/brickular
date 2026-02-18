import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrickCellContext, BrickRowData, BrickTableColumnDef, BrickTableRow } from './table-types';
import { displayValue as engineDisplayValue, rawValue as engineRawValue } from './table-engine';
import { tableBodyCellVariants, toPinVariant } from './table-variants';

@Component({
  selector: 'b-table-row',
  imports: [CommonModule],
  template: `
    <div class="b-table__row" role="row">
      <div class="b-table__select-cell" role="gridcell">
        <input
          type="checkbox"
          [checked]="isRowSelected()"
          (click)="toggleSelection.emit({ rowIndex: row().sourceIndex, shiftKey: $event.shiftKey }); $event.stopPropagation()"
          aria-label="Toggle row selection"
        />
      </div>

      @for (column of columns(); track column.id; let columnIndex = $index) {
        <div
          [class]="cellClasses(column, columnIndex)"
          [style.width.px]="columnWidths()[column.id]"
          role="gridcell"
          [attr.data-nav-row]="visibleRowIndex()"
          [attr.data-nav-col]="columnIndex"
          [tabindex]="cellTabIndex(columnIndex)"
          (focus)="onCellFocus(columnIndex)"
          (keydown)="onCellKeydown($event, column.id, columnIndex)"
          (keydown.enter)="startEdit.emit({ rowIndex: row().sourceIndex, columnId: column.id })"
          (dblclick)="startEdit.emit({ rowIndex: row().sourceIndex, columnId: column.id })"
        >
          @if (isEditingCell(column.id) && column.editable === true) {
            <input
              class="b-table__editor"
              [value]="displayValue(column, row().source)"
              (keydown.enter)="commitEdit(column.id, $event)"
              (keydown.escape)="cancelEdit.emit()"
              (blur)="commitEdit(column.id, $event)"
            />
          } @else {
            {{ displayValue(column, row().source) }}
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickTableRowComponent<T extends BrickRowData = BrickRowData> {
  readonly row = input.required<BrickTableRow<T>>();
  readonly visibleRowIndex = input(0);
  readonly activeCell = input<{ rowIndex: number; columnIndex: number }>({ rowIndex: 0, columnIndex: 0 });
  readonly columns = input<readonly BrickTableColumnDef<T>[]>([]);
  readonly columnWidths = input<Record<string, number>>({});
  readonly selectedIndices = input<readonly number[]>([]);
  readonly editingCell = input<{ rowIndex: number; columnId: string } | null>(null);

  readonly toggleSelection = output<{ rowIndex: number; shiftKey: boolean }>();
  readonly startEdit = output<{ rowIndex: number; columnId: string }>();
  readonly commitCellEdit = output<{ row: T; rowIndex: number; columnId: string; nextValue: string }>();
  readonly cancelEdit = output<void>();
  readonly cellKeydown = output<{ rowIndex: number; columnId: string; columnIndex: number; key: string }>();
  readonly cellFocus = output<{ rowIndex: number; columnIndex: number }>();

  protected isRowSelected(): boolean {
    return this.selectedIndices().includes(this.row().sourceIndex);
  }

  protected isEditingCell(columnId: string): boolean {
    const current = this.editingCell();
    return current?.rowIndex === this.row().sourceIndex && current.columnId === columnId;
  }

  protected displayValue(column: BrickTableColumnDef<T>, row: T): string {
    return engineDisplayValue(column, row);
  }

  protected cellClasses(column: BrickTableColumnDef<T>, columnIndex: number): string {
    return [
      tableBodyCellVariants({
        editable: column.editable === true,
        selected: this.isRowSelected(),
        pinned: toPinVariant(column.pinned),
      }),
      this.isActiveCell(columnIndex) ? 'b-table__cell--active' : '',
      this.resolveCustomCellClass(column),
    ]
      .filter(Boolean)
      .join(' ');
  }

  protected commitEdit(columnId: string, event: Event): void {
    const nextValue = (event.target as HTMLInputElement).value;
    this.commitCellEdit.emit({
      row: this.row().source,
      rowIndex: this.row().sourceIndex,
      columnId,
      nextValue,
    });
  }

  protected onCellKeydown(event: KeyboardEvent, columnId: string, columnIndex: number): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    const navigationKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);
    if (!navigationKeys.has(event.key)) {
      return;
    }
    event.preventDefault();
    this.cellKeydown.emit({
      rowIndex: this.visibleRowIndex(),
      columnId,
      columnIndex,
      key: event.key,
    });
  }

  protected cellTabIndex(columnIndex: number): number {
    return this.isActiveCell(columnIndex) ? 0 : -1;
  }

  protected onCellFocus(columnIndex: number): void {
    this.cellFocus.emit({
      rowIndex: this.visibleRowIndex(),
      columnIndex,
    });
  }

  private isActiveCell(columnIndex: number): boolean {
    const active = this.activeCell();
    return active.rowIndex === this.visibleRowIndex() && active.columnIndex === columnIndex;
  }

  private resolveCustomCellClass(column: BrickTableColumnDef<T>): string {
    const cellClass = column.cellClass;
    if (!cellClass) {
      return '';
    }
    if (typeof cellClass === 'string') {
      return cellClass;
    }
    const context: BrickCellContext<T> = {
      column,
      row: this.row().source,
      rowIndex: this.row().sourceIndex,
      value: engineRawValue(column, this.row().source),
    };
    return cellClass(context);
  }
}
