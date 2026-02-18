import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

export class BrickTableHarness {
  constructor(private readonly root: DebugElement) {}

  rowCount(): number {
    return this.root.queryAll(By.css('.b-table__row')).length;
  }

  headerText(): readonly string[] {
    return this.root
      .queryAll(By.css('.b-table__header-cell'))
      .map((element) => element.nativeElement.textContent.trim());
  }
}
