<?php
/**
 * Schema.org layer. Pure builders (arrays in, arrays out) plus the glue that reads the page variables.
 * Contract and variables: skills/meridian/seo.md.
 */

if (!function_exists('meridian_seo_text')) {
    /** Plain text for markup fields: tags stripped, entities decoded, whitespace collapsed. */
    function meridian_seo_text(mixed $value): string
    {
        if (!is_scalar($value)) {
            return '';
        }
        $text = html_entity_decode(strip_tags(str_replace(['</p>', '<br>', '<br/>', '<br />', '</li>'], ' ', (string) $value)), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }

    /** First non-empty value among the given keys of an array. */
    function meridian_seo_pick(array $data, array $keys): mixed
    {
        foreach ($keys as $key) {
            if (isset($data[$key]) && $data[$key] !== '' && $data[$key] !== []) {
                return $data[$key];
            }
        }

        return null;
    }

    /** ISO 8601 (date-only kept as is); a naive string is read in $timezone. Null when unparsable. */
    function meridian_seo_date(mixed $value, ?string $timezone = null): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('c');
        }
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $value;
        }
        try {
            return (new \DateTimeImmutable($value, $timezone ? new \DateTimeZone($timezone) : null))->format('c');
        } catch (\Throwable) {
            return null;
        }
    }

    /** Decimal string with a dot and at most two decimals, null for non-numeric input. */
    function meridian_seo_price(mixed $value): ?string
    {
        if (is_string($value)) {
            // "1.299,00", "€ 49" and "49.5" all occur in text fields.
            $value = preg_replace('/[^0-9.,]/', '', $value);
            if (str_contains($value, ',') && str_contains($value, '.')) {
                $value = strrpos($value, ',') > strrpos($value, '.') ? str_replace(',', '.', str_replace('.', '', $value)) : str_replace(',', '', $value);
            } else {
                $value = str_replace(',', '.', $value);
            }
        }
        if (!is_numeric($value) || (float) $value < 0) {
            return null;
        }

        return rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.') ?: '0';
    }

    /** Drops null, '' and [] recursively so a node only carries what the page provides. */
    function meridian_seo_prune(array $node): array
    {
        foreach ($node as $key => $value) {
            if (is_array($value)) {
                $value = meridian_seo_prune($value);
            }
            if ($value === null || $value === '' || $value === []) {
                unset($node[$key]);
            } else {
                $node[$key] = $value;
            }
        }

        return $node;
    }

    /** HEX_TAG|HEX_AMP: the result is emitted |raw inside <script>. */
    function meridian_seo_encode(array $node): string
    {
        return json_encode(meridian_seo_prune($node), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_PARTIAL_OUTPUT_ON_ERROR) ?: '{}';
    }

    /** Appends a JSON-LD node to a page (ArrayAccess) for the head graph. */
    function meridian_seo_node($page, array $node): void
    {
        $nodes = $page['seoNodes'] ?? [];
        $nodes[] = $node;
        $page['seoNodes'] = $nodes;
    }

    /** @return list<array{type: string, data: array, settings: array, children: array}> enabled blocks of a document, children included */
    function meridian_seo_blocks(mixed $content): array
    {
        if (is_string($content)) {
            $content = json_decode($content, true);
        }
        $list = is_array($content) ? ($content['blocks'] ?? $content) : [];
        $found = [];
        $walk = function (array $blocks) use (&$walk, &$found): void {
            foreach ($blocks as $block) {
                if (!is_array($block) || ($block['enabled'] ?? true) === false) {
                    continue;
                }
                $children = is_array($block['children'] ?? null) ? $block['children'] : [];
                if (is_string($block['type'] ?? null)) {
                    $found[] = [
                        'type' => $block['type'],
                        'data' => is_array($block['data'] ?? null) ? $block['data'] : [],
                        'settings' => is_array($block['settings'] ?? null) ? $block['settings'] : [],
                        'children' => $children,
                    ];
                }
                $walk($children);
            }
        };
        $walk($list);

        return $found;
    }

    /**
     * Block builders: partials/seo/blocks/<handle>.php returns fn(array $block, array $ctx): ?array
     * (a node, or a list of nodes). Dropping a file in is the whole registration.
     *
     * @return array<string, callable>
     */
    function meridian_seo_builders(?string $dir = null): array
    {
        static $cache = [];
        $dir ??= __DIR__ . '/blocks';
        if (!isset($cache[$dir])) {
            $cache[$dir] = [];
            foreach (glob($dir . '/*.php') ?: [] as $file) {
                clearstatcache(true, $file);
                if (!is_file($file)) {
                    continue;
                }
                $builder = require $file;
                if (is_callable($builder)) {
                    $cache[$dir][basename($file, '.php')] = $builder;
                }
            }
        }

        return $cache[$dir];
    }

    /** @return list<array> flat node list from the document's blocks; one failing builder never breaks the page */
    function meridian_seo_block_nodes(mixed $content, array $ctx, ?array $builders = null): array
    {
        $builders ??= meridian_seo_builders();
        $nodes = [];
        foreach (meridian_seo_blocks($content) as $block) {
            if (!isset($builders[$block['type']])) {
                continue;
            }
            try {
                $result = $builders[$block['type']]($block, $ctx);
            } catch (\Throwable) {
                continue;
            }
            if (!is_array($result) || $result === []) {
                continue;
            }
            // A single node is an associative array with @type; otherwise a list of nodes.
            foreach (isset($result['@type']) ? [$result] : $result as $node) {
                if (is_array($node) && isset($node['@type'])) {
                    $nodes[] = $node;
                }
            }
        }

        return $nodes;
    }

    /** One FAQPage per document (several FAQ blocks merge), Offers under a Product keep their order. */
    function meridian_seo_merge(array $nodes): array
    {
        $merged = [];
        $faq = null;
        foreach ($nodes as $node) {
            if (($node['@type'] ?? null) === 'FAQPage') {
                if ($faq === null) {
                    $faq = count($merged);
                    $merged[] = $node;
                } else {
                    $merged[$faq]['mainEntity'] = array_merge($merged[$faq]['mainEntity'] ?? [], $node['mainEntity'] ?? []);
                }
                continue;
            }
            $merged[] = $node;
        }

        return $merged;
    }

    /** @param list<array{label: string, url?: string|null}> $trail the trail below the home crumb */
    function meridian_seo_breadcrumb_list(array $trail, string $homeName, string $homeUrl, string $currentUrl): ?array
    {
        $items = [['name' => $homeName, 'url' => $homeUrl]];
        foreach ($trail as $crumb) {
            $label = meridian_seo_text($crumb['label'] ?? '');
            if ($label !== '') {
                $items[] = ['name' => $label, 'url' => $crumb['url'] ?? null];
            }
        }
        if (count($items) < 2) {
            return null;
        }

        $elements = [];
        foreach ($items as $i => $item) {
            // The last crumb is the current page; Google accepts it without an item URL, but giving it one keeps the list uniform.
            $url = $item['url'] ?: ($i === count($items) - 1 ? $currentUrl : null);
            $elements[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $item['name'], 'item' => $url];
        }

        return ['@type' => 'BreadcrumbList', '@id' => $currentUrl . '#breadcrumb', 'itemListElement' => $elements];
    }

    /**
     * The whole @graph for one page.
     *
     * ctx: url, siteUrl (root of the language), isHome, locale, brand, homeLabel (visible name of the first crumb), title, description, image, logo, type (website|article),
     * schemaType, published, modified, author {name,url}, section, tags, wordCount, trail, searchUrl, nodes (extra nodes), content.
     */
    function meridian_seo_graph(array $ctx): array
    {
        $url = (string) $ctx['url'];
        $siteUrl = rtrim((string) $ctx['siteUrl'], '/') . '/';
        $orgId = $siteUrl . '#organization';
        $siteId = $siteUrl . '#website';
        $isHome = (bool) ($ctx['isHome'] ?? false);
        $locale = (string) ($ctx['locale'] ?? 'en');
        $brand = (string) $ctx['brand'];
        $graph = [];

        $organization = ['@type' => 'Organization', '@id' => $orgId, 'name' => $brand, 'url' => $siteUrl, 'logo' => !empty($ctx['logo']) ? ['@type' => 'ImageObject', 'url' => $ctx['logo']] : null];
        $website = [
            '@type' => 'WebSite', '@id' => $siteId, 'url' => $siteUrl, 'name' => $brand, 'inLanguage' => $locale,
            'publisher' => ['@id' => $orgId],
            'potentialAction' => !empty($ctx['searchUrl']) ? [
                '@type' => 'SearchAction',
                'target' => ['@type' => 'EntryPoint', 'urlTemplate' => $ctx['searchUrl'] . (str_contains((string) $ctx['searchUrl'], '?') ? '&' : '?') . 'q={search_term_string}'],
                'query-input' => 'required name=search_term_string',
            ] : null,
        ];
        // Organization is referenced by @id from every other node, so it travels with each page; WebSite only on the home page.
        $graph[] = $organization;
        if ($isHome) {
            $graph[] = $website;
        }

        $breadcrumb = meridian_seo_breadcrumb_list((array) ($ctx['trail'] ?? []), (string) ($ctx['homeLabel'] ?? '') ?: $brand, $siteUrl, $url);
        $image = !empty($ctx['image']) ? ['@type' => 'ImageObject', 'url' => $ctx['image']] : null;
        $isArticle = ($ctx['type'] ?? 'website') === 'article';

        if ($isArticle) {
            $author = $ctx['author'] ?? null;
            $graph[] = [
                '@type' => 'BlogPosting', '@id' => $url . '#article',
                'mainEntityOfPage' => ['@type' => 'WebPage', '@id' => $url],
                'headline' => mb_substr((string) $ctx['title'], 0, 110),
                'description' => $ctx['description'] ?? null,
                'image' => $image ? [$image['url']] : null,
                'datePublished' => meridian_seo_date($ctx['published'] ?? null),
                'dateModified' => meridian_seo_date($ctx['modified'] ?? ($ctx['published'] ?? null)),
                'author' => !empty($author['name']) ? ['@type' => 'Person', 'name' => $author['name'], 'url' => $author['url'] ?? null] : ['@id' => $orgId],
                'publisher' => ['@id' => $orgId],
                'isPartOf' => ['@id' => $siteId],
                'articleSection' => $ctx['section'] ?? null,
                'keywords' => !empty($ctx['tags']) ? implode(', ', (array) $ctx['tags']) : null,
                'wordCount' => !empty($ctx['wordCount']) ? (int) $ctx['wordCount'] : null,
                'inLanguage' => $locale,
            ];
        } else {
            $allowed = ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'SearchResultsPage'];
            $schemaType = in_array($ctx['schemaType'] ?? 'WebPage', $allowed, true) ? $ctx['schemaType'] : 'WebPage';
            $graph[] = [
                '@type' => $schemaType, '@id' => $url . '#webpage', 'url' => $url,
                'name' => $ctx['title'] ?? null, 'description' => $ctx['description'] ?? null, 'inLanguage' => $locale,
                'isPartOf' => $isHome ? ['@id' => $siteId] : ['@type' => 'WebSite', '@id' => $siteId, 'url' => $siteUrl, 'name' => $brand],
                'primaryImageOfPage' => $image,
                'breadcrumb' => $breadcrumb ? ['@id' => $breadcrumb['@id']] : null,
            ];
        }

        if ($breadcrumb) {
            $graph[] = $breadcrumb;
        }

        $blockNodes = meridian_seo_block_nodes($ctx['content'] ?? null, $ctx);
        foreach (meridian_seo_merge(array_merge($blockNodes, (array) ($ctx['nodes'] ?? []))) as $node) {
            $graph[] = $node;
        }

        return ['@context' => 'https://schema.org', '@graph' => $graph];
    }

    /** Absolute search page URL when the theme has a `search` page, else null (no SearchAction without a working target). */
    function meridian_seo_search_url(): ?string
    {
        try {
            $theme = \Cms\Classes\Theme::getActiveTheme();
            if (!$theme || !\Cms\Classes\Page::load($theme, 'search')) {
                return null;
            }

            return \Cms::pageUrl('search');
        } catch (\Throwable) {
            return null;
        }
    }
}
