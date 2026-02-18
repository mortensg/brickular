import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { brickButtonVariants } from './primitives-variants';

@Component({
  selector: 'b-button',
  imports: [CommonModule],
  template: `
    <button type="button" [disabled]="disabled()" [class]="classes()" (click)="buttonClick.emit()">
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickButtonComponent {
  readonly tone = input<'primary' | 'neutral'>('neutral');
  readonly size = input<'sm' | 'md'>('md');
  readonly disabled = input(false);

  readonly buttonClick = output<void>();

  protected classes(): string {
    return brickButtonVariants({
      tone: this.tone(),
      size: this.size(),
    });
  }
}
