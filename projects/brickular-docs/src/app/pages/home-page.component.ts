import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrickBadgeComponent } from 'brickular';

@Component({
  selector: 'docs-home-page',
  imports: [RouterLink, BrickBadgeComponent],
  template: `
    <section class="docs-page">
      <h1>Brickular</h1>
      <p class="docs-lead">
        <b-badge tone="success">Angular 20+</b-badge>
        A component library for production Angular apps, starting with a typed, high-performance data table.
      </p>

      <h2>What's inside</h2>
      <ul>
        <li><strong>Data table</strong> — sorting, filtering, pagination, row selection, inline editing, row virtualization, column reorder/resize/pin, keyboard navigation, and theming.</li>
        <li><strong>Primitives</strong> — button, input, badge and other building blocks (see package exports).</li>
      </ul>

      <h2>Get started in three steps</h2>
      <ol class="docs-steps">
        <li>Install: <code>npm install brickular</code></li>
        <li>Import: <code>import &#123; BrickTableComponent &#125; from 'brickular';</code></li>
        <li>Use: add <code>BrickTableComponent</code> to your component's <code>imports</code>, then <code>&lt;b-table [data]="rows" [columnDefs]="columns" /&gt;</code></li>
      </ol>
      <p>Add the theme in your global styles: <code>@import 'brickular/styles/themes.css';</code> and a theme class (<code>brickular-theme-light</code> or <code>brickular-theme-dark</code>) on a root element.</p>

      <h2>Table documentation</h2>
      <ul class="docs-nav-links">
        <li><a routerLink="/table/overview">Table overview</a> — features and basic usage</li>
        <li><a routerLink="/table/examples">Table examples</a> — interactive demos with different data sizes and options</li>
        <li><a routerLink="/table/api">Table API</a> — inputs, outputs, column definition, and behavior</li>
      </ul>
    </section>
  `,
  styleUrl: './docs-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {}
