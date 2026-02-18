# Brickular

Brickular is an Angular 20 component library workspace with a first release focused on a typed, high-performance data table.

## Workspace apps and library

- `projects/brickular`: publishable library package (`brickular`).
- `projects/dev-app`: local playground for rapid component development.
- `projects/brickular-docs`: documentation and demo application for GitHub Pages.

## Quick start

```bash
npm install
npm run start:dev
```

Use `npm run start:docs` to run the docs site locally.

## Build targets

```bash
# Build publishable library
npm run build:lib

# Build docs app for GitHub Pages
npm run build:docs
```

## Installing in another Angular project

```bash
npm install brickular
```

Then import standalone components:

```ts
import { BrickTableComponent } from 'brickular';
```

## Table features in this version

- Typed column definitions (`BrickTableColumnDef<T>`).
- Single and multi-column sorting.
- Text/number/date filters with quick filter search.
- Client-side pagination.
- Single or multi-row selection.
- Inline cell editing events.
- Row virtualization.
- Column reordering, pinning, and resizing.

## Theme tokens

Brickular ships CSS variable themes in `styles/themes.css` from the built package:

- `.brickular-theme-light`
- `.brickular-theme-dark`
