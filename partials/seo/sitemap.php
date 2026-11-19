<?php
/**
 * sitemap.xml: every published, indexable Meridian\Page of every language of this theme, each URL with its hreflang alternates.
 * Other page types add URLs by dropping partials/seo/sitemap/<name>.php that returns fn(list<array> $sites): list<array>
 * of items {alternates: [hreflang => absolute url], lastmod?: date}; $sites is [{id, locale, prefix, primary}] (see sitemap/journal.php).
 */

if (!function_exists('meridian_sitemap_sites')) {
    /** @return list<array{id: int, locale: string, prefix: string}> enabled sites that use the active theme, default language first */
    function meridian_sitemap_sites(): array
    {
        $active = \Site::getActiveSite();
        $theme = ($active && $active->theme) ? $active->theme : 'meridian';
        $sites = [];
        foreach (\Site::listEnabled() as $site) {
            if ($site->theme === $theme) {
                $sites[] = [
                    'id' => (int) $site->id,
                    'locale' => (string) ($site->locale ?: 'en'),
                    'prefix' => ($site->is_prefixed && $site->route_prefix) ? '/' . trim($site->route_prefix, '/') : '',
                    'primary' => (bool) ($site->is_primary ?? false),
                ];
            }
        }
        usort($sites, fn ($a, $b) => [$b['primary'], $a['locale']] <=> [$a['primary'], $b['locale']]);

        return $sites;
    }

    /**
     * Groups the rows of every site into one item per translation set (rows are matched by site_root_id).
     *
     * @param  callable(array): list<array{root: int, noindex?: bool, updated?: ?string}>  $rows  runs inside the site's context
     * @param  callable(array, array): ?string  $path  site-relative path of a row, null skips it
     * @return list<array{alternates: array<string, string>, lastmod: ?string}>
     */
    function meridian_sitemap_group(array $sites, callable $rows, callable $path): array
    {
        $groups = [];
        foreach ($sites as $site) {
            $list = \Site::withContext($site['id'], function () use ($rows, $site) {
                try {
                    return (array) $rows($site);
                } catch (\Throwable) {
                    return [];
                }
            });
            foreach ($list as $row) {
                if (!empty($row['noindex']) || ($to = $path($row, $site)) === null) {
                    continue;
                }
                $group = &$groups[$row['root']];
                $group['alternates'][$site['locale']] ??= url($site['prefix'] . $to);
                $group['lastmod'] = max($group['lastmod'] ?? '', (string) ($row['updated'] ?? '')) ?: null;
                unset($group);
            }
        }

        return array_values($groups);
    }

    /** One sitemap row of a Tailor entry; an entry with seo_noindex or its own canonical URL stays out. */
    function meridian_sitemap_row($entry): array
    {
        return [
            'id' => (int) $entry->id,
            'root' => (int) ($entry->site_root_id ?: $entry->id),
            'slug' => trim((string) ($entry->fullslug ?? $entry->slug), '/'),
            'noindex' => (bool) ($entry->seo_noindex ?? false) || trim((string) ($entry->canonical_url ?? '')) !== '',
            'updated' => $entry->updated_at ? $entry->updated_at->format('Y-m-d') : null,
        ];
    }

    /** @return list<array{alternates: array<string, string>, lastmod: ?string}> */
    function meridian_sitemap_page_items(array $sites): array
    {
        return meridian_sitemap_group(
            $sites,
            fn () => \Tailor\Models\EntryRecord::inSection('Meridian\\Page')->applyPublishedStatus()->orderBy('nest_left')->get()->map('meridian_sitemap_row')->all(),
            fn (array $row) => $row['slug'] === 'home' || $row['slug'] === '' ? '/' : '/' . $row['slug']
        );
    }

    function meridian_sitemap_items(): array
    {
        $sites = meridian_sitemap_sites();
        $items = meridian_sitemap_page_items($sites);
        foreach (glob(__DIR__ . '/sitemap/*.php') ?: [] as $file) {
            if (!is_file($file)) {
                continue;
            }
            $source = require $file;
            if (is_callable($source)) {
                try {
                    $items = array_merge($items, (array) $source($sites));
                } catch (\Throwable) {
                    continue;
                }
            }
        }

        return $items;
    }

    function meridian_sitemap_xml(array $items): string
    {
        $esc = fn (string $s) => htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";

        foreach ($items as $item) {
            $alternates = (array) ($item['alternates'] ?? []);
            foreach ($alternates as $locale => $loc) {
                $xml .= "  <url>\n    <loc>" . $esc($loc) . "</loc>\n";
                if (!empty($item['lastmod'])) {
                    $xml .= '    <lastmod>' . $esc((string) $item['lastmod']) . "</lastmod>\n";
                }
                if (count($alternates) > 1) {
                    foreach ($alternates as $altLocale => $altUrl) {
                        $xml .= '    <xhtml:link rel="alternate" hreflang="' . $esc((string) $altLocale) . '" href="' . $esc($altUrl) . '"/>' . "\n";
                    }
                    $xml .= '    <xhtml:link rel="alternate" hreflang="x-default" href="' . $esc((string) reset($alternates)) . '"/>' . "\n";
                }
                $xml .= "  </url>\n";
            }
        }

        return $xml . "</urlset>\n";
    }
}
