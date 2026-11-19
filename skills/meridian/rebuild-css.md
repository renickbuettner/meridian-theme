# Rebuilding Meridian's CSS and JS

Meridian has no Vite and no bundler. The build is `scripts/build.mjs` (Sass CLI API, PurgeCSS, Terser, a few file copies) plus two generators for strings and seeds. Everything it writes is committed, so a site never needs Node.

## Who can rebuild what

| Where | What works |
|---|---|
| Monorepo, or any checkout that has `package.json` and `scripts/` | The full build below. |
| Marketplace or mirror copy (`renickbuettner/meridian-theme`) | No `package.json`, `pnpm-lock.yaml` or `scripts/`: the release snapshot drops tooling (`.gitattributes`, `assert-clean-snapshot.sh`). `assets/src/**` and `assets/js/**` do ship, so the Sass-only recipe at the end works. For changes that need no Sass at all use a child theme (`../create-child-theme/SKILL.md`) or the `custom_css` setting. |

## The full build

```bash
cd themes/meridian
pnpm install --frozen-lockfile     # pinned: bootstrap 6.0.0-alpha.1, sass 1.108.2, purgecss 8.0.0, terser 5.51.2, fonts
pnpm build                         # i18n merge + seeds + assets
```

Other scripts in `package.json`:

| Command | Does |
|---|---|
| `pnpm build` | `scripts/build-i18n.mjs` (fragments in `i18n/*.json` -> `lang/*.json`, `translate/*.yaml`), `scripts/build-seeds.mjs` (`seeds/data.d/*.yaml` -> `seeds/data.yaml`), `scripts/build.mjs` |
| `pnpm build:assets` | only `scripts/build.mjs` |
| `pnpm i18n`, `pnpm seeds` | one generator each |
| `pnpm watch` | `build.mjs --watch`: rebuilds on changes in `assets/src`, `assets/js`, `layouts`, `partials`, `pages`, `content-blocks` (150 ms debounce). A new file in a watched folder is picked up, a new Bootstrap module list is not (edit `build.mjs`, restart). |
| `pnpm check` | `pnpm build`, then `git status --porcelain` on the generated paths: any output means the committed files are stale |

`scripts/build.mjs`, in order:

1. Deletes `assets/dist/*.css` and `assets/dist/js/`.
2. Copies the variable fonts (`@fontsource-variable/fraunces`, `inter`; latin and latin-ext, `wght` axis) from `node_modules` to `assets/fonts/`.
3. Compiles **every** `assets/src/entries/*.scss` (not starting with `_`) with Sass (`--load-path node_modules`, compressed) to `assets/dist/<name>.css`. A new module is a new entry file, nothing to register.
4. Runs PurgeCSS on `core.css` only (see below). All other modules are written as compiled.
5. Minifies every `assets/js/**/*.js` as an ES module to the same path under `assets/dist/js/`, and copies Bootstrap's ES files for `BOOTSTRAP_MODULES` (`['drawer']`) plus what they import to `assets/dist/js/vendor/bootstrap/`.
6. Prints a size table, sums the typical page (`critical` + `scheme-teal` + `core` + `layout-sidebar` CSS; `shell.js`, `islands.js`, the Bootstrap closure JS) and **fails** above the budgets (CSS 40 KB, JS 30 KB gzip) or when any palette misses WCAG AA (`checkContrast`).

Generated and committed (CI job `meridian-build` rebuilds and fails on any diff): `assets/dist/**`, `assets/fonts/**`, `lang/*.json`, `translate/*.yaml`, `seeds/data.yaml`. Never hand-edit them.

## Where things live

