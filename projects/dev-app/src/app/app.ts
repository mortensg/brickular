import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BrickRowData, BrickTableColumnDef, BrickTableComponent } from 'brickular';

@Component({
  selector: 'dev-root',
  imports: [BrickTableComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('Brickular Dev');
  protected readonly darkMode = signal(false);
  protected readonly columnDefs: readonly BrickTableColumnDef<DemoRow>[] = [
    {
      id: 'id',
      header: 'ID',
      field: 'id',
      sortable: true,
      filterable: true,
      width: 90,
      pinnable: true,
      pinned: 'left',
      filterType: 'number',
    },
    {
      id: 'name',
      header: 'Name',
      field: 'name',
      sortable: true,
      filterable: true,
      editable: true,
      width: 220,
    },
    {
      id: 'company',
      header: 'Company',
      field: 'company',
      sortable: true,
      filterable: true,
      width: 220,
    },
    {
      id: 'score',
      header: 'Score',
      field: 'score',
      sortable: true,
      filterable: true,
      filterType: 'number',
      width: 120,
      valueFormatter: (value) => `${Number(value).toFixed(1)}%`,
    },
    {
      id: 'createdAt',
      header: 'Created',
      field: 'createdAt',
      sortable: true,
      filterable: true,
      filterType: 'date',
      width: 170,
    },
  ];

  protected readonly rows = signal<readonly DemoRow[]>(createRows(500));

  protected toggleTheme(): void {
    this.darkMode.update((value) => !value);
  }
}

interface DemoRow extends BrickRowData {
  readonly id: number;
  readonly name: string;
  readonly company: string;
  readonly score: number;
  readonly createdAt: string;
}

function createRows(size: number): readonly DemoRow[] {
  return Array.from({ length: size }, (_, index) => ({
    id: index + 1,
    name: `User ${index + 1}`,
    company: `Company ${index % 23}`,
    score: Math.round(((index * 37) % 101) * 10) / 10,
    createdAt: new Date(2024, index % 12, (index % 28) + 1).toISOString().slice(0, 10),
  }));
}
