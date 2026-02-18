import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { brickInputVariants } from './primitives-variants';

@Component({
  selector: 'b-input',
  imports: [CommonModule],
  template: `
    <input
      [class]="inputClass"
      [type]="type()"
      [value]="value()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      (input)="onInput($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickInputComponent {
  readonly type = input('text');
  readonly value = input('');
  readonly placeholder = input('');
  readonly disabled = input(false);

  readonly valueChange = output<string>();
  protected readonly inputClass = brickInputVariants();

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.valueChange.emit(value);
  }
}
