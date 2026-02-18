import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'docs-home-page',
  imports: [RouterLink],
  template: `
    <section class="docs-page">
      <h1>Brickular</h1>
      <p>
        A modern Angular component library focused on scalable UI foundations and rich data-heavy components.
      </p>
      <p>Start with the table package and explore usage, examples, and API details.</p>
      <p><a routerLink="/table/overview">Go to table documentation</a></p>
    </section>
  `,
  styleUrl: './docs-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {}
