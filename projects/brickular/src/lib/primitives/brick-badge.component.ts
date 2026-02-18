import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { brickBadgeVariants } from './primitives-variants';

@Component({
  selector: 'b-badge',
  imports: [CommonModule],
  template: `
    <span [class]="classes()">
      <ng-content />
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickBadgeComponent {
  readonly tone = input<'neutral' | 'success' | 'warning'>('neutral');

  protected classes(): string {
    return brickBadgeVariants({ tone: this.tone() });
  }
}
