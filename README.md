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

To preview the production GitHub Pages build locally (with `/brickular/` base-href):

```bash
npm run preview:docs
```

## Build targets

```bash
# Build publishable library
npm run build:lib

# Build docs app for GitHub Pages
npm run build:docs

# Build docs app for local preview sync
npm run build:docs:local
```

## Installing in another Angular project

```bash
npm install brickular
```

Then import standalone components:

```ts
import { BrickTableComponent } from 'brickular';
```

Subpath imports are also available:

```ts
import { BrickTableComponent } from 'brickular/table';
import { BrickButtonComponent, BrickInputComponent, BrickBadgeComponent } from 'brickular/primitives';
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

## Release readiness commands

```bash
# Docs smoke + a11y checks (Playwright)
npm run test:e2e:docs

# Full release gate used in CI
npm run release:verify
```

## npm release flow (library only)

Only `projects/brickular` is published to npm as the `brickular` package.  
`projects/dev-app` and `projects/brickular-docs` are not npm packages.

- Add/update `NPM_TOKEN` repository secret.
- Bump `projects/brickular/package.json` version.
- Create a GitHub release (or run `Publish Library` workflow manually).
- Optional manual dry-run: run `Publish Library` with `dry_run=true` to build/validate/package without publishing.

## Post-release verification checklist

After each release, run this quick validation:

```bash
# Confirm npm has the expected version
npm view brickular version

# Confirm docs are serving from GitHub Pages
curl -I https://mortensg.github.io/brickular/
```

## Theme tokens

Brickular ships CSS variable themes in `styles/themes.css` from the built package:

- `.brickular-theme-light`
- `.brickular-theme-dark`
