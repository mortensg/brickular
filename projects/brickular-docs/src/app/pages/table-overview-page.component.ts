import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'docs-table-overview-page',
  template: `
    <section class="docs-page">
      <h1>Brickular Table Overview</h1>
      <p>
        Brickular Table is a standalone Angular table component focused on strong typing, performance, and an API
        designed for incremental feature growth.
      </p>

      <h2>What is included in v1</h2>
      <ul>
        <li>Typed column definitions with value getters, formatters, and custom comparators.</li>
        <li>Single and multi-column sorting, text/number/date filters, and quick filter search.</li>
        <li>Client-side pagination, row selection, inline cell editing, and row virtualization.</li>
        <li>Column reordering, resizing, and pinning with light/dark theme tokens.</li>
      </ul>

      <h2>Install</h2>
      <pre><code>npm install brickular</code></pre>

      <h2>Basic usage</h2>
      <pre><code>import &#123; BrickTableComponent &#125; from 'brickular';</code></pre>

      <h2>Migration note</h2>
      <p>
        Both <code>brickular</code> and <code>brickular/table</code> imports are supported in v1. Prefer
        <code>brickular</code> for new code and keep <code>brickular/table</code> for incremental migrations.
      </p>
    </section>
  `,
  styleUrl: './docs-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableOverviewPageComponent {}
