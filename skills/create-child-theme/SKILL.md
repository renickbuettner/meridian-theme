---
name: create-child-theme
description: Generate an OctoberCMS child theme that inherits from Renick Meridian (Bootstrap 6, sidebar frame) with its own brand, palette, corner radii, default colour mode and sidebar placement. Use when a user wants a new theme "based on Meridian", a Meridian child theme, a re-skinned Meridian or a client variant of it. Scaffolds themes/<slug> with theme.yaml parent set to Meridian's real directory name, the customizer defaults, a child.css and the one partial that loads it, then verifies it on a throwaway prefixed site.
---

# Create a Meridian child theme

A Meridian child inherits every layout, page, partial, block, blueprint, script and stylesheet from **Renick Meridian** and changes only its look. Meridian's look is already data: every colour, radius, space and font is a `--mr-*` custom property, and the theme customizer (scheme, colour mode, accent, sidebar mode and side, brand) decides which values the page gets. A child is therefore a `theme.yaml` with different customizer defaults plus one `child.css` that re-declares tokens. No build step, no Node.

This skill ships inside Meridian (`skills/create-child-theme/`) so it travels with the theme. The theme's own contract is `../meridian/SKILL.md`; the CSS pipeline is `../meridian/rebuild-css.md`.

## How a Meridian child works (verified on October 4.x)

- `theme.yaml` declares `parent:` with the parent's **directory name**, not its `code:`. Meridian's directory is `meridian` when the theme is copied in (source checkout, mirror repo or release archive), `renick-meridian` on a Marketplace install. Resolve it with `php artisan theme:list` before writing `parent:`. Below, `<meridian>` means that resolved name.
- Files resolve child first, then parent: any `pages/`, `layouts/`, `partials/` or `content-blocks/` file in the child wins, everything else comes from Meridian. `meridian_dir()` (`partials/site/paths.php`) climbs to the root theme, so Meridian's PHP helpers, `assets/dist` and `assets/js` are found whatever the child is called.
- **Customizer fields are not inherited.** The child's `theme.yaml` must carry the whole `form:` block (the template has it, with the `meridian.theme.form.*` label keys, which resolve because October boots the parent's `lang/` path too). Meridian's templates read the ACTIVE theme's data, which on the child's site is the child's.
- **Defaults are written once.** October saves the form's `default:` values into the `theme_data` row the first time the theme's data is read; after that the stored values win. Changing `default:` later only affects installs that have not rendered the child yet. On a dev install change a value in the backend (Settings, Theme), or delete the row (`\Cms\Models\ThemeData::where('theme', '<slug>')->delete()` in tinker, then `php artisan cache:clear`).
- **Strings are not the child's job.** Frontend text is RainLab.Translate messages that Meridian's seed imports (install-wide, keyed `meridian.front.*`), backend labels are `lang/*.json` of the parent. Ship no `translate/` or `lang/` unless the child adds its own blocks or keys.
- **Blueprints are shared install-wide.** Meridian runs on the Tailor blueprints `Meridian\Page`, `Meridian\Post`, `Meridian\Category`, `Meridian\Tag` and `Meridian\Author`. Never copy them into the child: duplicate handles or UUIDs break `tailor:migrate`.
- **Content pages are data, not files.** `pages/` only holds route shells (home, the catch-all `page`, journal, docs, search, sitemap, robots, 404). A site bound to the child 404s on `/pricing` until it has `Meridian\Page` entries. Backfill with `tailor:propagate --site=<meridian site id> --blueprint=<handle>` per blueprint (never without `--blueprint`).
- **Activation is per site** through the site's `theme` column. Never retarget the primary site or the `meridian-*` sites.
- **There is exactly one stylesheet slot a child can use: `partials/seo/extra.htm`.** It is empty in Meridian and rendered at the end of `<head>`. A child overrides it with `{% put styles %}<link rel="stylesheet" href="{{ 'assets/css/child.css'|theme }}">{% endput %}`; `{% put styles %}` lands after every Meridian sheet, so equal specificity wins. Do NOT rely on `assets/css/custom.css` in a child: `meridian_css_modules()` checks the root theme's file, a child's copy is never linked. The `custom_css` customizer field (inline `<style>` after the sheets) works for the child as it does for Meridian.

## What Meridian exposes to a child

