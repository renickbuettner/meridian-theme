# Extending Meridian: a scheme, a block, a page type

Companion to `SKILL.md` (the contract) and `rebuild-css.md` (the pipeline). Everything here changes Meridian itself; a client variant belongs in a child theme (`../create-child-theme/SKILL.md`). Always finish with `pnpm build` and the checks at the end.

## Add a colour scheme

A scheme is five colours per mode; everything else is derived (`assets/src/tokens/_tokens.scss`). The three shipped schemes (`teal`, `ember`, `ultramarine`) are listed in the places below. Use `<name>` lowercase, letters only.

1. **Palette.** `assets/src/tokens/_palettes.scss`: add a key to `$palettes` with `light` and `dark` maps `(bg, ink, accent, signal, on-accent)`, each `#rrggbb` (the contrast scripts and tests parse that exact form). Rules: `ink` on `bg` 4.5:1, `accent` on `bg` and on the derived surface 4.5:1, `on-accent` on `accent` 4.5:1, `signal` on `bg` 3:1 (graphics only; text uses the derived `--mr-signal-text`).
2. **Entry.** `assets/src/entries/scheme-<name>.scss`:
   ```scss
   @use "../tokens/palettes";

   @include palettes.scheme-rule(<name>);
   ```
   The build emits `assets/dist/scheme-<name>.css`. Only the active scheme's file is inlined (`partials/site/look.php`), the others are never loaded.
3. **Allow it.** `partials/site/look.php`: the list in `$pick('color_scheme', [...], 'teal')`.
4. **Customizer.** `theme.yaml`: an option under `color_scheme` with the key `meridian.theme.form.color_scheme.<name>`; then the label in `i18n/foundation.json` for `en`, `de` and `es` (see `SKILL.md` section 8), and `pnpm i18n`.
5. **Build checks.** `scripts/build.mjs`: add the name to the scheme list in `checkContrast` (the build then fails on any pair under AA).
6. **Scheme-specific CSS.** `grep -rn 'data-scheme' assets/src`: today only `block-map.scss` (the pin hue of the Leaflet map block). Add a line there if the new accent is far from the existing ones.
7. **Look at it.** Pick the scheme in the backend (Settings, Site Theme, Look), check `/`, `/journal` and `/pricing` on a phone and a laptop in light and dark, then set it back.
8. **Monorepo only:** the theme's tests and the docs list the schemes too; `scripts/meridian/README.md` names every place.

## Add a block

`SKILL.md` section 7 is the end-to-end recipe for a new theme block (YAML with lang keys only, Twig, `block-<handle>.scss`, island module, i18n fragment, seed row, docs, e2e). Two variants:

- **Override of a plugin block** (e.g. `accordion`, `card-grid`): no `content-blocks/` entry. Write `partials/renick-content/<handle>.htm` on the `mr-*` recipes, never Bootstrap 5 class names, and an `assets/src/entries/block-<handle>.scss` for what the recipes lack. The partial must keep the plugin partial's variables (`data`, `settings`, `attributes`, `children`). Check the plugin's `blocks/<handle>.htm` for what it renders and what its tests expect.
- **Interactive block (island):** the markup carries `data-island="<handle>"` and a static fallback, the module is `assets/js/blocks/<handle>.js` (contract section 6). Declare its stylesheet by naming the entry `block-<handle>.scss`: `meridian_block_css()` links it on pages that contain the block, nothing else to register. Budget: 0 to 6 KB JS, counted in the build report, not in the typical-page sum.

Sweeps that cover seeded blocks: unique `b_...` ids (`SeedBlockIdSweepTest`) and heading spacing (`HeadingSpacingSweepTest`).

## Add a page type

1. `pages/<name>.htm`: copy the `onStart` of `pages/page.htm` (preview token, 404 via `$this->controller->run('404')`, `meridian_page_seo`, `meridian_block_css`), set the URL in the page's `url =` line.
2. A module for its layout: `assets/src/entries/layout-<name>.scss`; link it in the page with `{% put styles %}<link rel="stylesheet" href="{{ ['assets/dist/layout-<name>.css']|theme }}">{% endput %}` (`pages/docs.htm` does it in the page, the journal does it in `partials/journal/listing.htm`).
3. A blueprint only if the data does not fit `Meridian\Page`: `seeds/blueprints/<name>.yaml` with a new UUID and a `Meridian\<Name>` handle (`SKILL.md` section 9).
4. Sidebar: pages join the sidebar through the `Meridian\Page` tree (`hide_from_nav`, `nav_icon`, `nav_label`); a page type that is not a `Meridian\Page` needs its own entry in `partials/site/chrome.php`.
5. Heading rules, one `h1`, breadcrumbs (`partials/site/breadcrumbs.htm`), JSON-LD through `meridian_page_seo` (`seo.md`).

## Checks before you commit any of the above

```bash
pnpm build                                     # budgets and contrast gate
php artisan theme:seed meridian                # seeds and messages still import
```

Then the verification recipe in `SKILL.md` section 11; in the monorepo also the test suites (`scripts/meridian/README.md`).
