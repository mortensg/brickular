import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { BrickTableComponent } from 'brickular';
import { createTableRows, defaultColumns } from '../table-demo-data';

@Component({
  selector: 'docs-table-examples-page',
  imports: [BrickTableComponent],
  template: `
    <section class="docs-page">
      <h1>Table Examples</h1>
      <p>Use the controls to test how the table behaves with larger data sets and theme changes.</p>

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
      </div>

      <div [style.--b-row-height.px]="rowHeight()">
        <b-table [data]="rows()" [columnDefs]="columns" [paginationEnabled]="false" [rowHeight]="rowHeight()" />
      </div>
    </section>
  `,
  styleUrl: './docs-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableExamplesPageComponent {
  protected readonly columns = defaultColumns;
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
}
