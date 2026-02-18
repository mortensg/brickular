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

      @for (column of columns(); track column.id) {
        <div
          [class]="cellClasses(column)"
          [style.width.px]="columnWidths()[column.id]"
          role="gridcell"
          tabindex="0"
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
  readonly columns = input<readonly BrickTableColumnDef<T>[]>([]);
  readonly columnWidths = input<Record<string, number>>({});
  readonly selectedIndices = input<readonly number[]>([]);
  readonly editingCell = input<{ rowIndex: number; columnId: string } | null>(null);

  readonly toggleSelection = output<{ rowIndex: number; shiftKey: boolean }>();
  readonly startEdit = output<{ rowIndex: number; columnId: string }>();
  readonly commitCellEdit = output<{ row: T; rowIndex: number; columnId: string; nextValue: string }>();
  readonly cancelEdit = output<void>();

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

  protected cellClasses(column: BrickTableColumnDef<T>): string {
    return [
      tableBodyCellVariants({
        editable: column.editable === true,
        selected: this.isRowSelected(),
        pinned: toPinVariant(column.pinned),
      }),
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
