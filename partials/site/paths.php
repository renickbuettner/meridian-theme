<?php
/** The folder is `meridian` when copied in and `renick-meridian` from the Marketplace (or a parent's on a child theme): never hardcode it. */

if (!function_exists('meridian_dir')) {
    /** Falls back to the active theme's root so a page rendered without Meridian's layout still resolves. */
    function meridian_dir(?string $setTo = null): string
    {
        static $dirName = null;

        if ($setTo !== null) {
            return $dirName = $setTo;
        }

        if ($dirName !== null) {
            return $dirName;
        }

        $theme = \Cms\Classes\Theme::getActiveTheme();
        while ($theme && ($parent = $theme->getParentTheme())) {
            $theme = $parent;
        }

        return $dirName = $theme ? $theme->getDirName() : 'meridian';
    }
}

if (!function_exists('meridian_layout_boot')) {
    /** The layouts' onStart(): resolve Meridian's folder from the root theme, then run the shared boot. */
    function meridian_layout_boot($layout, \Cms\Classes\Theme $theme): void
    {
        meridian_dir($theme->getDirName());
        require_once meridian_path('partials/site/boot.php');
        meridian_boot($layout);
    }
}

if (!function_exists('meridian_path')) {
    function meridian_path(string $relative = ''): string
    {
        $base = themes_path(meridian_dir());

        return $relative === '' ? $base : $base . '/' . ltrim($relative, '/');
    }
}

if (!function_exists('meridian_asset')) {
    /** CombineAssets `~/` alias for a file under assets/. */
    function meridian_asset(string $relative): string
    {
        return '~/themes/' . meridian_dir() . '/assets/' . ltrim($relative, '/');
    }
}

if (!function_exists('meridian_locale')) {
    /** `$this->site` is unset in onStart, so page code reads the locale here. */
    function meridian_locale(): string
    {
        $locale = \Site::getActiveSite()?->locale ?: \App::getLocale();

        return is_string($locale) && $locale !== '' ? $locale : 'en';
    }
}
