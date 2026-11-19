<?php
/** Sitemap provider: journal posts, and the category and author pages that hold at least one published post. Tags stay out (thin listings). */

return static function (array $sites): array {
    $theme = \Cms\Classes\Theme::getActiveTheme();
    if (!$theme) {
        return [];
    }
    $router = new \Cms\Classes\Router($theme);
    $path = static fn (string $page) => static function (array $row) use ($router, $page): ?string {
        $url = $row['slug'] === '' ? null : $router->findByFile($page, ['slug' => $row['slug']]);

        return $url ? '/' . ltrim($url, '/') : null;
    };
    $entries = static fn (string $section) => \Tailor\Models\EntryRecord::inSection($section);
    $posts = static fn () => $entries('Meridian\\Post')->applyPublishedStatus();
    $listed = static fn (string $section, string $relation) => static fn () => $entries($section)
        ->whereIn('id', $posts()->with($relation)->get()->pluck($relation)->flatten()->filter()->pluck('id')->unique()->all())
        ->get()->map('meridian_sitemap_row')->all();

    return array_merge(
        meridian_sitemap_group($sites, fn () => $posts()->get()->map('meridian_sitemap_row')->all(), $path('journal-post')),
        meridian_sitemap_group($sites, $listed('Meridian\\Category', 'category'), $path('journal-category')),
        meridian_sitemap_group($sites, $listed('Meridian\\Author', 'author'), $path('journal-author')),
    );
};
