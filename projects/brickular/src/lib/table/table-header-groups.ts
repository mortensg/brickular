/**
 * Pure logic for computing header group segments (group row cells) from center columns and drag state.
 * Two-phase: (1) effective segment key per column index, (2) merge contiguous keys into segments.
 * Used by the table header to render the group row without a long stateful loop in the component.
 */

export interface HeaderGroupSegmentInputColumn {
  readonly id: string;
  readonly headerGroupId?: string;
}

export interface ComputeHeaderGroupSegmentsOptions {
  readonly draggingColumnId: string | null;
  readonly dropTargetColumnId: string | null;
  readonly draggingOriginalGroupId: string | null;
  /** Group id of the column under the cursor (drop target). Ungroup is via 5px edge zones, not a full __drag-gap. */
  readonly dropGroupId: string | null;
  /** Dragged column's group from def/override (no drop-target check). When dropGroupId is null, use this so the group band keeps full width (e.g. over drag slot). */
  readonly draggingColumnSourceGroupId?: string | null;
  /** True when drop would ungroup (5px edge). Dragging column then gets __drag-gap so no group name shows above placeholder. */
  readonly dropTargetUngroupAtEdge?: boolean;
}

export interface HeaderGroupSegment {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly columnStart: number;
  readonly columnSpan: number;
}

/** Describes one logical "section" of the header: a group, ungrouped columns, or drag placeholder. */
export type HeaderSectionDescriptor =
  | {
      readonly type: 'group';
      readonly id: string;
      readonly label: string;
      readonly columnStart: number;
      readonly columnSpan: number;
      readonly columnIds: string[];
    }
  | {
      readonly type: 'ungrouped';
      readonly columnStart: number;
      readonly columnSpan: number;
      readonly columnIds: string[];
    }
  | {
      readonly type: 'drag-gap';
      readonly columnStart: number;
      readonly columnSpan: number;
      readonly width: number;
    };

/**
 * Computes the list of group row segments (and optional __drag-gap) for the center pane.
 *
 * - Normal column: segment key = its headerGroupId if in headerGroups, else null (ungrouped, no segment).
 * - Dragging column: same-group reorder → original group; drop into a group (or over group edge) → that group; else __drag-gap (over ungrouped area only).
 * Contiguous indices with the same key are merged into one segment. Last segment width is adjusted so total matches totalWidth.
 */
export function computeHeaderGroupSegments(
  centerColumns: readonly HeaderGroupSegmentInputColumn[],
  getWidth: (columnId: string) => number,
  headerGroups: readonly { id: string; label: string }[],
  totalWidth: number,
  options: ComputeHeaderGroupSegmentsOptions,
): HeaderGroupSegment[] {
  if (headerGroups.length === 0 || centerColumns.length === 0) {
    return [];
  }

  const labelById = new Map(headerGroups.map((g) => [g.id, g.label]));
  const {
    draggingColumnId,
    draggingOriginalGroupId,
    dropGroupId,
    draggingColumnSourceGroupId,
    dropTargetUngroupAtEdge,
  } = options;

  // Phase 1: effective segment key per index (string = group id or '__drag-gap', null = ungrouped)
  const keys: (string | null)[] = [];
  for (const col of centerColumns) {
    if (col.id === draggingColumnId) {
      const sameGroupReorder =
        draggingOriginalGroupId != null &&
        (dropGroupId == null || dropGroupId === draggingOriginalGroupId);
      if (sameGroupReorder) {
        keys.push(draggingOriginalGroupId);
      } else if (dropTargetUngroupAtEdge) {
        keys.push('__drag-gap');
      } else if (dropGroupId != null) {
        keys.push(dropGroupId);
      } else if (
        draggingColumnSourceGroupId != null &&
        labelById.has(draggingColumnSourceGroupId)
      ) {
        keys.push(draggingColumnSourceGroupId);
      } else {
        keys.push('__drag-gap');
      }
    } else {
      const gid = col.headerGroupId;
      keys.push(gid != null && labelById.has(gid) ? gid : null);
    }
  }

  // Phase 2: merge contiguous same key into segments (skip null)
  const segments: HeaderGroupSegment[] = [];
  let i = 0;
  while (i < centerColumns.length) {
    const key = keys[i];
    if (key === null) {
      i++;
      continue;
    }
    const start = i;
    let width = 0;
    while (i < centerColumns.length && keys[i] === key) {
      width += Math.round(getWidth(centerColumns[i].id));
      i++;
    }
    const columnSpan = i - start;
    if (key === '__drag-gap') {
      segments.push({ id: '__drag-gap', label: '', width, columnStart: start, columnSpan });
    } else {
      segments.push({
        id: key,
        label: labelById.get(key) ?? key,
        width,
        columnStart: start,
        columnSpan,
      });
    }
  }

  // Phase 3: adjust last segment so total width matches totalWidth
  if (segments.length > 0 && totalWidth > 0) {
    const sum = segments.reduce((s, seg) => s + seg.width, 0);
    const diff = totalWidth - sum;
    if (diff !== 0) {
      const last = segments[segments.length - 1];
      segments[segments.length - 1] = { ...last, width: Math.max(0, last.width + diff) };
    }
  }

  return segments;
}

/**
 * Builds an ordered list of header sections from center columns and segments.
 * Each section is either a group (with column ids), an ungrouped run (column ids), or a drag-gap placeholder.
 * Used to render the nested DOM: header-container > section > group-container | column-header(s).
 */
export function computeHeaderSectionDescriptors(
  centerColumns: readonly HeaderGroupSegmentInputColumn[],
  segments: readonly HeaderGroupSegment[],
): HeaderSectionDescriptor[] {
  const sections: HeaderSectionDescriptor[] = [];
  let colIndex = 0;

  for (const seg of segments) {
    // Ungrouped run before this segment
    if (seg.columnStart > colIndex) {
      const columnIds = centerColumns
        .slice(colIndex, seg.columnStart)
        .map((c) => c.id);
      if (columnIds.length > 0) {
        sections.push({
          type: 'ungrouped',
          columnStart: colIndex,
          columnSpan: columnIds.length,
          columnIds,
        });
      }
      colIndex = seg.columnStart;
    }

    // This segment
    if (seg.id === '__drag-gap') {
      sections.push({
        type: 'drag-gap',
        columnStart: seg.columnStart,
        columnSpan: seg.columnSpan,
        width: seg.width,
      });
    } else {
      const columnIds = centerColumns
        .slice(seg.columnStart, seg.columnStart + seg.columnSpan)
        .map((c) => c.id);
      sections.push({
        type: 'group',
        id: seg.id,
        label: seg.label,
        columnStart: seg.columnStart,
        columnSpan: seg.columnSpan,
        columnIds,
      });
    }
    colIndex = seg.columnStart + seg.columnSpan;
  }

  // Ungrouped run after last segment
  if (colIndex < centerColumns.length) {
    const columnIds = centerColumns.slice(colIndex).map((c) => c.id);
    if (columnIds.length > 0) {
      sections.push({
        type: 'ungrouped',
        columnStart: colIndex,
        columnSpan: columnIds.length,
        columnIds,
      });
    }
  }

  return sections;
}
