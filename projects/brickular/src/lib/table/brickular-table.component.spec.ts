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
  readonly rows: readonly DemoRow[] = Array.from({ length: 40 }, (_, index) => ({
    id: index + 1,
    name: `Customer ${index + 1}`,
    age: 18 + (index % 50),
  }));

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
    expect(rowEls.length).toBeGreaterThan(0);
  });

  it('sorts by column when header clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const firstHeader = fixture.debugElement.queryAll(By.css('.b-table__header-cell'))[0];
    firstHeader.triggerEventHandler('click', { shiftKey: false });
    fixture.detectChanges();

    const firstDataCell = fixture.debugElement.queryAll(By.css('.b-table__row .b-table__cell'))[0];
    expect(firstDataCell.nativeElement.textContent.trim()).toBe('Customer 1');
  });

  it('keeps header/filter/body widths in sync after resize', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const firstResizeHandle = fixture.debugElement.query(By.css('.b-table__resize-handle'));
    expect(firstResizeHandle).toBeTruthy();

    firstResizeHandle.triggerEventHandler(
      'mousedown',
      new MouseEvent('mousedown', { clientX: 100, bubbles: true }),
    );
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 160, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    fixture.detectChanges();

    const headerCell = fixture.debugElement.query(By.css('.b-table__header-cell'));
    const filterCell = fixture.debugElement.query(By.css('.b-table__filter-cell'));
    const bodyCell = fixture.debugElement.query(By.css('.b-table__row .b-table__cell'));

    const headerWidth = headerCell.nativeElement.style.width;
    const filterWidth = filterCell.nativeElement.style.width;
    const bodyWidth = bodyCell.nativeElement.style.width;

    expect(headerWidth).toBeTruthy();
    expect(headerWidth).toEqual(filterWidth);
    expect(headerWidth).toEqual(bodyWidth);
  });

  it('does not start reorder drag while resizing is active', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.directive(BrickTableComponent)).componentInstance as BrickTableComponent;
    const dragStartEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      dataTransfer: {
        setData: jasmine.createSpy('setData'),
        effectAllowed: 'move',
      },
    } as unknown as DragEvent;

    (table as unknown as { isResizing: { set: (value: boolean) => void } }).isResizing.set(true);
    (table as unknown as { onHeaderDragStart: (columnId: string, event: DragEvent) => void }).onHeaderDragStart(
      'name',
      dragStartEvent,
    );

    expect(dragStartEvent.preventDefault).toHaveBeenCalled();
    expect(dragStartEvent.dataTransfer?.setData).not.toHaveBeenCalled();
  });

  it('synchronizes header horizontal scroll with viewport scroll', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const viewport = fixture.debugElement.query(By.css('.b-table__viewport')).nativeElement as HTMLDivElement;
    const headScroller = fixture.debugElement.query(By.css('.b-table__head-scroller')).nativeElement as HTMLDivElement;

    viewport.scrollLeft = 48;
    viewport.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(headScroller.scrollLeft).toBe(48);
  });

  it('moves focus with arrow key navigation between cells', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const firstRowCells = fixture.debugElement.queryAll(By.css('.b-table__row:first-child .b-table__cell'));
    const firstCell = firstRowCells[0].nativeElement as HTMLElement;
    const secondCell = firstRowCells[1].nativeElement as HTMLElement;

    firstCell.focus();
    firstCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(document.activeElement).toBe(secondCell);
  });

  it('focuses data cell on click without selecting row', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const firstCell = fixture.debugElement.query(By.css('.b-table__row:first-child .b-table__cell'));
    firstCell.nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(document.activeElement).toBe(firstCell.nativeElement);
    expect(firstCell.nativeElement.classList.contains('b-table__cell--selected')).toBeFalse();
  });
});
