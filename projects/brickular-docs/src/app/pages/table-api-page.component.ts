import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'docs-table-api-page',
  template: `
    <section class="docs-page">
      <h1>Table API</h1>
      <p class="docs-lead">
        Reference for <code>b-table</code> inputs, outputs, and column definition. The v1 table API is stable; new features will be additive and backward-compatible.
      </p>

      <h2>Import</h2>
      <pre><code>import &#123; BrickTableComponent &#125; from 'brickular';
// or: import &#123; BrickTableComponent &#125; from 'brickular/table';</code></pre>

      <h2>Inputs</h2>
      <table class="docs-api-table">
        <thead>
          <tr><th>Input</th><th>Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>data</code></td><td><code>T[]</code></td><td>Rows to render.</td></tr>
          <tr><td><code>columnDefs</code></td><td><code>BrickTableColumnDef&lt;T&gt;[]</code></td><td>Column definitions (see below).</td></tr>
          <tr><td><code>rowHeight</code></td><td><code>number</code></td><td>Row height in px (for virtualization).</td></tr>
          <tr><td><code>defaultPageSize</code></td><td><code>number</code></td><td>Initial page size when pagination is enabled.</td></tr>
          <tr><td><code>pageSizeOptions</code></td><td><code>number[]</code></td><td>Page size dropdown options.</td></tr>
          <tr><td><code>paginationEnabled</code></td><td><code>boolean</code></td><td>Show pagination controls.</td></tr>
          <tr><td><code>selectionMode</code></td><td><code>'single' | 'multiple'</code></td><td>Row selection behavior.</td></tr>
          <tr><td><code>quickFilterPlaceholder</code></td><td><code>string</code></td><td>Placeholder for the quick-filter input.</td></tr>
        </tbody>
      </table>

      <h2>Outputs</h2>
      <table class="docs-api-table">
        <thead>
          <tr><th>Output</th><th>Payload</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>selectionChange</code></td><td><code>T | T[] | null</code></td><td>Emitted when selection changes.</td></tr>
          <tr><td><code>sortChange</code></td><td><code>BrickTableSortState</code></td><td>Emitted when sort state changes.</td></tr>
          <tr><td><code>pageChange</code></td><td><code>&#123; pageIndex: number; pageSize: number &#125;</code></td><td>Emitted when page or page size changes.</td></tr>
          <tr><td><code>editCommit</code></td><td><code>&#123; row: T; columnId: string; value: unknown &#125;</code></td><td>Emitted when an editable cell is committed.</td></tr>
        </tbody>
      </table>

      <h2>Column definition <code>BrickTableColumnDef&lt;T&gt;</code></h2>
      <table class="docs-api-table">
        <thead>
          <tr><th>Property</th><th>Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td><code>string</code></td><td>Unique column id.</td></tr>
          <tr><td><code>header</code></td><td><code>string</code></td><td>Header label.</td></tr>
          <tr><td><code>field</code></td><td><code>keyof T</code></td><td>Property key for cell value (optional if <code>valueGetter</code> is set).</td></tr>
          <tr><td><code>sortable</code></td><td><code>boolean</code></td><td>Enable header sort.</td></tr>
          <tr><td><code>filterable</code></td><td><code>boolean</code></td><td>Show column filter.</td></tr>
          <tr><td><code>editable</code></td><td><code>boolean</code></td><td>Allow inline edit.</td></tr>
          <tr><td><code>pinned</code></td><td><code>'left' | 'right'</code></td><td>Pin column to side.</td></tr>
          <tr><td><code>valueGetter</code></td><td><code>(row: T) =&gt; unknown</code></td><td>Custom value from row.</td></tr>
          <tr><td><code>valueFormatter</code></td><td><code>(value, row: T) =&gt; string</code></td><td>Format value for display.</td></tr>
          <tr><td><code>comparator</code></td><td><code>(a, b, rowA, rowB) =&gt; number</code></td><td>Custom sort comparison.</td></tr>
        </tbody>
      </table>

      <h2>Behavior and accessibility</h2>
      <ul>
        <li>Header, filter, and body column widths stay in sync on init, resize, and scroll.</li>
        <li>Column resize and reorder are independent (resize handle does not start drag).</li>
        <li>Horizontal scroll is synchronized between header and body.</li>
        <li>Cells and headers are focusable; <code>Enter</code> starts edit in editable cells.</li>
        <li>Selection uses checkbox semantics for assistive technologies.</li>
      </ul>
    </section>
  `,
  styleUrl: './docs-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableApiPageComponent {}
