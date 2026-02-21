import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BRICK_GROUP_DRAG_GAP_ID,
  BRICK_SELECT_COLUMN_ID,
  BrickCellContext,
  BrickRowData,
  BrickTableColumnDef,
  BrickTableRow,
} from './table-types';
import { displayValue as engineDisplayValue, rawValue as engineRawValue } from './table-engine';
import { tableBodyCellVariants, toPinVariant } from './table-variants';

@Component({
  selector: 'b-table-row',
  imports: [CommonModule],
  template: `
    <div
      class="b-table__row"
      [class.b-table__row--hovered]="isRowHovered()"
      role="row"
      (mouseenter)="rowMouseEnter.emit()"
      (mouseleave)="rowMouseLeave.emit()"
    >
      @for (column of columns(); track column.id; let columnIndex = $index) {
        @if (column.id === BRICK_GROUP_DRAG_GAP_ID) {
          <div
            class="b-table__cell b-table__cell--group-drag-gap"
            role="gridcell"
            [attr.data-nav-row]="visibleRowIndex()"
            [attr.data-nav-col]="globalColumnIndex(columnIndex)"
            [attr.data-column-id]="column.id"
            [style.width.px]="columnWidths()[column.id]"
          ></div>
        } @else if (column.id === dragColumnId()) {
          <div
            [class.b-table__select-cell]="column.id === BRICK_SELECT_COLUMN_ID"
            [class.b-table__cell]="column.id !== BRICK_SELECT_COLUMN_ID"
            class="b-table__cell--drag-slot"
            [class.b-table__select-cell--pinned-left]="column.pinned === 'left'"
            [class.b-table__select-cell--pinned-right]="column.pinned === 'right'"
            [class.b-table__cell--left-boundary]="panePosition() === 'left' && columnIndex === columns().length - 1"
            [class.b-table__cell--right-boundary]="panePosition() === 'right' && columnIndex === 0"
            role="gridcell"
            [attr.data-nav-row]="visibleRowIndex()"
            [attr.data-nav-col]="globalColumnIndex(columnIndex)"
            [attr.data-column-id]="column.id"
            [style.width.px]="columnWidths()[column.id]"
            [style.left.px]="column.pinned === 'left' ? stickyLeftPx()[column.id] : null"
            [style.right.px]="column.pinned === 'right' ? stickyRightPx()[column.id] : null"
          ></div>
        } @else if (column.id === BRICK_SELECT_COLUMN_ID) {
          <div
            class="b-table__select-cell"
            [class.b-table__select-cell--pinned-left]="column.pinned === 'left'"
            [class.b-table__select-cell--pinned-right]="column.pinned === 'right'"
            [class.b-table__select-cell--selected]="isRowSelected()"
            [class.b-table__cell--active]="isActiveCell(globalColumnIndex(columnIndex))"
            [class.b-table__select-cell--left-boundary]="panePosition() === 'left' && columnIndex === columns().length - 1"
            [class.b-table__select-cell--right-boundary]="panePosition() === 'right' && columnIndex === 0"
            role="gridcell"
            [style.width.px]="columnWidths()[column.id]"
            [style.left.px]="column.pinned === 'left' ? stickyLeftPx()[column.id] : null"
            [style.right.px]="column.pinned === 'right' ? stickyRightPx()[column.id] : null"
            [attr.data-nav-row]="visibleRowIndex()"
            [attr.data-nav-col]="globalColumnIndex(columnIndex)"
            [attr.data-column-id]="column.id"
            [tabindex]="cellTabIndex(globalColumnIndex(columnIndex))"
            (focus)="onCellFocus(globalColumnIndex(columnIndex))"
            (keydown)="onCellKeydown($event, column.id, globalColumnIndex(columnIndex))"
          >
            <input
              type="checkbox"
              [checked]="isRowSelected()"
              (click)="toggleSelection.emit({ rowIndex: row().sourceIndex, shiftKey: $event.shiftKey }); $event.stopPropagation()"
              aria-label="Toggle row selection"
            />
          </div>
        } @else {
          <div
            [class]="cellClasses(column, globalColumnIndex(columnIndex))"
            [class.b-table__cell--left-boundary]="panePosition() === 'left' && columnIndex === columns().length - 1"
            [class.b-table__cell--right-boundary]="panePosition() === 'right' && columnIndex === 0"
            [style.width.px]="columnWidths()[column.id]"
            [style.left.px]="column.pinned === 'left' ? stickyLeftPx()[column.id] : null"
            [style.right.px]="column.pinned === 'right' ? stickyRightPx()[column.id] : null"
            role="gridcell"
            [attr.data-nav-row]="visibleRowIndex()"
            [attr.data-nav-col]="globalColumnIndex(columnIndex)"
            [attr.data-column-id]="column.id"
            [tabindex]="cellTabIndex(globalColumnIndex(columnIndex))"
            (focus)="onCellFocus(globalColumnIndex(columnIndex))"
            (keydown)="onCellKeydown($event, column.id, globalColumnIndex(columnIndex))"
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
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickTableRowComponent<T extends BrickRowData = BrickRowData> {
  protected readonly BRICK_SELECT_COLUMN_ID = BRICK_SELECT_COLUMN_ID;
  protected readonly BRICK_GROUP_DRAG_GAP_ID = BRICK_GROUP_DRAG_GAP_ID;
  readonly row = input.required<BrickTableRow<T>>();
  readonly visibleRowIndex = input(0);
  /** Index of this row in paged rows (visibleRange.start + visibleRowIndex). Used so active cell survives scroll. */
  readonly pagedRowIndex = input(0);
  /** When true, row shows hover styling (used so left/center/right segments stay in sync). */
  readonly isRowHovered = input(false);
  readonly activeCell = input<{ pagedRowIndex: number; columnIndex: number }>({ pagedRowIndex: -1, columnIndex: -1 });
  readonly columns = input<readonly BrickTableColumnDef<T>[]>([]);
  /** Offset to add to pane column index to get global column index (for keyboard nav across panes). */
  readonly columnIndexOffset = input(0);
  /** Which pane this row segment belongs to (for boundary borders). */
  readonly panePosition = input<'left' | 'center' | 'right'>('center');
  readonly columnWidths = input<Record<string, number>>({});
  /** Cumulative left offset (px) per column id for left-pinned sticky positioning. */
  readonly stickyLeftPx = input<Record<string, number>>({});
  readonly stickyRightPx = input<Record<string, number>>({});
  readonly selectedIndices = input<readonly number[]>([]);
  readonly editingCell = input<{ rowIndex: number; columnId: string } | null>(null);
  /** When set, the column with this id is being dragged and should render as an empty placeholder slot. */
  readonly dragColumnId = input<string | null>(null);

  readonly toggleSelection = output<{ rowIndex: number; shiftKey: boolean }>();
  readonly startEdit = output<{ rowIndex: number; columnId: string }>();
  readonly commitCellEdit = output<{ row: T; rowIndex: number; columnId: string; nextValue: string }>();
  readonly cancelEdit = output<void>();
  readonly cellKeydown = output<{ pagedRowIndex: number; columnId: string; columnIndex: number; key: string; shiftKey: boolean }>();
  readonly cellFocus = output<{ pagedRowIndex: number; columnIndex: number }>();
  readonly rowMouseEnter = output<void>();
  readonly rowMouseLeave = output<void>();

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

  protected globalColumnIndex(paneColumnIndex: number): number {
    return this.columnIndexOffset() + paneColumnIndex;
  }

  protected onCellKeydown(event: KeyboardEvent, columnId: string, globalColumnIndex: number): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      this.toggleSelection.emit({ rowIndex: this.row().sourceIndex, shiftKey: event.shiftKey });
      return;
    }
    if ((event.key === 'c' || event.key === 'C') && (event.ctrlKey || event.metaKey)) {
      this.cellKeydown.emit({
        pagedRowIndex: this.pagedRowIndex(),
        columnId,
        columnIndex: globalColumnIndex,
        key: event.key,
        shiftKey: event.shiftKey,
      });
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.cellKeydown.emit({
        pagedRowIndex: this.pagedRowIndex(),
        columnId,
        columnIndex: globalColumnIndex,
        key: event.key,
        shiftKey: event.shiftKey,
      });
      return;
    }

    const navigationKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);
    if (!navigationKeys.has(event.key)) {
      return;
    }
    event.preventDefault();
    this.cellKeydown.emit({
      pagedRowIndex: this.pagedRowIndex(),
      columnId,
      columnIndex: globalColumnIndex,
      key: event.key,
      shiftKey: event.shiftKey,
    });
  }

  protected cellTabIndex(globalColumnIndex: number): number {
    const active = this.activeCell();
    const isActive = this.isActiveCell(globalColumnIndex);
    const isFirstCellAndNoneActive =
      active.pagedRowIndex === -1 && this.pagedRowIndex() === 0 && globalColumnIndex === 0;
    return isActive || isFirstCellAndNoneActive ? 0 : -1;
  }

  protected onCellFocus(globalColumnIndex: number): void {
    this.cellFocus.emit({
      pagedRowIndex: this.pagedRowIndex(),
      columnIndex: globalColumnIndex,
    });
  }

  protected isActiveCell(globalColumnIndex: number): boolean {
    const active = this.activeCell();
    return active.pagedRowIndex === this.pagedRowIndex() && active.columnIndex === globalColumnIndex;
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
