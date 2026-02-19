import { BRICK_SELECT_COLUMN_ID } from './table-types';

export interface ColumnReorderAnimatorConfig {
  headElement: HTMLElement;
  bodyElement: HTMLElement;
  maxAnimatedRows?: number;
  durationMs?: number;
  easing?: string;
}

type PositionSnapshot = Map<string, { element: HTMLElement; left: number }>;

export class ColumnReorderAnimator {
  private readonly headElement: HTMLElement;
  private readonly bodyElement: HTMLElement;
  private readonly maxAnimatedRows: number;
  private readonly durationMs: number;
  private readonly easing: string;
  private readonly animatedElements = new Set<HTMLElement>();
  private beforePositions: PositionSnapshot = new Map();

  constructor(config: ColumnReorderAnimatorConfig) {
    this.headElement = config.headElement;
    this.bodyElement = config.bodyElement;
    this.maxAnimatedRows = config.maxAnimatedRows ?? 50;
    this.durationMs = config.durationMs ?? 180;
    this.easing = config.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)';
  }

  captureBefore(): void {
    // Do not reset here; resetting every dragover interrupts in-flight transitions.
    this.beforePositions = this.capturePositions();
  }

  animateAfter(): void {
    if (this.beforePositions.size === 0) {
      return;
    }
    const afterPositions = this.capturePositions();
    for (const [key, before] of this.beforePositions.entries()) {
      const after = afterPositions.get(key);
      if (!after) {
        continue;
      }
      const deltaX = before.left - after.left;
      if (Math.abs(deltaX) < 1) {
        continue;
      }
      this.playFlip(after.element, deltaX);
    }
    this.beforePositions.clear();
  }

  reset(): void {
    for (const element of this.animatedElements) {
      element.style.removeProperty('transform');
      element.style.removeProperty('transition');
      element.style.removeProperty('will-change');
    }
    this.animatedElements.clear();
    // Defensive cleanup: if a transition was interrupted (drop/cancel/rapid updates),
    // clear any leftover inline animation styles from all animatable cells.
    const allAnimatable = [
      ...this.headElement.querySelectorAll<HTMLElement>('[data-column-id]'),
      ...this.bodyElement.querySelectorAll<HTMLElement>('[data-nav-row][data-column-id]'),
    ];
    for (const element of allAnimatable) {
      element.style.removeProperty('transform');
      element.style.removeProperty('transition');
      element.style.removeProperty('will-change');
    }
  }

  private capturePositions(): PositionSnapshot {
    const snapshot: PositionSnapshot = new Map();

    const headerCells = this.headElement.querySelectorAll<HTMLElement>(
      '.b-table__header-row [data-column-id]',
    );
    headerCells.forEach((element) => {
      const columnId = element.getAttribute('data-column-id');
      if (!columnId || columnId === BRICK_SELECT_COLUMN_ID) {
        return;
      }
      snapshot.set(`header:${columnId}`, { element, left: element.getBoundingClientRect().left });
    });

    const filterCells = this.headElement.querySelectorAll<HTMLElement>(
      '.b-table__filter-row [data-column-id]',
    );
    filterCells.forEach((element) => {
      const columnId = element.getAttribute('data-column-id');
      if (!columnId || columnId === BRICK_SELECT_COLUMN_ID) {
        return;
      }
      snapshot.set(`filter:${columnId}`, { element, left: element.getBoundingClientRect().left });
    });

    if (this.maxAnimatedRows <= 0) {
      return snapshot;
    }

    const bodyCells = this.bodyElement.querySelectorAll<HTMLElement>(
      '.b-table__cell[data-nav-row][data-column-id], .b-table__select-cell[data-nav-row][data-column-id]',
    );
    bodyCells.forEach((element) => {
      const rowAttr = element.getAttribute('data-nav-row');
      const columnId = element.getAttribute('data-column-id');
      if (rowAttr === null || !columnId || columnId === BRICK_SELECT_COLUMN_ID) {
        return;
      }
      const rowIndex = Number(rowAttr);
      if (!Number.isFinite(rowIndex) || rowIndex < 0 || rowIndex >= this.maxAnimatedRows) {
        return;
      }
      snapshot.set(`body:${rowAttr}:${columnId}`, { element, left: element.getBoundingClientRect().left });
    });

    return snapshot;
  }

  private playFlip(element: HTMLElement, deltaX: number): void {
    this.animatedElements.add(element);
    element.style.transition = 'none';
    element.style.willChange = 'transform';
    element.style.transform = `translateX(${deltaX}px)`;
    element.getBoundingClientRect();
    element.style.transition = `transform ${this.durationMs}ms ${this.easing}`;
    element.style.transform = '';

    const cleanup = (): void => {
      if (element.style.transform === '') {
        element.style.removeProperty('transform');
      }
      element.style.removeProperty('transition');
      element.style.removeProperty('will-change');
      this.animatedElements.delete(element);
      element.removeEventListener('transitionend', onTransitionEnd);
    };
    const onTransitionEnd = (event: TransitionEvent): void => {
      if (event.propertyName !== 'transform') {
        return;
      }
      cleanup();
    };
    element.addEventListener('transitionend', onTransitionEnd);
  }
}
