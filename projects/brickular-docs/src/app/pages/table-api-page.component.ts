import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'docs-table-api-page',
  template: `
    <section class="docs-page">
      <h1>Table API</h1>
      <h2>Core inputs</h2>
      <ul>
        <li><code>data</code>: rows to render.</li>
        <li><code>columnDefs</code>: typed column definitions.</li>
        <li><code>defaultPageSize</code>, <code>pageSizeOptions</code>, <code>rowHeight</code>.</li>
        <li><code>selectionMode</code>: single or multiple selection.</li>
      </ul>

      <h2>Outputs</h2>
      <ul>
        <li><code>selectionChange</code></li>
        <li><code>sortChange</code></li>
        <li><code>pageChange</code></li>
        <li><code>editCommit</code></li>
      </ul>

      <h2>Column definition highlights</h2>
      <pre><code>interface BrickTableColumnDef&lt;T&gt; &#123;
  id: string;
  header: string;
  field?: keyof T;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  valueGetter?: (row: T) =&gt; unknown;
  valueFormatter?: (value: unknown, row: T) =&gt; string;
  comparator?: (a: unknown, b: unknown, rowA: T, rowB: T) =&gt; number;
&#125;</code></pre>
    </section>
  `,
  styleUrl: './docs-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableApiPageComponent {}
