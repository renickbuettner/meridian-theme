<?php

/** Shared onStart() for the Meridian layout: look, combined assets, language alternates and the cached chrome. */

if (!function_exists('meridian_boot')) {
    function meridian_boot($layout): void
    {
        $layout['seoUrl'] = \Request::url();

        require_once meridian_path('partials/site/look.php');
        $layout['meridianLook'] = meridian_look();

        $layout['meridianCss'] = \System\Classes\CombineAssets::combine(meridian_css_modules());
        $layout['meridianScripts'] = \System\Classes\CombineAssets::combine([
            '$/renick/content/assets/frontend/renick-content.js',
        ]);

        require_once meridian_path('partials/site/alternates.php');
        $layout['meridianAlternates'] = meridian_alternates();

        require_once meridian_path('partials/site/chrome.php');
        $chrome = meridian_chrome();
        $layout['meridianNav'] = $chrome['nav'];
        $layout['meridianFooterPages'] = $chrome['footer'];

        // Per-URL, so kept out of the chrome cache.
        $layout['meridianCurrentUrl'] = rtrim(\Request::url(), '/');

        meridian_listen_preview_assets();
    }
}

if (!function_exists('meridian_css_modules')) {
    /**
     * Stylesheets every page loads, in cascade order. Pages and blocks add their own module with
     * {% put styles %} / a <link> in the block partial; custom.css always comes last.
     *
     * @return list<string>
     */
    function meridian_css_modules(): array
    {
        $modules = [
            meridian_asset('dist/core.css'),
            '$/renick/content/assets/frontend/renick-content.css',
            meridian_asset('dist/layout-sidebar.css'),
            meridian_asset('dist/palette.css'),
        ];
        if (is_file(meridian_path('assets/css/custom.css'))) {
            $modules[] = meridian_asset('css/custom.css');
        }

        return $modules;
    }
}

if (!function_exists('meridian_listen_preview_assets')) {
    /** Editor preview: no Bootstrap 5 fallback; the theme's tokens, scheme and core sheet load instead. Registered here because the preview runs the layout first. */
    function meridian_listen_preview_assets(): void
    {
        static $registered = false;
        if ($registered || !class_exists(\Renick\Content\Classes\PreviewAssets::class)) {
            return;
        }
        $registered = true;

        \Event::listen('renick.content.resolvePreviewAssets', function (\Renick\Content\Classes\PreviewAssets $assets) {
            require_once meridian_path('partials/site/look.php');
            $look = meridian_look();
            $assets->withoutBootstrap();
            // The preview shows any block, and block modules otherwise load per page by block type.
            $blocks = array_map(fn ($file) => basename($file, '.css'), glob(meridian_path('assets/dist/block-*.css')) ?: []);
            foreach (['scheme-' . $look['scheme'], 'critical', 'core', ...$blocks] as $name) {
                $assets->addStylesheet(url('themes/' . meridian_dir() . '/assets/dist/' . $name . '.css'), \Renick\Content\Classes\PreviewAssets::BEFORE_THEME);
            }
            $assets->addInlineCss('html{color-scheme:light dark}');
        });
    }
}
