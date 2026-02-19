# Brickular

**Brickular** is an Angular component library built for production apps. The first release centers on a **typed, high-performance data table** with sorting, filtering, pagination, selection, and virtualization.

## Documentation

**[Full documentation & live examples →](https://mortensg.github.io/brickular/)**

- [Table overview](https://mortensg.github.io/brickular/table/overview) — features and usage
- [Table examples](https://mortensg.github.io/brickular/table/examples) — interactive demos
- [Table API](https://mortensg.github.io/brickular/table/api) — inputs, outputs, and types

## Quick start

```bash
npm install brickular
```

In your Angular component:

```ts
import { BrickTableComponent } from 'brickular';

@Component({
  imports: [BrickTableComponent],
  template: `<b-table [data]="rows" [columnDefs]="columns" />`,
})
export class MyComponent {
  rows = [
    { id: 1, name: 'Alice', role: 'Admin' },
    { id: 2, name: 'Bob', role: 'User' },
  ];
  columns = [
    { id: 'name', header: 'Name', field: 'name' },
    { id: 'role', header: 'Role', field: 'role' },
  ];
}
```

Add the theme (e.g. in `styles.css`):

```css
@import 'brickular/styles/themes.css';
```

Then wrap your app (or layout) with a theme class: `brickular-theme-light` or `brickular-theme-dark`.

## Table features

| Feature            | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| **Typed API**      | `BrickTableColumnDef<T>` with value getters, formatters, comparators |
| **Sorting**        | Single and multi-column, ascending/descending                        |
| **Filtering**      | Text, number, and date filters plus quick-filter search              |
| **Pagination**     | Client-side with configurable page size                              |
| **Selection**      | Single or multiple row selection with checkboxes                     |
| **Editing**        | Inline cell edit with commit/cancel events                           |
| **Virtualization** | Row virtualization for large datasets                                |
| **Columns**        | Reorder (drag), resize, pin left/right                               |
| **Theming**        | CSS variables; light and dark themes included                        |

## Workspace structure

| Project                   | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `projects/brickular`      | Publishable library (npm package `brickular`) |
| `projects/brickular-docs` | Documentation site (GitHub Pages)             |
| `projects/dev-app`        | Local playground for development              |

## Development

```bash
# Install dependencies
pnpm install

# Run docs site locally
pnpm run start:docs

# Run library tests
pnpm run test:lib

# Run docs e2e (Playwright)
pnpm run test:e2e:docs
```

Preview the production docs build (with base-href `/brickular/`):

```bash
pnpm run preview:docs
```

## License

MIT
