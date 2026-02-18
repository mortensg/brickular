import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'b-table-footer',
  imports: [CommonModule],
  template: `
    @if (paginationEnabled()) {
      <footer class="b-table__footer flex items-center justify-between gap-3">
        <button type="button" (click)="goToPage(pageIndex() - 1)" [disabled]="pageIndex() <= 0">
          Previous
        </button>
        <span>Page {{ pageIndex() + 1 }} / {{ totalPages() }}</span>
        <button type="button" (click)="goToPage(pageIndex() + 1)" [disabled]="pageIndex() + 1 >= totalPages()">
          Next
        </button>
      </footer>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickTableFooterComponent {
  readonly paginationEnabled = input(true);
  readonly pageIndex = input(0);
  readonly totalPages = input(1);

  readonly pageIndexChange = output<number>();

  protected goToPage(nextPageIndex: number): void {
    this.pageIndexChange.emit(nextPageIndex);
  }
}
