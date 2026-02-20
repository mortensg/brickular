export type BrickRowData = Record<string, unknown>;

/** Reserved column id for the built-in row selection checkbox column. Pinned left by default, behaves like a normal column. */
export const BRICK_SELECT_COLUMN_ID = '__brick_select';

export type BrickSortDirection = 'asc' | 'desc';
export type BrickSelectionMode = 'single' | 'multiple';
export type BrickColumnPin = 'left' | 'right';

export type BrickColumnAutoSizeMode = 'header' | 'headerAndRows';

export interface BrickSortState {
  readonly columnId: string;
  readonly direction: BrickSortDirection;
}

export type BrickFilterType = 'text' | 'number' | 'date';

export interface BrickTextFilter {
  readonly type: 'text';
  readonly value: string;
}

export interface BrickNumberFilter {
  readonly type: 'number';
  readonly min?: number;
  readonly max?: number;
}

export interface BrickDateFilter {
  readonly type: 'date';
  readonly start?: string;
  readonly end?: string;
}

export type BrickFilterValue = BrickTextFilter | BrickNumberFilter | BrickDateFilter;

export type BrickCellClass<T extends BrickRowData> = string | ((ctx: BrickCellContext<T>) => string);

export interface BrickCellContext<T extends BrickRowData> {
  readonly row: T;
  readonly rowIndex: number;
  readonly value: unknown;
  readonly column: BrickTableColumnDef<T>;
}

export interface BrickHeaderGroupDef {
  readonly id: string;
  readonly label: string;
}

export interface BrickTableColumnDef<T extends BrickRowData = BrickRowData> {
  readonly id: string;
  readonly header: string;
  readonly field?: keyof T & string;
  readonly tooltip?: string;
  /** Optional id for grouping this column under a header group. */
  readonly headerGroupId?: string;
  readonly width?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly flex?: number;
  readonly hidden?: boolean;
  readonly editable?: boolean;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly resizable?: boolean;
  readonly pinnable?: boolean;
  readonly pinned?: BrickColumnPin;
  /** When true, this column cannot be reordered via drag. */
  readonly suppressMove?: boolean;
  /** When true, this column's pinned state cannot be changed by the user. */
  readonly lockPinned?: boolean;
  /** Controls how auto-size should measure this column. */
  readonly autoSizeMode?: BrickColumnAutoSizeMode;
  readonly valueGetter?: (row: T) => unknown;
  readonly valueSetter?: (row: T, value: unknown) => T;
  readonly valueFormatter?: (value: unknown, row: T) => string;
  readonly comparator?: (a: unknown, b: unknown, rowA: T, rowB: T) => number;
  readonly cellRenderer?: (value: unknown, row: T) => string;
  /** Optional renderer for header content; falls back to `header` string when omitted. */
  readonly headerRenderer?: (column: BrickTableColumnDef<T>) => string;
  readonly cellClass?: BrickCellClass<T>;
  readonly filterType?: BrickFilterType;
}

export interface BrickTablePageState {
  readonly pageIndex: number;
  readonly pageSize: number;
}

export interface BrickSelectionChange<T extends BrickRowData> {
  readonly selectedRows: readonly T[];
}

export interface BrickCellEditEvent<T extends BrickRowData> {
  readonly rowIndex: number;
  readonly columnId: string;
  readonly nextValue: unknown;
  readonly row: T;
}

export interface BrickTableRow<T extends BrickRowData> {
  readonly source: T;
  readonly sourceIndex: number;
}
