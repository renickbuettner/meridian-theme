# Third-party notices

## Fonts

The variable WOFF2 files in `assets/fonts/` are taken unmodified from the [Fontsource](https://fontsource.org) packages and are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org).

| Family | Copyright |
|---|---|
| Fraunces | Copyright 2020 The Fraunces Project Authors |
| Inter | Copyright 2020 The Inter Project Authors |

## Bootstrap

`assets/dist/core.css` is compiled from the Sass of [Bootstrap](https://getbootstrap.com) 6.0.0-alpha.1 (MIT, Copyright 2011-2026 The Bootstrap Authors) and contains a purged subset of it. `assets/dist/js/vendor/bootstrap/` holds the minified Bootstrap ES modules the sidebar drawer needs, unchanged apart from minification.

## Build tooling

The stylesheets are generated with [Sass](https://sass-lang.com) (MIT) and [PurgeCSS](https://purgecss.com) (MIT); the scripts are minified with [Terser](https://terser.org) (BSD-2-Clause). These tools are not part of this package: `package.json`, `pnpm-lock.yaml` and `scripts/` live only in the Renick.Content monorepo, and `pnpm build` runs only there or in a fork of it, because it also reads the plugin's block partials and stylesheet from `plugins/renick/content`. A standalone copy of this theme cannot run `pnpm build`.

## Demo media

`assets/images/theme-preview.png` is a screenshot of the theme's demo content, and `assets/images/favicon.svg` was drawn for this theme; both are released under the theme's [MIT licence](LICENSE).
