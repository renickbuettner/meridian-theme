# Meridian SEO and structured data

One `<head>` for every page (`partials/seo/head.htm`), one JSON-LD `@graph` (`partials/seo/jsonld.htm` + `partials/seo/seo.php`), a sitemap with language alternates and a robots.txt.

## Variables a page sets in `onStart()`

Everything is optional; the head falls back to the page's `meta_title`, `meta_description` and the theme brand. `meridian_page_seo($this, $entry, meridian_locale())` (`partials/site/page-seo.php`) sets all of them for a `Meridian\Page`; other page types set them directly.

| Variable | Effect |
|---|---|
| `seoTitle`, `seoDescription`, `seoImage` | `<title>` (brand appended once), description, `og:*`, `twitter:*`, JSON-LD image. `seoImage` is an absolute URL or a site path (`meridian_media_url()` turns a media path into one). |
| `seoUrl` | canonical and `og:url`; defaults to the request URL without the query string |
| `seoNoindex` | `noindex, nofollow`, no canonical (404 pages, drafts). Pages with `seo_noindex` or a custom `canonical_url` are also left out of the sitemap. |
| `seoType` | `website` (default) or `article`. `article` emits a `BlogPosting` instead of a `WebPage`. |
| `seoSchemaType` | `WebPage` (default), `AboutPage`, `ContactPage`, `CollectionPage`, `SearchResultsPage`. Anything else (including the page type `Event`) renders as `WebPage`; Event markup comes from the `event-details` block. |
| `seoBreadcrumbs` | `[{label, url}]` below the home crumb, last item without `url`. Drives the `BreadcrumbList` and, in `site/page-render`, the visible `site/breadcrumbs` nav (same list, same labels). Fewer than one item: no breadcrumb. |
| `seoPublished`, `seoModified`, `seoAuthor` `{name, url}`, `seoSection`, `seoTags` `[]`, `seoWordCount` | `BlogPosting` and `article:*` meta |
| `seoContent` | the page's document (JSON or array); blocks in it are scanned by the block builders |
| `seoNodes` | extra JSON-LD nodes: `meridian_seo_node($this, [...])` (needs `partials/seo/seo.php`) |
| `seoJsonLd` | escape hatch: a list of already encoded JSON strings, emitted as extra `<script>` tags |

A blog post example:

```php
require_once meridian_path('partials/site/page-seo.php');
require_once meridian_path('partials/seo/seo.php');
$this['seoTitle'] = $post->title;
$this['seoType'] = 'article';
$this['seoPublished'] = meridian_journal_published($post);   // Carbon, Y-m-d or ISO string; Tailor's published_at_date, which is set even without a publish date
$this['seoAuthor'] = ['name' => $author->title, 'url' => \Cms::url('author/' . $author->slug)];
$this['seoBreadcrumbs'] = [['label' => 'Journal', 'url' => \Cms::pageUrl('blog')], ['label' => $post->title, 'url' => null]];
```

## What the graph contains

- Always: `Organization` (`<site root>#organization`, logo from the theme's `brand_logo`), the page node (`WebPage` family or `BlogPosting`), `BreadcrumbList` when a trail exists.
- Home page only: `WebSite` with `SearchAction`, and only when the theme has a CMS page `search` (target `<search url>?q={search_term_string}`: the search page must read `q`).
- Blocks (below). Every node is pruned of null and empty values; the string is encoded with `JSON_HEX_TAG|JSON_HEX_AMP`, so a `</script>` in a field cannot break out.
- Not emitted on purpose: `Place`/`LocalBusiness` from the map block.

## Block builders: how a block adds structured data

Drop `partials/seo/blocks/<block-handle>.php` returning `fn(array $block, array $ctx): ?array`. `$block` is `{type, data, settings, children}` of one enabled block anywhere in `seoContent`; `$ctx` carries `url`, `siteUrl`, `locale`, `brand`, `title`, `description`, `image`. Return one node, a list of nodes, or null. No registration, no editing of head files; an exception in a builder skips that block only. Helpers: `meridian_seo_text()` (plain text from HTML), `meridian_seo_pick($data, ['a', 'b'])`, `meridian_seo_date($v, $tz)`, `meridian_seo_price($v)` (accepts `€ 1.299,50`).

Shipped builders:

| File | Block | Markup |
|---|---|---|
| `event-details.php` | `event-details` | `Event` (start/end in the block's `timezone`, attendance mode from `mode`, `VirtualLocation`/`Place`, `Offer` when `price` is set, status from `status`). Without `start` nothing is emitted. |
| `pricing-calculator.php`, `pricing-plans.php` | `pricing-plans` (shared builder) | one `Product` with an `Offer` per plan and billing term (`price_monthly`, `price_yearly`, `unit`, `currency`) |

Blocks that print their own markup inline stay valid (Google reads JSON-LD anywhere in the document): `faq-accordion` emits `FAQPage` from its `items` when `markup` is `yes`, `pricing-calculator` emits `Product` from its live tiers. The builders skip those two so a page never carries a second copy; several FAQ blocks on one page would produce several `FAQPage` scripts, so merge them into one block, or move the block to a builder (`meridian_seo_merge()` already joins builder-made `FAQPage` nodes into one).

## Head tags

`title`, `description`, `canonical`, `hreflang` for every translation that exists (plus `x-default` = first), `robots` (`index, follow, max-image-preview:large` by default), `og:type|site_name|title|description|url|locale|image`, `article:*` for posts, `twitter:card` (`summary_large_image` with an image), favicon. The sidebar's language links reuse the same alternates (`meridianAlternates`).

## Sitemap and robots

`/sitemap.xml` (`pages/sitemap.htm`, `partials/seo/sitemap.php`) lists every published, indexable `Meridian\Page` of every language of the active theme, plus the journal (`partials/seo/sitemap/journal.php`: every published post and the category and author pages that hold one; tag pages stay out as thin listings); each `<url>` carries `xhtml:link` alternates for all languages (translations are matched by `site_root_id`) and `x-default`. A language without a translation simply has no alternate. `/robots.txt` allows everything except the backend and `/search`, and points at the sitemap; a physical `robots.txt` in the web root wins. Both pages must keep `is_hidden = 0`: October answers 404 to visitors for hidden pages.

Other page types add their URLs by dropping `partials/seo/sitemap/<name>.php` returning `fn(array $sites): array`; `$sites` is `[{id, locale, prefix, primary}]`, the result a list of `{alternates: {hreflang: absolute url}, lastmod?: 'Y-m-d'}` (`meridian_sitemap_group($sites, $rows, $path)` does the grouping by `site_root_id`: `$rows` runs in each site's context and returns `meridian_sitemap_row($entry)` rows, `$path` turns a row into a site-relative path or null; see `sitemap/journal.php`).

## Checking a page

```bash
curl -s https://<your-site>/about | grep -o '<script type="application/ld+json">.*</script>' | sed 's/<[^>]*>//g' | python3 -m json.tool
curl -s https://<your-site>/sitemap.xml | grep -c '<url>'
```

For Google's validators use the Rich Results Test on a deployed URL; locally, JSON validity, `@context`, unique `@id`s and required properties are what to check.
