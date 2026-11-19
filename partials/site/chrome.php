<?php

/** Site chrome cached per site, locale and origin; plain arrays only. */

if (!function_exists('meridian_missing_blueprint')) {
    /** Tailor throws this plain ExceptionBase for an uninstalled handle. */
    function meridian_missing_blueprint(\Throwable $e): bool
    {
        return $e instanceof \October\Rain\Exception\ExceptionBase
            && preg_match('/^(Section|Global) handle \[[^\]]+\] not found$/', $e->getMessage()) === 1;
    }
}

if (!function_exists('meridian_chrome')) {
    /** @return array{nav: list<array<string, mixed>>, footer: list<array<string, mixed>>} */
    function meridian_chrome(): array
    {
        $build = fn () => [
            'nav' => meridian_nav_pages(),
            'footer' => meridian_footer_pages(),
        ];

        // Failure renders bare chrome for this request only: caching the fallback would freeze an outage until the next invalidation.
        try {
            if (!class_exists(\Renick\Content\Classes\CacheManager::class)) {
                return $build();
            }

            // Context site, not the active one: the editor preview queries another site's pages via Site::withContext().
            $site = \Site::getSiteFromContext() ?: \Site::getActiveSite();
            $key = 'meridian:chrome:' . ($site->id ?? '-') . ':' . ($site->locale ?? 'en')
                . ':' . \Renick\Content\Classes\BlockRenderer::requestOrigin();

            return \Renick\Content\Classes\CacheManager::remember(\Renick\Content\Classes\CacheManager::NS_CHROME, $key, null, $build);
        } catch (\Throwable $e) {
            if (class_exists(\Renick\Content\Classes\Diagnostics::class)) {
                \Renick\Content\Classes\Diagnostics::swallowed($e, 'meridian.chrome');
            }

            return ['nav' => [], 'footer' => []];
        }
    }

    /**
     * @param  callable(\Illuminate\Database\Eloquent\Builder): void  $scope
     * @return list<array{fullslug: string, title: string, label: string, icon: string, slug: string, parent: bool}>
     */
    function meridian_published_pages(callable $scope): array
    {
        try {
            $query = \Tailor\Models\EntryRecord::inSection('Meridian\\Page')->applyPublishedStatus();
            $scope($query);

            return $query->orderBy('nest_left')
                ->get()
                ->map(fn ($p) => [
                    'fullslug' => (string) $p->fullslug,
                    'slug' => (string) $p->slug,
                    'title' => (string) $p->title,
                    'label' => trim((string) ($p->nav_label ?? '')) ?: (string) $p->title,
                    'icon' => preg_match('/^[a-z0-9-]+$/', (string) ($p->nav_icon ?? '')) ? (string) $p->nav_icon : '',
                    'parent' => false,
                ])
                // A page without a fullslug would link to the route's "default" placeholder, a 404.
                ->filter(fn ($p) => $p['fullslug'] !== '')
                ->values()
                ->all();
        } catch (\Throwable $e) {
            if (!meridian_missing_blueprint($e)) {
                throw $e;
            }

            return [];
        }
    }

    /** Top-level published pages in tree order: home first (as "Home"), hide_from_nav excluded. */
    function meridian_nav_pages(): array
    {
        return meridian_published_pages(fn ($q) => $q
            ->whereNull('parent_id')
            ->where(fn ($w) => $w->whereNull('hide_from_nav')->orWhere('hide_from_nav', 0)));
    }

    /** Published pages flagged show_in_footer (imprint, privacy, ...). */
    function meridian_footer_pages(): array
    {
        return meridian_published_pages(fn ($q) => $q->where('show_in_footer', 1));
    }
}
