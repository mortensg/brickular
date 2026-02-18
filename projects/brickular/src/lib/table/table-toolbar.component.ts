import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { tableToolbarControlVariants } from './table-variants';

@Component({
  selector: 'b-table-toolbar',
  imports: [CommonModule],
  template: `
    <header class="b-table__toolbar flex items-center justify-between gap-3">
      <label class="b-table__toolbar-search">
        <span class="b-visually-hidden">Quick filter</span>
        <input
          [class]="toolbarInputClass"
          type="text"
          [value]="quickFilter()"
          [placeholder]="quickFilterPlaceholder()"
          (input)="onQuickFilterInput($event)"
        />
      </label>
      @if (paginationEnabled()) {
        <label class="b-table__toolbar-pagesize inline-flex items-center gap-2">
          <span>Rows</span>
          <select [class]="toolbarControlClass" [value]="pageSize()" (change)="onPageSizeChange($event)">
            @for (size of pageSizeOptions(); track size) {
              <option [value]="size">{{ size }}</option>
            }
          </select>
        </label>
      }
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickTableToolbarComponent {
  readonly quickFilter = input('');
  readonly quickFilterPlaceholder = input('Search table...');
  readonly paginationEnabled = input(true);
  readonly pageSize = input(25);
  readonly pageSizeOptions = input<readonly number[]>([10, 25, 50, 100]);

  readonly quickFilterChange = output<string>();
  readonly pageSizeChange = output<number>();
  protected readonly toolbarControlClass = tableToolbarControlVariants();
  protected readonly toolbarInputClass = `${tableToolbarControlVariants()} min-w-[240px]`;

  protected onQuickFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.quickFilterChange.emit(value);
  }

  protected onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSizeChange.emit(value);
  }
}
