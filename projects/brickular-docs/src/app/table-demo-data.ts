import { BrickHeaderGroupDef, BrickRowData, BrickTableColumnDef } from 'brickular';

export interface TableDocRow extends BrickRowData {
  readonly id: number;
  readonly customer: string;
  readonly country: string;
  readonly status: 'Active' | 'Paused' | 'Trial';
  readonly spend: number;
  readonly createdAt: string;
  readonly plan: 'Free' | 'Pro' | 'Enterprise';
  readonly churnRisk: 'Low' | 'Medium' | 'High';
  readonly nps: number;
  readonly accountOwner: string;
}

export const defaultColumns: readonly BrickTableColumnDef<TableDocRow>[] = [
  {
    id: 'id',
    header: 'ID',
    field: 'id',
    width: 90,
    pinnable: true,
    pinned: 'left',
    filterType: 'number',
    lockPinned: true,
  },
  {
    id: 'customer',
    header: 'Customer',
    field: 'customer',
    editable: true,
    sortable: true,
    filterable: true,
    width: 220,
    headerGroupId: 'customer',
    headerRenderer: (column) => `${column.header} name`,
  },
  {
    id: 'country',
    header: 'Country',
    field: 'country',
    sortable: true,
    filterable: true,
    width: 140,
    headerGroupId: 'customer',
  },
  {
    id: 'status',
    header: 'Status',
    field: 'status',
    sortable: true,
    filterable: true,
    width: 120,
    headerGroupId: 'status',
  },
  {
    id: 'spend',
    header: 'Spend',
    field: 'spend',
    sortable: true,
    filterable: true,
    filterType: 'number',
    width: 130,
    headerGroupId: 'status',
    valueFormatter: (value) => `$${Number(value).toFixed(0)}`,
  },
  {
    id: 'createdAt',
    header: 'Created',
    field: 'createdAt',
    sortable: true,
    filterable: true,
    filterType: 'date',
    width: 170,
    headerGroupId: 'meta',
  },
  {
    id: 'plan',
    header: 'Plan',
    field: 'plan',
    sortable: true,
    filterable: true,
    width: 140,
    headerGroupId: 'meta',
  },
  {
    id: 'churnRisk',
    header: 'Churn risk',
    field: 'churnRisk',
    sortable: true,
    filterable: true,
    width: 140,
    headerGroupId: 'meta',
  },
  {
    id: 'nps',
    header: 'NPS',
    field: 'nps',
    sortable: true,
    filterable: true,
    filterType: 'number',
    width: 110,
    headerGroupId: 'metrics',
  },
  {
    id: 'accountOwner',
    header: 'Owner',
    field: 'accountOwner',
    sortable: true,
    filterable: true,
    width: 160,
    headerGroupId: 'metrics',
    suppressMove: true,
  },
];

export const headerGroups: readonly BrickHeaderGroupDef[] = [
  { id: 'customer', label: 'Customer' },
  { id: 'status', label: 'Status & spend' },
  { id: 'meta', label: 'Account meta' },
  { id: 'metrics', label: 'Health metrics' },
];

export function createTableRows(size: number): readonly TableDocRow[] {
  const statuses: readonly TableDocRow['status'][] = ['Active', 'Paused', 'Trial'];
  const countries = ['Denmark', 'Germany', 'Sweden', 'France', 'Norway', 'Netherlands'];
  const plans: readonly TableDocRow['plan'][] = ['Free', 'Pro', 'Enterprise'];
  const churnLevels: readonly TableDocRow['churnRisk'][] = ['Low', 'Medium', 'High'];
  const owners = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
  return Array.from({ length: size }, (_, index) => ({
    id: index + 1,
    customer: `Customer ${index + 1}`,
    country: countries[index % countries.length],
    status: statuses[index % statuses.length],
    spend: ((index * 41) % 2000) + 120,
    createdAt: new Date(2025, index % 12, (index % 28) + 1).toISOString().slice(0, 10),
    plan: plans[index % plans.length],
    churnRisk: churnLevels[index % churnLevels.length],
    nps: (index * 7) % 100,
    accountOwner: owners[index % owners.length],
  }));
}
