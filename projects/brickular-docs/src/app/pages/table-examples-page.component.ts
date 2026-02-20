import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrickTableComponent } from 'brickular';
import { createTableRows, defaultColumns, headerGroups, TableDocRow } from '../table-demo-data';

@Component({
  selector: 'docs-table-examples-page',
  imports: [RouterLink, BrickTableComponent],
  template: `
    <section class="docs-page">
      <h1>Table examples</h1>
      <p class="docs-lead">
        Interactive demos with configurable row count and compact mode. Use the controls below to see sorting, filtering, virtualization, and keyboard behavior with different data sizes.
      </p>
      <p>For full input/output and column options, see the <a routerLink="/table/api">Table API</a> page.</p>

      <div class="docs-controls">
        <label>
          Data size
          <select [value]="rowCount()" (change)="onRowsChange($event)">
            <option value="100">100</option>
            <option value="1000">1,000</option>
            <option value="10000">10,000</option>
          </select>
        </label>
        <label>
          <input type="checkbox" [checked]="compactMode()" (change)="toggleCompact($event)" />
          Compact rows
        </label>
        <button type="button" (click)="onAutoSizeClick(table)">Auto-size columns</button>
      </div>

      <div [style.--b-row-height.px]="rowHeight()">
        <b-table
          #table
          [data]="rows()"
          [columnDefs]="columns"
          [paginationEnabled]="false"
          [rowHeight]="rowHeight()"
          [autoHeaderHeight]="true"
          [headerGroups]="headerGroups"
        />
      </div>
    </section>
  `,
  styleUrl: './docs-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableExamplesPageComponent {
  protected readonly columns = defaultColumns;
  protected readonly headerGroups = headerGroups;
  protected readonly rowCount = signal(1000);
  protected readonly compactMode = signal(false);
  protected readonly rows = computed(() => createTableRows(this.rowCount()));
  protected readonly rowHeight = computed(() => (this.compactMode() ? 34 : 42));

  protected onRowsChange(event: Event): void {
    const nextSize = Number((event.target as HTMLSelectElement).value);
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }
    this.rowCount.set(nextSize);
  }

  protected toggleCompact(event: Event): void {
    this.compactMode.set((event.target as HTMLInputElement).checked);
  }

  protected onAutoSizeClick(table: BrickTableComponent<TableDocRow>): void {
    table.autoSizeColumns();
  }
}
