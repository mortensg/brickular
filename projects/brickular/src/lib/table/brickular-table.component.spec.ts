import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrickRowData, BrickTableComponent, BrickTableColumnDef } from './index';

interface DemoRow extends BrickRowData {
  readonly id: number;
  readonly name: string;
  readonly age: number;
}

@Component({
  imports: [BrickTableComponent],
  template: `
    <b-table [data]="rows" [columnDefs]="columns" />
  `,
})
class HostComponent {
  readonly rows: readonly DemoRow[] = [
    { id: 1, name: 'Charlie', age: 36 },
    { id: 2, name: 'Alice', age: 29 },
    { id: 3, name: 'Bob', age: 41 },
  ];

  readonly columns: readonly BrickTableColumnDef<DemoRow>[] = [
    { id: 'name', header: 'Name', field: 'name' },
    { id: 'age', header: 'Age', field: 'age', filterType: 'number' },
  ];
}

describe('BrickTableComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it('renders rows from input data', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const rowEls = fixture.debugElement.queryAll(By.css('.b-table__row'));
    expect(rowEls.length).toBe(3);
  });

  it('sorts by column when header clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const firstHeader = fixture.debugElement.queryAll(By.css('.b-table__header-cell'))[0];
    firstHeader.triggerEventHandler('click', { shiftKey: false });
    fixture.detectChanges();

    const firstDataCell = fixture.debugElement.queryAll(By.css('.b-table__row .b-table__cell'))[0];
    expect(firstDataCell.nativeElement.textContent.trim()).toBe('Alice');
  });
});
