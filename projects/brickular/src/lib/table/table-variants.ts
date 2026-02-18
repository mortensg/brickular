import { cva } from 'class-variance-authority';
import { BrickColumnPin } from './table-types';

const pinState = (pinned: BrickColumnPin | undefined): 'none' | 'left' | 'right' => {
  if (pinned === 'left') {
    return 'left';
  }
  if (pinned === 'right') {
    return 'right';
  }
  return 'none';
};

export const tableHeaderCellVariants = cva('b-table__header-cell', {
  variants: {
    sortable: {
      true: 'b-table__header-cell--sortable',
      false: '',
    },
    pinned: {
      none: '',
      left: 'b-table__header-cell--pinned-left',
      right: 'b-table__header-cell--pinned-right',
    },
  },
  defaultVariants: {
    sortable: true,
    pinned: 'none',
  },
});

export const tableBodyCellVariants = cva('b-table__cell', {
  variants: {
    editable: {
      true: 'b-table__cell--editable',
      false: '',
    },
    selected: {
      true: 'b-table__cell--selected',
      false: '',
    },
    pinned: {
      none: '',
      left: 'b-table__cell--pinned-left',
      right: 'b-table__cell--pinned-right',
    },
  },
  defaultVariants: {
    editable: false,
    selected: false,
    pinned: 'none',
  },
});

export const tableToolbarControlVariants = cva(
  'rounded-md border px-2 py-1 border-[var(--b-table-border)] bg-[var(--b-table-bg)] text-[var(--b-table-fg)]',
);

export const toPinVariant = pinState;