- **Customizer** (`theme.yaml` `form:`): `brand_name`, `brand_tagline`, `brand_logo`, `footer_note`, `color_scheme` (`teal|ember|ultramarine`), `color_mode` (`system|light|dark`, visitors can still toggle), `accent_override` (free hex, kept AA-readable by `partials/site/contrast.php`), `sidebar_mode` (`auto|fixed|offcanvas`), `sidebar_position` (`left|right`), `view_transitions`, `turbo_prefetch`, `custom_css`.
- **Tokens** (compiled into `assets/dist/critical.css` and `scheme-*.css`): colours `--mr-bg --mr-ink --mr-accent --mr-signal --mr-on-accent` per scheme as `light-dark(light, dark)` on `html[data-scheme]`, everything else derived from those five. Radii `--mr-radius-sm|md|lg|pill`, spacing `--mr-space-1..10`, widths `--mr-w-prose|content|wide`, fonts `--mr-font-serif|sans`, type `--mr-text-*`, shadows `--mr-shadow-1|2`. The full list is section 4 of `../meridian/SKILL.md`; use tokens only, never hex or px in markup.
- **Quickest re-skin, no CSS at all:** set `color_scheme` and an `accent_override` default. The override rewrites accent and on-accent for light and dark and keeps 4.5:1.
- **Full re-skin:** `child.css` re-declares the five colour tokens of the scheme the site uses (a child cannot add a fourth scheme: the allowed list is in `partials/site/look.php`; adding a scheme is a change to Meridian itself, see `../meridian/extend.md`). The `<meta name="theme-color">` and the contrast helper still read the parent's scheme file, so the browser chrome colour stays the parent scheme's.
- **Structure partials** a child may override as whole files: `partials/site/brand.htm`, `footer.htm`, `sidebar.htm`, `lang-switch.htm`, `breadcrumbs.htm`; the route shells in `pages/`; block partials in `partials/renick-content/` and theme blocks in `content-blocks/`. Do not override `partials/site/head.htm` or `boot.php` unless unavoidable: they carry the critical CSS, the no-flash mode script, the Turbo meta and the module list, and a copy drifts silently.
- **Fonts.** Fraunces and Inter are self-hosted (`assets/fonts`). A different typeface means shipping the `woff2` in the child's `assets/fonts/`, an `@font-face` in `child.css` and a `--mr-font-serif` / `--mr-font-sans` override. No external font links.
- **New markup needs classes that exist.** `core.css` is PurgeCSS-trimmed to the classes Meridian's own templates use. A child that writes Bootstrap utilities Meridian never uses gets no style from them: use the `mr-*` recipes (`mr-section`, `mr-container`, `mr-stack`, `mr-card`, `mr-btn`) or plain CSS in `child.css`.

## Step 1: Ask the user

One AskUserQuestion call, only for what the prompt does not already say:

