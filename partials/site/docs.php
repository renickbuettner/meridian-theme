<?php
/** Page tree for the documentation section: every published Meridian\Page below the `docs` root, two levels deep. */

if (!function_exists('meridian_docs_tree')) {
    /** @return array{root: ?array<string, mixed>, items: list<array<string, mixed>>, flat: list<array<string, mixed>>} */
    function meridian_docs_tree(string $rootSlug = 'docs'): array
    {
        require_once meridian_path('partials/site/chrome.php');
        $build = function () use ($rootSlug): array {
            $pages = meridian_published_pages(fn ($q) => $q->where(fn ($w) => $w->where('fullslug', $rootSlug)->orWhere('fullslug', 'like', $rootSlug . '/%')));
            $root = null;
            $items = [];
            foreach ($pages as $page) {
                if ($page['fullslug'] === $rootSlug) {
                    $root = $page + ['children' => []];
                    continue;
                }
                $parent = dirname($page['fullslug']);
                if ($parent === $rootSlug) {
                    $items[$page['fullslug']] = $page + ['children' => []];
                } elseif (isset($items[$parent])) {
                    $items[$parent]['children'][] = $page + ['children' => []];
                }
            }
            $items = array_values($items);
            $flat = $root ? [$root] : [];
            foreach ($items as $item) {
                $flat[] = $item;
                foreach ($item['children'] as $child) {
                    $flat[] = $child;
                }
            }

            return ['root' => $root, 'items' => $items, 'flat' => $flat];
        };

        try {
            if (!class_exists(\Renick\Content\Classes\CacheManager::class)) {
                return $build();
            }
            $site = \Site::getSiteFromContext() ?: \Site::getActiveSite();
            $key = 'meridian:docs:' . ($site->id ?? '-') . ':' . $rootSlug;

            return \Renick\Content\Classes\CacheManager::remember(\Renick\Content\Classes\CacheManager::NS_CHROME, $key, null, $build);
        } catch (\Throwable $e) {
            return ['root' => null, 'items' => [], 'flat' => []];
        }
    }

    /** @return array{prev: ?array<string, mixed>, next: ?array<string, mixed>} neighbours of $fullslug in reading order */
    function meridian_docs_neighbours(array $flat, string $fullslug): array
    {
        foreach ($flat as $i => $page) {
            if ($page['fullslug'] === $fullslug) {
                return ['prev' => $flat[$i - 1] ?? null, 'next' => $flat[$i + 1] ?? null];
            }
        }

        return ['prev' => null, 'next' => null];
    }
}

if (!function_exists('meridian_docs_heading_count')) {
    /** Counts h2/h3 headings in a document tree; decides server-side whether the page gets an on-this-page nav (so nothing shifts after load). */
    function meridian_docs_heading_count(mixed $node): int
    {
        if (!is_array($node)) {
            return 0;
        }
        $n = 0;
        if (($node['type'] ?? '') === 'heading' && in_array((int) ($node['data']['level'] ?? 2), [2, 3], true)) {
            $n++;
        }
        $html = $node['data']['html'] ?? null;
        if (is_string($html)) {
            $n += preg_match_all('/<h[23]\b/i', $html);
        }
        foreach ($node as $child) {
            if (is_array($child)) {
                $n += meridian_docs_heading_count($child);
            }
        }

        return $n;
    }
}
