import {
  computeHeaderGroupSegments,
  type HeaderGroupSegmentInputColumn,
} from './table-header-groups';

const GROUPS = [
  { id: 'g1', label: 'Group 1' },
  { id: 'g2', label: 'Group 2' },
];

function getWidth(_columnId: string): number {
  return 100;
}

describe('computeHeaderGroupSegments', () => {
  it('returns empty when no header groups', () => {
    const cols: HeaderGroupSegmentInputColumn[] = [
      { id: 'a', headerGroupId: 'g1' },
    ];
    expect(
      computeHeaderGroupSegments(cols, getWidth, [], 100, {
        draggingColumnId: null,
        dropTargetColumnId: null,
        draggingOriginalGroupId: null,
        dropGroupId: null,
      }),
    ).toEqual([]);
  });

  it('returns empty when no center columns', () => {
    expect(
      computeHeaderGroupSegments([], getWidth, GROUPS, 0, {
        draggingColumnId: null,
        dropTargetColumnId: null,
        draggingOriginalGroupId: null,
        dropGroupId: null,
      }),
    ).toEqual([]);
  });

  it('builds one segment per contiguous group when not dragging', () => {
    const cols: HeaderGroupSegmentInputColumn[] = [
      { id: 'a', headerGroupId: 'g1' },
      { id: 'b', headerGroupId: 'g1' },
      { id: 'c', headerGroupId: 'g2' },
    ];
    const segs = computeHeaderGroupSegments(cols, getWidth, GROUPS, 300, {
      draggingColumnId: null,
      dropTargetColumnId: null,
      draggingOriginalGroupId: null,
      dropGroupId: null,
    });
    expect(segs.length).toBe(2);
    expect(segs[0]).toEqual(jasmine.objectContaining({ id: 'g1', label: 'Group 1', columnStart: 0, columnSpan: 2, width: 200 }));
    expect(segs[1]).toEqual(jasmine.objectContaining({ id: 'g2', label: 'Group 2', columnStart: 2, columnSpan: 1, width: 100 }));
  });

  it('skips ungrouped columns (no segment)', () => {
    const cols: HeaderGroupSegmentInputColumn[] = [
      { id: 'a', headerGroupId: 'g1' },
      { id: 'b' },
      { id: 'c', headerGroupId: 'g2' },
    ];
    const segs = computeHeaderGroupSegments(cols, getWidth, GROUPS, 300, {
      draggingColumnId: null,
      dropTargetColumnId: null,
      draggingOriginalGroupId: null,
      dropGroupId: null,
    });
    expect(segs.length).toBe(2);
    expect(segs[0]).toEqual(jasmine.objectContaining({ id: 'g1', columnStart: 0, columnSpan: 1 }));
    expect(segs[1]).toEqual(jasmine.objectContaining({ id: 'g2', columnStart: 2, columnSpan: 1 }));
  });

  it('same-group reorder: no gap, dragged column stays in group', () => {
    const cols: HeaderGroupSegmentInputColumn[] = [
      { id: 'a', headerGroupId: 'g1' },
      { id: 'b', headerGroupId: 'g1' },
      { id: 'c', headerGroupId: 'g1' },
    ];
    const segs = computeHeaderGroupSegments(cols, getWidth, GROUPS, 300, {
      draggingColumnId: 'b',
      dropTargetColumnId: 'c',
      draggingOriginalGroupId: 'g1',
      dropGroupId: 'g1',
    });
    expect(segs.length).toBe(1);
    expect(segs[0]).toEqual(jasmine.objectContaining({ id: 'g1', columnStart: 0, columnSpan: 3, width: 300 }));
  });

  it('move to last in same group: one segment (ungroup only via 5px edge zones)', () => {
    const cols: HeaderGroupSegmentInputColumn[] = [
      { id: 'a', headerGroupId: 'g1' },
      { id: 'b', headerGroupId: 'g1' },
      { id: 'c', headerGroupId: 'g1' },
    ];
    const segs = computeHeaderGroupSegments(cols, getWidth, GROUPS, 300, {
      draggingColumnId: 'a',
      dropTargetColumnId: 'c',
      draggingOriginalGroupId: 'g1',
      dropGroupId: 'g1',
    });
    expect(segs.length).toBe(1);
    expect(segs[0].id).toBe('g1');
    expect(segs[0].columnSpan).toBe(3);
  });

  it('drop into another group: target group spans dragging slot (no split)', () => {
    const cols: HeaderGroupSegmentInputColumn[] = [
      { id: 'a', headerGroupId: 'g2' },
      { id: 'b', headerGroupId: 'g2' },
      { id: 'c', headerGroupId: 'g2' },
    ];
    // Dragging column 'b' from g1 into g2; in preview order b is between a and second g2 column
    const colsWithDrag: HeaderGroupSegmentInputColumn[] = [
      { id: 'a', headerGroupId: 'g2' },
      { id: 'b', headerGroupId: 'g1' },
      { id: 'c', headerGroupId: 'g2' },
    ];
    const segs = computeHeaderGroupSegments(colsWithDrag, getWidth, GROUPS, 300, {
      draggingColumnId: 'b',
      dropTargetColumnId: 'c',
      draggingOriginalGroupId: 'g1',
      dropGroupId: 'g2',
    });
    expect(segs.length).toBe(1);
    expect(segs[0]).toEqual(jasmine.objectContaining({ id: 'g2', columnStart: 0, columnSpan: 3, width: 300 }));
  });

  it('drop between groups: shows __drag-gap', () => {
    const colsWithDrag: HeaderGroupSegmentInputColumn[] = [
      { id: 'a', headerGroupId: 'g1' },
      { id: 'b', headerGroupId: 'g1' },
      { id: 'c', headerGroupId: 'g2' },
      { id: 'd', headerGroupId: 'g2' },
    ];
    const segs = computeHeaderGroupSegments(colsWithDrag, getWidth, GROUPS, 400, {
      draggingColumnId: 'c',
      dropTargetColumnId: 'd',
      draggingOriginalGroupId: 'g1',
      dropGroupId: null,
    });
    expect(segs.length).toBe(3);
    expect(segs[0]).toEqual(jasmine.objectContaining({ id: 'g1', columnSpan: 2 }));
    expect(segs[1]).toEqual(jasmine.objectContaining({ id: '__drag-gap', columnStart: 2, columnSpan: 1 }));
    expect(segs[2]).toEqual(jasmine.objectContaining({ id: 'g2', columnStart: 3, columnSpan: 1 }));
  });

  it('last column from A to start of B: target group spans from index 0', () => {
    const cols: HeaderGroupSegmentInputColumn[] = [
      { id: 'drag', headerGroupId: 'g1' },
      { id: 'b1', headerGroupId: 'g2' },
      { id: 'b2', headerGroupId: 'g2' },
    ];
    const segs = computeHeaderGroupSegments(cols, getWidth, GROUPS, 300, {
      draggingColumnId: 'drag',
      dropTargetColumnId: 'b1',
      draggingOriginalGroupId: 'g1',
      dropGroupId: 'g2',
    });
    expect(segs.length).toBe(1);
    expect(segs[0]).toEqual(jasmine.objectContaining({ id: 'g2', columnStart: 0, columnSpan: 3, width: 300 }));
  });

  it('adjusts last segment width to match totalWidth', () => {
    const cols: HeaderGroupSegmentInputColumn[] = [
      { id: 'a', headerGroupId: 'g1' },
      { id: 'b', headerGroupId: 'g1' },
    ];
    const segs = computeHeaderGroupSegments(cols, getWidth, GROUPS, 199, {
      draggingColumnId: null,
      dropTargetColumnId: null,
      draggingOriginalGroupId: null,
      dropGroupId: null,
    });
    expect(segs.length).toBe(1);
    expect(segs[0].width).toBe(199);
  });
});
