# brickular

Angular component library with a **typed, high-performance data table**: sorting, filtering, pagination, row selection, virtualization, column reorder/resize/pin, and theming.

**Requires Angular 20+.**

## Install

```bash
npm install brickular
```

## Quick start

1. **Import the table** in your standalone component:

```ts
import { BrickTableComponent } from 'brickular';

@Component({
  imports: [BrickTableComponent],
  template: `<b-table [data]="data" [columnDefs]="columnDefs" />`,
})
export class MyTableComponent {
  data = [
    { id: 1, name: 'Alice', role: 'Admin' },
    { id: 2, name: 'Bob', role: 'User' },
  ];
  columnDefs = [
    { id: 'name', header: 'Name', field: 'name' },
    { id: 'role', header: 'Role', field: 'role' },
  ];
}
```

2. **Add the theme** in your global styles (e.g. `styles.css`):

```css
@import 'brickular/styles/themes.css';
```

3. **Apply a theme class** on a root element (e.g. `<body>` or your app shell):

```html
<body class="brickular-theme-light">
  <!-- or brickular-theme-dark -->
</body>
```

## Table features

- **Typed columns** — `BrickTableColumnDef<T>` with optional `field`, `valueGetter`, `valueFormatter`, `comparator`
- **Sorting** — single/multi-column, configurable per column
- **Filtering** — text, number, date filters + quick filter
- **Pagination** — client-side, configurable page size and options
- **Selection** — single or multiple row selection (`selectionMode`), `selectionChange` output
- **Editing** — optional inline cell edit, `editCommit` / `cancelEdit` outputs
- **Virtualization** — row virtualization for large lists
- **Columns** — drag to reorder, resize handles, pin left/right (via context menu)
- **Keyboard** — arrow keys, Tab, Home, End; focus restored when scrolling
- **Theming** — CSS variables; light/dark themes included

## Subpath imports

```ts
import { BrickTableComponent } from 'brickular/table';
import { BrickButtonComponent, BrickInputComponent, BrickBadgeComponent } from 'brickular/primitives';
```

## Documentation

**[Full docs and live examples](https://mortensg.github.io/brickular/)**

- [Table overview](https://mortensg.github.io/brickular/table/overview)
- [Table examples](https://mortensg.github.io/brickular/table/examples)
- [Table API](https://mortensg.github.io/brickular/table/api)

For a detailed list of **behavior guarantees** that P1 commits to (sorting, filtering, pagination, selection, column reorder/resize/pin, keyboard navigation, and virtualization), see `TABLE_BEHAVIOR_CONTRACT_P1.md` in the package root.

## API summary

| Inputs | Outputs |
|--------|---------|
| `data`, `columnDefs` | `selectionChange` |
| `defaultPageSize`, `pageSizeOptions`, `rowHeight` | `sortChange`, `pageChange` |
| `selectionMode` (`'single'` \| `'multiple'`) | `editCommit` |
| `paginationEnabled`, `quickFilter`, … | |

Column def: `id`, `header`, `field?`, `sortable?`, `filterable?`, `editable?`, `pinned?`, `valueGetter?`, `valueFormatter?`, `comparator?`, and more.

## License

MIT
