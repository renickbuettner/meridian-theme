<?php
/** SEO variables for partials/seo/head.htm from a Meridian\Page entry. partials/seo/seo.php builds the JSON-LD graph from them. */

if (!function_exists('meridian_media_url')) {
    /** Mediafinder path to an absolute URL. */
    function meridian_media_url(?string $path): ?string
    {
        $path = trim((string) $path);
        if ($path === '') {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        try {
            return url(\Media\Classes\MediaLibrary::url($path));
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** Sets the seo* vars on $page (ArrayAccess). */
    function meridian_page_seo($page, $entry, string $locale = 'en'): void
    {
        if (!$entry) {
            return;
        }

        $url = \Request::url();
        $canonical = trim((string) ($entry->canonical_url ?? ''));

        $page['seoTitle'] = $entry->meta_title ?: $entry->title;
        $page['seoDescription'] = $entry->meta_description ?: null;
        $page['seoUrl'] = $canonical !== '' ? $canonical : $url;
        $page['seoType'] = 'website';
        $page['seoImage'] = meridian_media_url($entry->og_image ?? null);
        $page['seoNoindex'] = (bool) ($entry->seo_noindex ?? false);

        $page['seoSchemaType'] = (string) ($entry->schema_type ?: 'WebPage');
        $page['seoContent'] = $entry->content;
        $page['seoBreadcrumbs'] = meridian_page_trail($entry);
    }

    /** @return list<array{label: string, url: ?string}> crumbs below home, from the fullslug ancestors; empty for the home page. */
    function meridian_page_trail($entry): array
    {
        $full = trim((string) $entry->fullslug, '/');
        if ($full === '' || $full === 'home') {
            return [];
        }

        $trail = [];
        $segments = explode('/', $full);
        foreach ($segments as $i => $segment) {
            $slug = implode('/', array_slice($segments, 0, $i + 1));
            if ($i === count($segments) - 1) {
                $trail[] = ['label' => (string) ($entry->nav_label ?: $entry->title), 'url' => null];
                break;
            }
            try {
                $parent = \Tailor\Models\EntryRecord::inSection('Meridian\\Page')->applyPublishedStatus()->where('fullslug', $slug)->first();
            } catch (\Throwable) {
                $parent = null;
            }
            $trail[] = ['label' => (string) ($parent ? ($parent->nav_label ?: $parent->title) : $segment), 'url' => $parent ? \Cms::url($slug) : null];
        }

        return $trail;
    }
}
