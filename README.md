# Meridian

**Meridian** (package `Renick.Meridian`) is an editorial sidebar theme for the [Renick.Content](https://www.renick.io/en/content-plugin) block editor on October CMS: a calm light sidebar with line icons, a large serif voice, journal-style cards and interactive blocks that load only when you scroll to them. The frontend is branded simply **Meridian**.

> **License:** Meridian (this theme) is MIT licensed, see [LICENSE](LICENSE). The bundled fonts are SIL OFL 1.1 and Bootstrap is MIT, see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). The Renick.Content **plugin** is licensed separately and is **not** covered by this MIT license.

## What it demonstrates

- **A sidebar frame that adapts.** Fixed from 992px up, a native `<dialog>` drawer (Bootstrap 6 Drawer) below, with the focus trap and Esc handling the platform provides. A setting forces "always fixed" or "always off-canvas", and puts the sidebar on the start or end side of the reading direction.
- **Fast navigation.** October's Turbo is on for every page, the sidebar is a permanent element (scroll, open menus and focus survive), links are prefetched on hover or touch, view transitions cross-fade between pages where the browser supports them and respect `prefers-reduced-motion`.
- **Three colour schemes, light and dark.** Teal, Ember and Ultramarine, each with a light and a dark palette checked for WCAG AA contrast. Only the active scheme is inlined in the page; a free accent colour is adjusted automatically when it would be hard to read. Dark mode follows the system, can be forced, and the sidebar toggle remembers the visitor's choice without a flash on load.
- **Bootstrap 6.** Pinned to `6.0.0-alpha.1`. Only the Sass partials the theme uses are compiled, unused CSS is purged, and no Bootstrap JavaScript loads on a desktop page. There is no bundler and no jQuery.
- **Islands.** Interactive blocks are native ES modules that load on demand (`data-island`), with a working no-JavaScript fallback in the markup.
- **EN, DE and ES.** Backend labels live in `lang/`, frontend strings in `translate/` and need RainLab.Translate. The language switcher in the sidebar links the translated page or the other language's home page.
- **Performance and SEO.** Self-hosted variable fonts (Fraunces, Inter), no third-party requests, critical CSS inline, explicit image sizes. Canonical, hreflang, Open Graph, Twitter cards and Schema.org JSON-LD on every page.

## Installation

Requirements: October CMS 4.x (PHP 8.4.1 or later), Renick.Content 1.1.2 or later and RainLab.Translate. Tailor is part of October core.

1. Meridian is not on the Marketplace or the October gateway yet, so there is no Composer package. Copy the theme folder into `themes/meridian` and install RainLab.Translate (`composer require rainlab/translate-plugin`). Once Meridian is released, install it from the Marketplace instead; `php artisan theme:list` prints the folder name.
2. Seed the demo content: `php artisan theme:seed <theme-folder>` (`php artisan theme:list` prints the folder name). It creates the English root site and the `/de` site.
3. The seed binds both sites to the theme. Brand, colour scheme, sidebar and behaviour are under *Settings → Site Theme*.

## Customizing without Node

- **Settings:** brand name, tagline and logo, colour scheme, accent colour, default colour mode, sidebar behaviour and position, view transitions and prefetch.
- **Custom CSS:** the *Advanced* tab of the customizer, or the file `assets/css/custom.css` in a child theme. Both load after every theme stylesheet, so plain overrides of the `--mr-*` tokens work.
- **A re-skin or new markup:** create a child theme and override partials from `partials/` and `layouts/`.

## Rebuilding the assets

The compiled CSS and JavaScript ship in `assets/dist`. Sources are in `assets/src` (Sass) and `assets/js` (ES modules). Rebuild only after changing them. `pnpm build` works only in a checkout (or fork) of the Renick.Content monorepo, because the build also reads `plugins/renick/content`; a copy installed from the Marketplace or the mirror repo has no `package.json`, lockfile or `scripts/` and cannot run it:

```bash
cd themes/meridian
pnpm install
pnpm build        # Sass, PurgeCSS, JS minify, fonts; prints sizes and fails above the budgets
pnpm watch        # rebuild while you edit
```

Every `assets/src/entries/*.scss` becomes `assets/dist/<name>.css`; a new entry file needs no configuration. `core.css` is PurgeCSS-trimmed against the templates, so a class that only appears in editor-entered content belongs in the `SAFELIST` of `scripts/build.mjs`. The installed theme ships no build tooling; to change styles without the monorepo, use the Sass-only recipe in `skills/meridian/rebuild-css.md`, a child theme or the custom CSS slot.

## Caching

Meridian caches its navigation per site and language in the Renick.Content chrome cache; saving a page clears it. After changing theme settings, clear the cache from the backend if the sidebar still shows old values.