1. **Name and slug.** Slug in kebab-case, lowercase (e.g. `acme-sand`). It is the directory name and the value sites point their `theme` at.
2. **Palette.** Pick the base scheme (teal, ember, ultramarine) and optionally an accent hex: the quick path. Or a new palette (bg, ink, accent, signal, on-accent for light AND dark): the full path with `child.css`. Run the contrast check in step 2.
3. **Corners:** sharp (`0.125rem / 0.25rem / 0.5rem`), soft (Meridian's default `0.375rem / 0.75rem / 1.25rem`) or round (`0.75rem / 1.25rem / 2rem`).
4. **Default colour mode:** system, light or dark. **Sidebar:** `auto` (fixed from 992px, drawer below), `fixed`, `offcanvas`; left or right.
5. **Pages and journal.** Which pages the child's site keeps (they are data, see above), and whether the journal stays. Journal off: override `partials/site/sidebar.htm` without the link, or hide the pages with `hide_from_nav`, and ship `pages/journal*.htm` shells whose `onStart()` returns `$this->controller->run('404');`.

## Step 2: Scaffold `themes/<slug>/`

1. `theme.yaml` from `templates/theme.yaml.tpl`: fill `{{NAME}}`, `{{DESCRIPTION}}`, `{{AUTHOR}}`, `{{HOMEPAGE}}`, `{{SLUG}}`, `{{MERIDIAN_DIR}}`, `{{SCHEME}}`, `{{MODE}}`, `{{ACCENT}}` (a lowercase `#rrggbb` or empty), `{{SIDEBAR_MODE}}`, `{{SIDEBAR_POSITION}}`. Name, description, author, homepage and accent sit inside single quotes: write a `'` in the value as `''`.
2. `version.yaml`: `1.0.0: First version of <Name>.`
3. `partials/seo/extra.htm` from `templates/extra.htm.tpl` (loads `child.css`).
4. `assets/css/child.css` from `templates/child.css.tpl`: `{{RADIUS_SM}}`, `{{RADIUS_MD}}`, `{{RADIUS_LG}}`, `{{SCHEME}}` (the child's `color_scheme` default), and the palette: `{{BG}} {{INK}} {{ACCENT}} {{SIGNAL}} {{ON_ACCENT}}` plus the same five with a `DARK_` prefix, all `#rrggbb`. On the quick path (no new palette) delete the palette block and keep only what changes.
5. Contrast check for a new palette, once per mode (bg ink accent signal on-accent). Text pairs need 4.5:1, signal is graphics only (3:1); Meridian's build (`scripts/lib/contrast.mjs` in a source checkout) uses the same thresholds:

   ```bash
   node -e '
   const [bg, ink, accent, signal, on] = process.argv.slice(1);
   const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
   const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
   const mix = (a, b, w) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * w + parseInt(b.slice(i, i + 2), 16) * (1 - w)).toString(16).padStart(2, "0")).join("");
   for (const [label, value, min] of [["ink on bg", ratio(ink, bg), 4.5], ["muted on bg", ratio(mix(ink, bg, 0.68), bg), 4.5], ["accent on bg", ratio(accent, bg), 4.5], ["on-accent on accent", ratio(on, accent), 4.5], ["signal on bg (graphics)", ratio(signal, bg), 3]]) console.log(value >= min ? "ok  " : "FAIL", label.padEnd(24), value.toFixed(2), ">=", min);
   ' -- '#f6f1e7' '#1d1a14' '#7a3e00' '#1e6b5c' '#ffffff'
   ```
6. Only if the user wants them: structure-partial overrides, journal-off shells.

No `{{…}}` placeholder may remain (`grep -rn '{{[A-Z_]*}}' themes/<slug>` finds them; `{{ 'assets/…'|theme }}` in `extra.htm` is Twig and stays). Never hardcode `themes/meridian/` in a child file: write `|theme` or use `meridian_path()`.

The child folder must sit in the install's `themes/` directory next to Meridian (copy it there, or symlink it when you develop it elsewhere), then `php artisan theme:clear`.

## Step 3: Verify on a throwaway prefixed site

1. `php artisan theme:list` lists the child.
2. Create a disposable site (assign `code` directly; it is guarded):
   ```
   php artisan tinker --execute '
   $s = \System\Models\SiteDefinition::where("code", "child_preview")->first() ?: new \System\Models\SiteDefinition;
   $s->code = "child_preview"; $s->name = "Child preview"; $s->theme = "<slug>"; $s->locale = "en";
   $s->is_primary = false; $s->is_enabled = true; $s->is_enabled_edit = true;
   $s->is_prefixed = true; $s->route_prefix = "/child"; $s->sort_order = 99;
   $s->save(); \Site::resetCache(); echo $s->id;'
   ```
3. Backfill the content from the Meridian site, one blueprint at a time (`--site` is the SOURCE site id; propagation fills every site that lacks records, so on an install with other sites check what else was created):
   ```
   for b in 'Meridian\Page' 'Meridian\Post' 'Meridian\Category' 'Meridian\Tag' 'Meridian\Author'; do
     php artisan tailor:propagate --site=<meridian site id> --blueprint="$b"
   done
   ```
4. Load `/child/`, `/child/pricing` and `/child/journal` in light and dark, phone portrait and landscape, tablet and laptop (a browser or a headless script). Check: the brand name shows, `data-sidebar-pos` follows the default, the computed `--mr-accent` and `--mr-radius-md` equal the chosen values, `child.css` is linked after the Meridian sheets (`<link>` order in the combined styles), no horizontal overflow, and `/child/nope` is a 404. `/child/journal` rendering proves the file fallback to Meridian.
5. A palette change must keep the contrast thresholds: rerun the contrast check for both modes.

## Step 4: Clean up

The throwaway site's entries all carry its `site_id`. Delete exactly those, without events (the blueprints are `multisite: all`, a normal delete cascades to the Meridian sites' records), then the site, the child's folder or symlink and, for a demo, the theme data:
```
php artisan tinker --execute '
$s = \System\Models\SiteDefinition::where("code", "child_preview")->first();
if (!$s) { echo "No preview site: nothing deleted."; } else {
  foreach (["Page", "Post", "Category", "Tag", "Author"] as $n) {
    \Tailor\Models\EntryRecord::withoutEvents(fn () => \Tailor\Models\EntryRecord::inSection("Meridian\\".$n)
      ->withoutGlobalScopes()->where("site_id", $s->id)->get()->each->forceDelete());
  }
  \Cms\Models\ThemeData::where("theme", "<slug>")->delete();
  $s->delete();
}
\Site::resetCache();'
```
Afterwards list every site's `theme` (`\System\Models\SiteDefinition::all()->pluck('theme','code')`) and run `php artisan cache:clear`: deleting a preview site once left `meridian-en` pointing at the removed child (the whole frontend answered 500 "The active theme is not found"); reset it with an `update(['theme' => 'meridian'])`.

Leave activation of a real deliverable to the user and never commit; the caller decides.

## Guardrails

- `parent:` is Meridian's directory name, resolved, never `Renick.Meridian` or the code.
- Copy the full customizer `form:`; it is not inherited. Defaults are persisted on first read.
- Never duplicate Meridian's blueprints. Never retarget the primary site or the `meridian-*` sites.
- Propagate per blueprint.
- Child CSS goes through `partials/seo/extra.htm`, never `assets/css/custom.css`.
- Keep fonts self-hosted; no external CSS or font links.
- `child.css` overrides tokens, not component rules; define light AND dark; every text pair 4.5:1.