| You want to | Edit | Then |
|---|---|---|
| change a token, recipe, layout part | `assets/src/tokens`, `base`, `shell`, `blog`, `landing`, `blocks`, `partials-a` partials | build; `critical.css` and the entries that `@use` the partial change |
| add a CSS module (page type or block) | new `assets/src/entries/<name>.scss`, starting with `@use "../mr";` | build; `assets/dist/<name>.css` appears. Block modules are named `block-<handle>.scss` and load automatically on pages containing the block; a page type adds its link with `{% put styles %}` (contract section 3) |
| add a Bootstrap 6 component to the subset | `@use "bootstrap/scss/<component>";` in `assets/src/bootstrap/_subset.scss` | build; check the budget. Left out on purpose: menu, datepicker, carousel, combobox, nav-overflow, navbar, popover, tooltip, toasts, placeholder, stepper |
| bring a Bootstrap utility family back | add its key to `$keep` in `assets/src/bootstrap/_utilities.scss` | build |
| add a Bootstrap JS component | add the file stem to `BOOTSTRAP_MODULES` in `scripts/build.mjs` | build; `assets/dist/js/vendor/bootstrap/` gets it and its imports. Never Menu (36 KB source) |
| keep a class PurgeCSS removes | add a pattern to `SAFELIST.standard` in `scripts/build.mjs` | build |
| change the base or grid breakpoints | `assets/src/bootstrap/_config.scss` and `$breakpoints` in `assets/src/_mr.scss` (keep them equal) | build; the sidebar breakpoint 992px is also the `lg:drawer` class in `partials/site/sidebar.htm` and the `max-width: 991.98px` query in `assets/js/shell.js` |
| change a font | `FONT_FILES` in `build.mjs`, `assets/src/base/_fonts.scss`, the preload `<link>`s in `partials/site/head.htm` | build |
| change JS | `assets/js/**/*.js`, never `assets/dist/js` | build |

## PurgeCSS, in short

`core.css` (Bootstrap subset, trimmed utilities, `@font-face`) is purged against `layouts`, `pages`, `partials`, `content-blocks` and `templates` (`.htm .php .yaml`), `assets/js/**/*.js`, `seeds/data/*.json`, the plugin's `blocks/**/*.htm` and `partials/*.htm` and its `renick-content.js`. Always kept: `mr-*`, `rc-*`, `jax-*`, `is-*`, `show*`, `collaps*`, `active`, `disabled`, `fade`, `row`, `col*`, `container*`, `g-*`, `visually-hidden`, `stretched-link`. Bootstrap 6 writes responsive variants as `md:d-none`; the extractor keeps the colon. A class that only an editor can type into a block (a rich-text `class`, a custom attribute) is not found: safelist it. Symptom of a miss: it works in the editor preview (which loads the same `core.css`, so check the dist is fresh) but a class is silently unstyled on the page.

## Budgets and why a build fails

- `CSS budget exceeded`: the typical page (critical, scheme, core, layout-sidebar) is over 40 KB gzip. Trim the Bootstrap subset or the utilities `$keep` list before raising anything. Module CSS (blocks, page types) is outside this sum on purpose.
- `JS budget exceeded`: shell, islands and the Bootstrap closure are over 30 KB gzip. October's own Turbo bundle (`{% framework turbo %}`) is not counted.
- `scheme/mode: <pair> <ratio> < 4.5`: a palette in `assets/src/tokens/_palettes.scss` is below AA. Fix the colour, do not lower the threshold. `MeridianThemeTest` checks the same pairs.
- Sass `Undefined variable` or `@use` errors after a Bootstrap bump: Bootstrap 6 alpha is a moving target (`@forward`, `if(sass())`); the pin is exact on purpose, read `node_modules/bootstrap/scss` before changing anything.

## Without the tooling: Sass only

For an installed copy that has `assets/src` but no `package.json` (works on the release snapshot):

```bash
cd themes/<meridian directory>
pnpm add -D --ignore-scripts bootstrap@6.0.0-alpha.1 sass@1.108.2   # creates a package.json next to the theme; keep it out of the theme's git (newer pnpm exits 1 on sass's optional watcher build without --ignore-scripts)
pnpm exec sass --load-path=node_modules --style=compressed --no-source-map assets/src/entries/layout-sidebar.scss assets/dist/layout-sidebar.css
```

`core.scss` compiles the same way but is not purged: about 279 KB raw and 38 KB gzip instead of the trimmed file, so it eats the CSS budget on its own. Leave `core.css` alone unless you also run PurgeCSS. A child theme's own Sass can reuse Meridian's helpers: `sass --load-path=<meridian>/assets/src my.scss out.css` with `@use "mr";` at the top gives `mr.up(lg)` and the other mixins (verified: emits plain CSS, no output of its own).
