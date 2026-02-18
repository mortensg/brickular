import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrickBadgeComponent, BrickButtonComponent } from 'brickular';

@Component({
  selector: 'docs-home-page',
  imports: [RouterLink, BrickBadgeComponent, BrickButtonComponent],
  template: `
    <section class="docs-page">
      <h1>Brickular</h1>
      <p><b-badge tone="success">v0.1 ready</b-badge></p>
      <p>
        A modern Angular component library focused on scalable UI foundations and rich data-heavy components.
      </p>
      <p>Start with the table package and explore usage, examples, and API details.</p>
      <h2>Get started in 2 minutes</h2>
      <ol>
        <li><code>npm install brickular</code></li>
        <li><code>import &#123; BrickTableComponent &#125; from 'brickular';</code></li>
        <li>Add <code>BrickTableComponent</code> to your standalone component imports and pass <code>data</code>.</li>
      </ol>
      <p>
        <a routerLink="/table/overview">Go to table documentation</a>
        <b-button size="sm" tone="neutral">Preview Primitives</b-button>
      </p>
    </section>
  `,
  styleUrl: './docs-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {}
