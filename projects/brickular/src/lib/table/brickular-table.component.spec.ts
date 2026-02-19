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
    { id: 'name', header: 'Name', field: 'name', editable: true },
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
    expect(firstCell.getAttribute('tabindex')).toBe('-1');
    expect(secondCell.getAttribute('tabindex')).toBe('0');
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

  it('keeps header/filter/body widths in sync after resize (behavior contract)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const firstResizeHandle = fixture.debugElement.query(By.css('.b-table__resize-handle'));
    expect(firstResizeHandle).toBeTruthy();

    firstResizeHandle.triggerEventHandler(
      'mousedown',
      new MouseEvent('mousedown', { clientX: 120, bubbles: true }),
    );
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 180, bubbles: true }));
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

  it('applies text filter per column (behavior contract)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const textFilterInput = fixture.debugElement.query(
      By.css('.b-table__filter-row .b-table__filter-input[type="text"]'),
    );
    expect(textFilterInput).toBeTruthy();

    const inputEl = textFilterInput.nativeElement as HTMLInputElement;
    inputEl.value = 'Customer 3';
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const dataCells = fixture.debugElement.queryAll(By.css('.b-table__row .b-table__cell'));
    expect(dataCells.length).toBeGreaterThan(0);
    expect(dataCells[0].nativeElement.textContent.trim()).toBe('Customer 3');
  });

  it('moves between pages with footer controls (behavior contract)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const nextButton = fixture.debugElement
      .queryAll(By.css('.b-table__footer button'))
      .find((btn) => btn.nativeElement.textContent.includes('Next'));
    expect(nextButton).toBeTruthy();

    nextButton!.nativeElement.click();
    fixture.detectChanges();

    const firstDataCell = fixture.debugElement.queryAll(By.css('.b-table__row .b-table__cell'))[0];
    expect(firstDataCell.nativeElement.textContent.trim()).toBe('Customer 26');
  });

  it('toggles selection for visible rows via header checkbox (behavior contract)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const tableDebug = fixture.debugElement.query(By.directive(BrickTableComponent));
    const table = tableDebug.componentInstance as BrickTableComponent<DemoRow>;
    const selectionSpy = spyOn(table.selectionChange, 'emit');

    const headerCheckbox = fixture.debugElement.query(
      By.css('.b-table__header-select-cell input[type="checkbox"]'),
    );
    expect(headerCheckbox).toBeTruthy();

    headerCheckbox.nativeElement.click();
    fixture.detectChanges();

    expect(selectionSpy).toHaveBeenCalled();
    const payload = selectionSpy.calls.mostRecent().args[0] as { selectedRows: readonly DemoRow[] };
    expect(payload.selectedRows.length).toBeGreaterThan(0);
  });

  it('commits inline edits from editable cells (behavior contract)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const tableDebug = fixture.debugElement.query(By.directive(BrickTableComponent));
    const table = tableDebug.componentInstance as BrickTableComponent<DemoRow>;
    const editSpy = spyOn(table.editCommit, 'emit');

    const firstCell = fixture.debugElement.query(By.css('.b-table__row:first-child .b-table__cell'));
    firstCell.nativeElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();

    const editor = fixture.debugElement.query(By.css('.b-table__editor'));
    expect(editor).toBeTruthy();

    const inputEl = editor.nativeElement as HTMLInputElement;
    inputEl.value = 'Updated Customer';
    inputEl.dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(editSpy).toHaveBeenCalled();
    const commit = editSpy.calls.mostRecent().args[0] as {
      row: DemoRow;
      rowIndex: number;
      columnId: string;
      nextValue: string;
    };
    expect(commit.columnId).toBe('name');
    expect(commit.nextValue).toBe('Updated Customer');
  });
});
