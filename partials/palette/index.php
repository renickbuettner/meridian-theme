<?php

/** Static search index of the command palette: published pages and journal posts of the current site, cached with the chrome. */

if (!function_exists('meridian_palette_index')) {
    /** @return list<array{t: string, u: string, k: string, d: string}> */
    function meridian_palette_index(): array
    {
        $build = function (): array {
            $items = [];
            $short = fn ($text) => mb_strimwidth(trim(preg_replace('/\s+/u', ' ', strip_tags((string) $text))), 0, 120, '…');

            $pages = \Tailor\Models\EntryRecord::inSection('Meridian\\Page')->applyPublishedStatus()
                ->where(fn ($w) => $w->whereNull('seo_noindex')->orWhere('seo_noindex', 0))
                ->orderBy('nest_left')->get();
            foreach ($pages as $page) {
                if ((string) $page->fullslug === '') {
                    continue;
                }
                $items[] = [
                    't' => (string) $page->title,
                    'u' => $page->fullslug === 'home' ? \Cms::pageUrl('index') : \Cms::pageUrl('page', ['path' => $page->fullslug]),
                    'k' => 'page',
                    'd' => $short($page->meta_description),
                ];
            }

            try {
                foreach (meridian_journal_posts()->limit(300)->get() as $post) {
                    $items[] = [
                        't' => (string) $post->title,
                        'u' => meridian_journal_url('journal-post', ['slug' => $post->slug]),
                        'k' => 'post',
                        'd' => $short($post->excerpt),
                    ];
                }
            } catch (\Throwable $e) {
                if (!meridian_missing_blueprint($e)) {
                    throw $e;
                }
            }

            return $items;
        };

        if (!class_exists(\Renick\Content\Classes\CacheManager::class)) {
            return $build();
        }

        $site = \Site::getSiteFromContext() ?: \Site::getActiveSite();
        $key = 'meridian:palette:' . ($site->id ?? '-') . ':' . ($site->locale ?? 'en') . ':' . \Renick\Content\Classes\BlockRenderer::requestOrigin();

        return \Renick\Content\Classes\CacheManager::remember(\Renick\Content\Classes\CacheManager::NS_CHROME, $key, null, $build);
    }
}
