---
name: meridian
description: Contract and working guide for the Meridian theme (Bootstrap 6, sidebar frame, Turbo, island blocks, EN/DE/ES). Read before adding a page, block, string, style or seed to themes/meridian, and when documenting or extending the theme.
---

# Meridian: contract for everyone who touches the theme

Light editorial sidebar theme for Renick.Content. Bootstrap 6.0.0-alpha.1 (pinned), no Vite, no bundler, no jQuery. Everything below was verified on the test instance; if you find it wrong, fix this file in your commit.

## 1. Working on the theme

- **Build** (only in a checkout that has `package.json` and `scripts/`, see `rebuild-css.md`): `cd themes/meridian && pnpm install --frozen-lockfile && pnpm build` (i18n merge + seeds + Sass + PurgeCSS + JS + fonts, size report, fails above budget). `pnpm i18n` only merges `i18n/*.json` into `lang/` and `translate/`; `pnpm seeds` only regenerates `seeds/data.yaml`.
- **Seed** demo content (idempotent): `php artisan theme:seed meridian` (the theme's directory name; `renick-meridian` on a Marketplace install). The seed creates the sites `meridian-en` (root) and `meridian-de` (`/de`, linked via `site_root_id`) and binds both to the theme; the theme is bound per site (`theme` column).
- **Settings** live in the backend (Settings, Site Theme): five tabs, `theme.yaml` `form.tabs.fields`.
- Generated files (`assets/dist/**`, `assets/fonts`, `lang/*.json`, `translate/*.yaml`, `seeds/data.yaml`) are rebuilt, never hand-edited, and committed with their source change.
- Developing Meridian inside the Renick.Content monorepo (dev instance, helper scripts, test suites, QA matrix): `scripts/meridian/README.md` there. It is not part of the theme package, and nothing in these skills depends on it.

## 2. Directory map (`themes/meridian`)

```
theme.yaml, version.yaml, composer.json, LICENSE, README.md, THIRD-PARTY-NOTICES.md
layouts/default.htm              the one layout: skip link, sidebar frame, <main id="main">, footer
pages/                           index (/), page (catch-all /:path* -> Meridian\Page by fullslug), 404, journal*, docs, search, search-index, sitemap, robots
partials/site/                   head, sidebar, lang-switch, brand, footer, breadcrumbs, pagination, icons (SVG sprite), icon, block-css, page-render, body-end, html-attrs, palette
partials/site/*.php              paths (meridian_dir/_path/_asset), boot, look (settings), contrast, chrome (cached nav), alternates (hreflang), page-seo, block-css, preview, docs
partials/journal/, docs/         journal (cards, post, filters, toc, search) and docs-tree partials
partials/palette/                command-palette index (the static JSON of pages and posts)
partials/seo/                    SEO head, JSON-LD graph, sitemap (+ sitemap/ providers: journal), per-block schema builders (blocks/); extra.htm is the empty head extension point (a child's stylesheet slot)
partials/renick-content/         theme overrides of plugin block partials (every one on the mr-* recipes)
content-blocks/<handle>/<handle>.htm|yaml   theme blocks (the thirteen interactive island blocks plus agenda, compare-table, cta-band, ...)
assets/src/entries/*.scss        every file = one CSS module -> assets/dist/<name>.css (picked up automatically)
assets/src/<dir>/                partials: tokens (_tokens, _palettes), base (_base, _bridge, _recipes, _plugin, _fonts), shell (_shell, _chrome, _parts), bootstrap (_config, _subset, _utilities), blog, landing, blocks, partials-a
assets/js/*.js                   hand-written native ES modules -> minified to assets/dist/js/ (same path)
assets/js/blocks/<handle>.js     island modules
assets/css/custom.css            user slot of the root theme, linked last, not built (a child's copy is NOT linked: use partials/seo/extra.htm)
assets/fonts, assets/images, assets/map   self-hosted fonts (build output), favicon and preview, world map SVG
assets/dist                      BUILD OUTPUT, committed
i18n/<area>.json                 string fragments (SOURCE of lang/ and translate/; never ship)
seeds/blueprints/*.yaml          Tailor blueprints; seeds/data.d/<NN>-<area>.yaml step fragments (never ship); seeds/data/*.json rows; seeds/media
scripts/                         build.mjs, build-i18n.mjs, build-seeds.mjs, lib/, map/ (never ship)
skills/meridian/                 SKILL.md (this file), seo.md, rebuild-css.md, extend.md
skills/create-child-theme/       SKILL.md and templates/ for a Meridian child theme
```

Other documents: `rebuild-css.md` (build pipeline, what to edit for what, rebuilding without the tooling), `extend.md` (add a scheme, a block, a page type), `seo.md` (JSON-LD contract), `../create-child-theme/SKILL.md`. When a change invalidates a file inventory, a snippet or a number in these, fix them in the same commit; re-verify them in every QA pass (`ls` against section 2, run the snippets, compare palettes and budgets with `_palettes.scss` and `build.mjs`).

## 3. Assets and how CSS and JS are delivered

- **CSS modules** (all in `assets/dist`): `critical.css` (tokens, base, recipes, plugin bridge, shell, sidebar chrome) and the active `scheme-<name>.css` are inlined in `<head>` by `look.php`; `core.css` (Bootstrap 6 subset, trimmed utilities, `@font-face`, PurgeCSS-trimmed), the plugin's `renick-content.css`, `layout-sidebar.css` (footer, breadcrumbs, pagination, Turbo bar) and `custom.css` load through one October combiner URL (`meridian_css_modules()` in `boot.php`). `layout-blog.css`, `layout-docs.css` and `layout-pages.css` are page-type modules.
- **A page type adds its module** with `{% put styles %}<link rel="stylesheet" href="{{ ['assets/dist/layout-blog.css']|theme }}">{% endput %}` in its page or partial (CMS Twig only).
- **A block's stylesheet loads by block type.** `assets/src/entries/block-<handle>.scss` becomes `assets/dist/block-<handle>.css`, and `meridian_block_css($entry->content)` (called in `pages/*.htm`, output by the `site/block-css` partial) links it on every page whose document contains that block, nested ones included. Pages that render documents themselves (posts, docs) must do the same: `{% partial 'site/block-css' css=blockCss %}` with `$this['blockCss'] = meridian_block_css($doc)`. Block partials cannot use `|theme` (the plugin's block Twig has only `media`, `rc_resize`, `rc_embed`, `rc_url`, `rc_css_url`, `rc_t`, `rc_icon`, `rc_srcset`, ...), which is why this is automatic. The editor preview loads all of `core`, `critical` and the scheme through `meridian_listen_preview_assets()`.
- **Cascade:** Bootstrap 6 declares its component CSS in `@layer`s but its `:root` tokens unlayered, the plugin sheet is unlayered. Rules of ours are unlayered, so they beat Bootstrap components; to beat Bootstrap's `:root` tokens use `html:root` (see `_bridge.scss`), to beat the plugin's `.rc-*` use `html .rc-*` (see `_plugin.scss`). Bootstrap 6 classes differ from 5 (`.btn-solid theme-primary`, Drawer, Chip, no `.btn-primary`): plugin partials that use Bootstrap 5 names need a `partials/renick-content/<handle>.htm` override on the `mr-*` recipes.
- **PurgeCSS** trims `core.css` against layouts, pages, partials, content-blocks, `assets/js`, seeds and the plugin's block partials. A class that exists only in editor-entered content must be added to `SAFELIST` in `scripts/build.mjs`. `mr-*` and `rc-*` are always kept.
- **JS:** `shell.js` (module in `<head>`) imports `islands.js`; Bootstrap's Drawer ES files are copied to `assets/dist/js/vendor/bootstrap/` and only fetched when the burger is visible. Edit sources in `assets/js/`, never `assets/dist/js`. October's `{% framework turbo %}` bundle (about 30 KB gzip, not ours) and `renick-content.js` load at the end of `<body>`.
- **Named access:** any element id becomes `window.<id>`, so never trust a non-built-in global by truthiness (`window.flag === true`, `typeof window.fn === 'function'`; WebKit has no `requestIdleCallback`). An id built from author data must not be one of the plugin's reserved globals: the anchor patterns exclude `bootstrap`, the only one they would admit.
- **Budgets** (enforced by `build.mjs` and the theme's tests): typical page CSS < 40 KB gzip (critical + scheme + core + layout-sidebar + plugin sheet), theme JS < 30 KB gzip (shell + islands + drawer closure + plugin js), contrast AA in all six palettes, LCP < 1.8 s and CLS < 0.02. Measure, do not assume.

## 4. Tokens, spacing, rhythm, containers (use these, nothing else)

Colours: `--mr-bg --mr-ink --mr-accent --mr-signal --mr-on-accent` per scheme (`light-dark(...)`, set on `html[data-scheme]`), derived `--mr-surface --mr-surface-2 --mr-muted --mr-line --mr-line-strong --mr-accent-soft --mr-accent-hover --mr-signal-text --mr-focus --mr-error`. Text on `--mr-bg`/`--mr-surface`: `--mr-ink`, `--mr-muted`, `--mr-accent` (all AA). `--mr-signal` is for graphics only; text uses `--mr-signal-text`. Control borders use `--mr-line-strong` (3:1), hairlines `--mr-line`. Never write hex in a module.

Spacing `--mr-space-1..10` (.25 .5 .75 1 1.5 2 3 4 6 8 rem on Bootstrap's `--spacer`); `--mr-gutter` (page side padding), `--mr-section-y` (vertical rhythm of a section), `--mr-stack`. Widths `--mr-w-prose` 42rem, `--mr-w-content` 60rem, `--mr-w-wide` 76rem. Radius `--mr-radius-sm|md|lg|pill`, `--mr-border`, `--mr-shadow-1|2`. Type `--mr-font-serif|sans`, `--mr-text-xs..lg`, `--mr-text-h1..h4` (fluid), `--mr-leading-body|tight`. Touch target `--mr-target` (2.75rem). Breakpoints (Sass `mr.up(lg)`): sm 576, md 768, lg 992 (sidebar), xl 1280, 2xl 1536. No ad-hoc px/rem in modules: add a token first, here, once.

Markup recipes (classes live in `base/_recipes.scss`):

```html
<section class="mr-section">                      <!-- or mr-section--tight | --band | --accent | --flush; owns the vertical padding -->
  <div class="mr-container">                      <!-- or mr-container--content | --prose | --full; owns the side gutters -->
    <header class="mr-page-head"><p class="mr-eyebrow">Journal</p><h1>Title</h1><p class="mr-lead">Lead text</p></header>
    <div class="mr-stack">                        <!-- vertical gaps between children: --tight | --loose -->
      <article class="mr-card">...</article>      <!-- surface + hairline + radius-md + shadow-1; mr-card--flat -->
    </div>
    <div class="mr-cluster"><a class="mr-btn" href="#">Primary</a><a class="mr-btn mr-btn--ghost" href="#">Ghost</a><button class="mr-chip" aria-pressed="false">Filter</button></div>
  </div>
</section>
<div class="mr-prose">...long-form HTML...</div>
```

Plugin documents already get the same system: `.rc-w-container` = `mr-container`, `.rc-w-narrow` = prose width, `.rc-pt-*`/`.rc-pb-*` map onto the tokens (`_plugin.scss`). Page text is `h1` once per page (serif display, authored in the page content or the page head), `h2..h4` follow without skipping levels.

## 5. The frame, sidebar and Turbo

- `layouts/default.htm` -> `<header id="mr-aside" data-turbo-permanent>` holds the sprite, the topbar (burger + brand) and the sidebar (`<dialog class="lg:drawer drawer-start mr-sidebar" id="mr-sidebar">`): fixed 15rem column from 992px (`auto`), always (`fixed`: a plain `<div>`, no burger) or never (`offcanvas`: class `drawer`); `drawer-start|end` and `data-sidebar-pos="start|end"` follow the position setting (inline-start/end, RTL safe). Below 992px it is a native modal dialog: focus trap and Esc are the browser's, `shown.bs.drawer` moves focus in, closing returns it to the burger.
- The sidebar is permanent: page-specific navigation (docs tree, table of contents) belongs in the content area, not in the sidebar. `shell.js` keeps `aria-current` and the language hrefs (from `<link rel="alternate" hreflang>`) in sync after each visit and falls back to the language's home (`data-mr-home`).
- Language links carry `data-turbo="false"`: the sidebar differs per language, so a language switch is a full load. Add `data-turbo="false"` to anything that must not be a Turbo visit.
- **October's Turbo is not Hotwire.** Events are `page:before-visit`, `page:visit`, `page:unload` (before the swap), `page:before-render` (cancelable; `detail.resume()`), `page:render` (after the swap and the view transition), `page:load` (fires BEFORE the swap when view transitions are on, and also for the first document), `page:loaded`, `page:updated`. There is no snapshot cache, so no before-cache event. Use `page:render` to re-init, `page:unload` to clean up (islands do both). Inline `<script>` in `<head>` needs `data-turbo-eval-once="<id>"`; scripts in `<body>` re-run on every visit. `shell.js` holds the swap until new stylesheets loaded (no unstyled flash), moves focus to `#main` after a real visit, announces the title in a `role=status` region and prefetches on hover/touchstart (30 s, single use, handed to Turbo's `X-PJAX` fetch).
- Turbo is opt-out per page with `turbo=false` in the layout vars; the view transition meta follows the setting.

## 6. Islands (interactive blocks)

Markup: `<section data-island="<handle>" [data-island-load="visible|idle|eager"]>` with the full static fallback inside (class `mr-nojs-only` is hidden once the island is ready, `mr-js-only` is hidden until then). Module: `assets/js/blocks/<handle>.js`, loaded by `islands.js` with `import()` (default on first visibility, 200px margin):

```js
// default export or named `init`; may be async; return a destroy function (or { destroy }).
export default function init(el, { signal }) {            // signal aborts on cleanup: pass it to addEventListener(..., { signal })
    const onClick = () => {};
    el.querySelector('button')?.addEventListener('click', onClick, { signal });
    return () => { /* observers, timers, anything not tied to signal or el */ };
}
```

The loader sets `data-island-ready` (or `data-island-error` and a console error), re-runs on `page:render`, aborts the signal and calls destroy on `page:unload`. Rules: 0 to 6 KB JS per island, no libraries, keyboard operable with correct ARIA, respect `matchMedia('(prefers-reduced-motion: reduce)')`, no layout shift when it becomes ready (reserve the space in the static markup), no external requests. Visitor-facing words inside a block come from `rc_t('meridian.block.<handle>.ui_<name>')` (lang JSON) or from block fields, never hardcoded.

## 7. Adding a block end to end (verified shape)

1. `content-blocks/<handle>/<handle>.yaml`, no prose, every label a lang key:
   ```yaml
   handle: project-map
   name: meridian.block.project-map.name
   icon: icon-flag
   group: Meridian
   version: 1
   settings: true
   fields:
     title:
       label: meridian.block.project-map.title
       type: text
       commentAbove: meridian.block.project-map.title_comment
     layout:
       label: meridian.block.project-map.layout
       type: dropdown
       options: { split: meridian.block.project-map.layout_split }
   ```
2. `content-blocks/<handle>/<handle>.htm` (plugin Twig: `data`, `settings`, `attributes`, `children`; `rc_t`, `rc_icon`, `rc_url`, `media`, `rc_srcset`; `priority` is true for the first block, mark LCP images with it):
   ```twig
   <section {{ attributes|replace({'class="': 'class="mr-map '})|raw }} data-island="project-map">
       <h2>{{ data.title }}</h2>
       <div class="mr-nojs-only">...static list of the same content...</div>
       <div class="mr-js-only">...</div>
   </section>
   ```
3. `assets/src/entries/block-<handle>.scss` (starts with `@use "../mr";`, tokens only; the CSS auto-loads for pages containing the block).
4. `assets/js/blocks/<handle>.js` island module (section 6).
5. `i18n/blocks-<handle>.json` (section 8) for every `meridian.block.<handle>.*` key including `rc_t` UI strings.
6. Seed it in a page row (section 9) and run `pnpm build`, then `php artisan theme:seed meridian`.
7. Check it with section 11; in the monorepo also its docs page, picker icon and an island spec (`scripts/meridian/README.md`).

## 8. i18n

`en` is the source; `de` and `es` mirror it. One fragment file per area, never edit `lang/` or `translate/`:

```json
{ "en": { "meridian.block.project-map.name": "Project map" }, "de": { "meridian.block.project-map.name": "Projektkarte" }, "es": { "meridian.block.project-map.name": "Mapa de proyectos" } }
```

Flat keys `meridian.<area>.<key>`, lowercase, single line, identical placeholder sets (`:name` or `{name}`), all three locales. `pnpm i18n` validates and merges. Routing: `meridian.front.*` -> `translate/*.yaml`, used in templates as `{{ 'meridian.front.nav.menu'|_ }}` (needs RainLab.Translate messages, imported by the seed step); every other key -> `lang/*.json` (backend labels, `rc_t` in blocks). Key families: `meridian.theme.form.*`, `meridian.page.*` (blueprint labels), `meridian.block.<handle>.<field>` (`.name`, `.<field>`, `.<field>_comment`, `.<field>_<option>`, `.ui_<word>`), `meridian.front.<area>.<key>`. The theme's tests fail on missing keys, placeholder drift, prose in YAML and frontend keys used but undefined. A raw dotted key visible anywhere is a bug. German UI strings (`lang/`, `translate/`) address nobody directly (no "du", no "Sie"); German demo content in `seeds/data` uses "Sie", never "du".

## 9. Seeds and pages

- `theme:seed meridian` runs `seeds/data.yaml`, generated from `seeds/data.d/*.yaml` (file name order: `00` sites + messages, `10` media, `20-39` taxonomy and pages ... EN step before its DE step). One fragment per area, each a YAML list of steps copied from `seeds/data.d/20-pages-foundation.yaml` (`SiteAwareRecordImport`, `blueprint_uuid`, `update_existing: true`, `site: meridian-en|meridian-de`).
- Rows live in `seeds/data/<what>-<area>-en.json` and `-de.json` (never only in the database). Page blueprint `Meridian\Page` (uuid `meridianpage0001a1b8c2d9e3f0000001`): `id, title, slug, is_enabled, hide_from_nav, show_in_footer, nav_label, nav_icon, meta_title, meta_description, og_image, canonical_url, seo_noindex, schema_type, content`. A DE row repeats the EN `slug` only when it is the same page; it carries `site_root_id` = the EN row id.
- Page id blocks (EN `n`, DE `100+n`): foundation 1-9, landing-saas 10-19, landing-agency 20-29, pricing 30-39, case-study 40-49, event 50-59, docs 60-79, contact 80-89, legal 90-99. Blog, taxonomy and other blueprints: add `seeds/blueprints/<name>.yaml` with a new UUID `meridian<name>0001a1b8c2d9e3f000000nn` and a `Meridian\<Name>` handle; extend `page.yaml` only below its `# --- extensions ---` marker with Edit (small anchored edits, never rewrite the file).
- Document content: `{"meta": [], "blocks": [{"id": "b_<unique>", "type": "section", "enabled": true, "settings": {"width": "container"}, "data": {}, "visibility": {"from": null, "until": null, "sites": null}, "children": [...]}]}`. Every block, children included, has a unique `b_...` id (`SeedBlockIdSweepTest`). Headings: preset by level (h1/h2 top `lg`, h3 `md`, h4-h6 `sm`, bottom always `xs`); the first block of a container may omit `spacing_top` (`HeadingSpacingSweepTest`); give every h1 `"settings": {"spacing_bottom": "xs"}`. Links are `october://cms-page@link/page?path=<fullslug>`. Images: files in `seeds/media/meridian/` listed in a media step (AI-generated or fictional, MIT, noted in THIRD-PARTY-NOTICES.md); no real people or brands.
- Routing: `pages/page.htm` serves every `Meridian\Page` by fullslug; other URL shapes get their own `pages/<name>.htm` (blog, search, ...) with the same `onStart` pattern (preview token, 404 via `controller->run('404')`, `meridian_page_seo`, `meridian_block_css`).
- Navigation is the top-level published page tree (`hide_from_nav` excludes, `nav_icon` picks a sprite symbol from `partials/site/icons.htm`, `nav_label` shortens). The nav cache (`NS_CHROME`) clears on any entry save.

## 10. Accessibility checklist (WCAG 2.2 AA, every page and block)

Skip link first (exists); landmarks: one `header` (sidebar), one `main#main`, `footer`, labelled `nav`s; exactly one `h1`, no skipped levels; `:focus-visible` outline is global (`--mr-focus`, never remove it); `aria-current` on the active nav item (`page` for pages, `true` within a set); native `<dialog>` and `<details>` first, ARIA only where no native element exists (tablist, slider, combobox follow the APG patterns); every control has an accessible name and a 44px target (24px minimum when inline in text); forms: visible `<label>`, error text next to the field with `aria-describedby` and `aria-invalid`, never colour alone; contrast through the tokens only; motion behind `prefers-reduced-motion` (a global rule shortens CSS motion; JS must check `matchMedia` itself); `lang` on `<html>` and `lang="xx"` on foreign phrases; images: informative `alt`, decorative `alt=""`, explicit `width`/`height`; no keyboard traps, Esc closes overlays, focus returns to the opener. Rendering text must never show a raw `meridian.*` key. German strings are about 30% longer: no fixed widths, `overflow-wrap` and `hyphens: auto` for `de`/`es` are set globally.

## 11. Verification recipe

1. `pnpm build && php artisan theme:seed meridian`, then open the page.
2. Look at every page you touched in EN and DE, light and dark, at phone portrait and landscape (360x640, 390x844, 640x360, 844x390), tablet (768x1024, 1024x768), laptop (1280x800) and desktop (1920x1080): no console or request errors, no horizontal overflow, one `h1`, one `main`, no raw keys, axe WCAG 2.2 AA clean.
3. Repeat the sampled pages with the schemes `ember` and `ultramarine`, the sidebar `fixed`, `offcanvas` and `right` (backend: Settings, Site Theme), then reset them.
4. Performance: LCP < 1.8 s, CLS < 0.02, the typical page inside the CSS and JS budgets of section 3 (`pnpm build` prints them).
5. Timing pitfalls when you script these checks: CSS transitions and the drawer animation need `prefers-reduced-motion: reduce` or a poll before reading computed styles.

## 12. Gotchas found while building the shell

- `html:root` (not `html`) to override Bootstrap tokens; `.drawer` tokens are set on the element, override them on `.mr-aside .mr-sidebar`.
- `page:load` runs before the view-transition swap; initialise on `page:render`.
- `showModal()` runs its focus step while the drawer is still `visibility:hidden`; `shell.js` focuses after `shown.bs.drawer`.
- Bootstrap's responsive drawer resets display, position, border and background above the breakpoint with `!important`; the docked look comes from `.mr-aside` (fixed) around it.
- `scrollbar-gutter: stable` from Bootstrap leaves a dead strip beside fixed columns: reset in `_base.scss`.
- October answers every page with `Cache-Control: no-cache, private` and a session cookie, so the HTTP cache cannot prefetch; hence the in-memory prefetch hand-off.
- The plugin sheet and `rc-*` classes are unlayered and load after `core.css`: same-specificity rules lose to them unless you raise specificity.
- Block Twig has no `theme` or `_` filter: use `rc_t` and the automatic block CSS.
- `--mr-surface` style mixes use `oklab`; `oklch` shifts the hue of near-black teal to purple.

## 13. Command palette

- Global: `partials/site/palette.htm` (inside the permanent `#mr-aside`) holds a host `[data-mr-palette-host]` with `data-island="command-palette"` (eager). `blocks/command-palette.js` builds a native modal `<dialog class="mr-palette">` there once per document; it ignores the island signal on purpose, because the host is permanent and `islands.js` never restarts an element it already started. Ctrl/Cmd+K and any `[data-mr-palette-open]` (sidebar button, topbar icon) open it; without JS those are plain links to `/search`.
- Block: `content-blocks/command-palette` mounts the same combobox inline (static GET form fallback to `/search`).
- Index: `pages/search-index.htm` serves `/search-index.json` (`/de/search-index.json` per site) from `partials/palette/index.php`: published, indexable `Meridian\Page` rows plus journal posts, `{t, u, k: page|post, d}`, cached in `NS_CHROME` (cleared on entry save), ETag. A new page type joins the index by adding rows in `meridian_palette_index()`.
- Styles: `dist/palette.css` rides in the combined core sheet (`meridian_css_modules()`), `block-command-palette.css` loads with the block. A `{% put styles %}` inside a layout partial is too late for `{% styles %}` in the head; use the module list instead.
- The sidebar scrolls (`overflow-y: auto` forces `overflow-x` to clip), so a popover hanging off a button at the sidebar edge is cut off: the language list is positioned against `.mr-sidebar__head` and spans it.
- Spacing check: paddings and gaps must be scale values, so room for the absolutely placed drawer close button is a `margin-inline-end` on `.mr-sidebar__head`, and the timeline rail is the list's padding, not part of each item's padding.
