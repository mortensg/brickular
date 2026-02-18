import {
  BrickColumnPin,
  BrickFilterType,
  BrickFilterValue,
  BrickRowData,
  BrickSortDirection,
  BrickSortState,
  BrickTableColumnDef,
  BrickTableRow,
} from './table-types';

export function createRows<T extends BrickRowData>(data: readonly T[]): readonly BrickTableRow<T>[] {
  return data.map((source, sourceIndex) => ({ source, sourceIndex }));
}

export function resolveRenderedColumns<T extends BrickRowData>(
  columns: readonly BrickTableColumnDef<T>[],
  hiddenColumns: Record<string, boolean>,
  order: readonly string[],
  pinnedColumns: Record<string, BrickColumnPin | undefined>,
): readonly BrickTableColumnDef<T>[] {
  const orderMap = new Map(order.map((id, index) => [id, index]));
  const visible = columns.filter((column) => !column.hidden && !hiddenColumns[column.id]);

  return [...visible].sort((left, right) => {
    const leftPinned = pinnedColumns[left.id] ?? left.pinned;
    const rightPinned = pinnedColumns[right.id] ?? right.pinned;
    if (leftPinned !== rightPinned) {
      if (leftPinned === 'left' || rightPinned === 'right') {
        return -1;
      }
      if (leftPinned === 'right' || rightPinned === 'left') {
        return 1;
      }
    }
    return (orderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER);
  });
}

export function rawValue<T extends BrickRowData>(column: BrickTableColumnDef<T>, row: T): unknown {
  if (column.valueGetter) {
    return column.valueGetter(row);
  }
  if (column.field) {
    return row[column.field];
  }
  return undefined;
}

export function displayValue<T extends BrickRowData>(column: BrickTableColumnDef<T>, row: T): string {
  const value = rawValue(column, row);
  if (column.cellRenderer) {
    return column.cellRenderer(value, row);
  }
  if (column.valueFormatter) {
    return column.valueFormatter(value, row);
  }
  return value === undefined || value === null ? '' : String(value);
}

export function resolveFilterType<T extends BrickRowData>(column: BrickTableColumnDef<T>): BrickFilterType {
  return column.filterType ?? 'text';
}

export function filterRows<T extends BrickRowData>(
  rows: readonly BrickTableRow<T>[],
  columns: readonly BrickTableColumnDef<T>[],
  filters: Record<string, BrickFilterValue>,
  quickFilter: string,
): readonly BrickTableRow<T>[] {
  const normalizedQuickFilter = quickFilter.toLowerCase().trim();
  return rows.filter((row) => {
    const quickMatch =
      normalizedQuickFilter.length === 0 ||
      columns.some((column) => displayValue(column, row.source).toLowerCase().includes(normalizedQuickFilter));
    if (!quickMatch) {
      return false;
    }

    return columns.every((column) => rowMatchesColumnFilter(row.source, column, filters[column.id]));
  });
}

export function sortRows<T extends BrickRowData>(
  rows: readonly BrickTableRow<T>[],
  columns: readonly BrickTableColumnDef<T>[],
  sortStates: readonly BrickSortState[],
): readonly BrickTableRow<T>[] {
  if (sortStates.length === 0) {
    return rows;
  }
  const sorted = [...rows];
  sorted.sort((left, right) => {
    for (const state of sortStates) {
      const column = columns.find((candidate) => candidate.id === state.columnId);
      if (!column) {
        continue;
      }

      const leftValue = rawValue(column, left.source);
      const rightValue = rawValue(column, right.source);
      const comparison = column.comparator
        ? column.comparator(leftValue, rightValue, left.source, right.source)
        : defaultCompare(leftValue, rightValue);
      if (comparison !== 0) {
        return state.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
  return sorted;
}

export function paginateRows<T extends BrickRowData>(
  rows: readonly BrickTableRow<T>[],
  pageIndex: number,
  pageSize: number,
): readonly BrickTableRow<T>[] {
  const start = pageIndex * pageSize;
  return rows.slice(start, start + pageSize);
}

export function visibleRange(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  rowCount: number,
  buffer = 5,
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const capacity = Math.ceil(viewportHeight / rowHeight) + buffer * 2;
  const end = Math.min(rowCount, start + capacity);
  return { start, end };
}

export function nextSortDirection(currentDirection: BrickSortDirection | undefined): BrickSortDirection | undefined {
  if (!currentDirection) {
    return 'asc';
  }
  if (currentDirection === 'asc') {
    return 'desc';
  }
  return undefined;
}

function rowMatchesColumnFilter<T extends BrickRowData>(
  row: T,
  column: BrickTableColumnDef<T>,
  filter?: BrickFilterValue,
): boolean {
  if (!filter) {
    return true;
  }

  const value = rawValue(column, row);
  if (filter.type === 'text') {
    return String(value ?? '')
      .toLowerCase()
      .includes(filter.value.toLowerCase());
  }
  if (filter.type === 'number') {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return false;
    }
    const minPass = filter.min === undefined || numberValue >= filter.min;
    const maxPass = filter.max === undefined || numberValue <= filter.max;
    return minPass && maxPass;
  }

  const dateValue = value ? new Date(String(value)).getTime() : Number.NaN;
  if (!Number.isFinite(dateValue)) {
    return false;
  }
  const startPass = !filter.start || dateValue >= new Date(filter.start).getTime();
  const endPass = !filter.end || dateValue <= new Date(filter.end).getTime();
  return startPass && endPass;
}

function defaultCompare(left: unknown, right: unknown): number {
  if (left === right) {
    return 0;
  }
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return String(left).localeCompare(String(right));
}
