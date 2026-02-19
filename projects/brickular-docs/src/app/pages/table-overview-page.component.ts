import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'docs-table-overview-page',
  imports: [RouterLink],
  template: `
    <section class="docs-page">
      <h1>Table overview</h1>
      <p class="docs-lead">
        <code>b-table</code> is a standalone Angular table component with strong typing, row virtualization, and an API designed for large datasets and incremental adoption.
      </p>

      <h2>Features</h2>
      <ul>
        <li><strong>Typed columns</strong> — <code>BrickTableColumnDef&lt;T&gt;</code> with optional <code>field</code>, <code>valueGetter</code>, <code>valueFormatter</code>, and <code>comparator</code>.</li>
        <li><strong>Sorting</strong> — single or multi-column; click headers (Shift+click to add).</li>
        <li><strong>Filtering</strong> — text, number, and date filters per column, plus a quick-filter search.</li>
        <li><strong>Pagination</strong> — client-side with configurable page size and options.</li>
        <li><strong>Selection</strong> — single or multiple row selection; optional checkbox column.</li>
        <li><strong>Editing</strong> — optional inline cell editing with commit/cancel events.</li>
        <li><strong>Virtualization</strong> — only visible rows are rendered for smooth scrolling with large data.</li>
        <li><strong>Columns</strong> — drag to reorder; resize via handle; pin left/right via header context menu.</li>
        <li><strong>Keyboard</strong> — arrow keys, Tab, Home, End; focus is restored when the active cell scrolls out of view.</li>
        <li><strong>Theming</strong> — CSS variables; light and dark themes included.</li>
      </ul>

      <h2>Install</h2>
      <pre><code>npm install brickular</code></pre>

      <h2>Basic usage</h2>
      <pre><code>import &#123; BrickTableComponent &#125; from 'brickular';

&#64;Component(&#123;
  imports: [BrickTableComponent],
  template: '&lt;b-table [data]="rows" [columnDefs]="columns" /&gt;',
&#125;)
export class MyComponent &#123;
  rows = [ &#123; id: 1, name: 'Alice' &#125;, &#123; id: 2, name: 'Bob' &#125; ];
  columns = [
    &#123; id: 'name', header: 'Name', field: 'name' &#125;,
  ];
&#125;</code></pre>

      <h2>Theme</h2>
      <p>In your global styles (e.g. <code>styles.css</code>):</p>
      <pre><code>@import 'brickular/styles/themes.css';</code></pre>
      <p>Then add <code>brickular-theme-light</code> or <code>brickular-theme-dark</code> on a root element (e.g. <code>&lt;body&gt;</code> or your app shell).</p>

      <h2>Next steps</h2>
      <p>
        <a routerLink="/table/examples">Table examples</a> — try different data sizes and options.
        <a routerLink="/table/api">Table API</a> — full inputs, outputs, and column definition reference.
      </p>
    </section>
  `,
  styleUrl: './docs-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableOverviewPageComponent {}
