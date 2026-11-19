<?php
/** Theme settings as the values the layout needs: scheme, mode, sidebar, accent override and the inline CSS. */

require_once __DIR__ . '/contrast.php';

if (!function_exists('meridian_look')) {
    /**
     * @return array{scheme: string, mode: string, sidebar: string, position: string, brand: string, tagline: string, logo: string, footerNote: string, inlineCss: string, themeColors: array{light: string, dark: string}, customCss: string, transitions: bool, prefetch: bool}
     */
    function meridian_look(): array
    {
        $data = \Cms\Classes\Theme::getActiveTheme()?->getCustomData();

        $pick = function (string $key, array $allowed, string $default) use ($data): string {
            $value = (string) ($data->{$key} ?? '');

            return in_array($value, $allowed, true) ? $value : $default;
        };
        // null = never customised -> on; only an explicit false turns a checkbox off.
        $flag = fn (string $key): bool => !isset($data->{$key}) || $data->{$key} === null || (bool) $data->{$key};

        $scheme = $pick('color_scheme', ['teal', 'ember', 'ultramarine'], 'teal');
        $schemeCss = meridian_dist_css('scheme-' . $scheme);
        $palette = MeridianContrast::palette($schemeCss);

        $accent = strtolower(trim((string) ($data->accent_override ?? '')));
        $override = preg_match('/^#[0-9a-f]{6}$/', $accent) === 1
            ? MeridianContrast::accentRule($accent, $palette)
            : '';

        return [
            'scheme' => $scheme,
            'mode' => $pick('color_mode', ['system', 'light', 'dark'], 'system'),
            'sidebar' => $pick('sidebar_mode', ['auto', 'fixed', 'offcanvas'], 'auto'),
            'position' => $pick('sidebar_position', ['left', 'right'], 'left') === 'right' ? 'end' : 'start',
            'brand' => trim((string) ($data->brand_name ?? '')) ?: 'Meridian',
            'tagline' => trim((string) ($data->brand_tagline ?? '')),
            'logo' => trim((string) ($data->brand_logo ?? '')),
            'footerNote' => trim((string) ($data->footer_note ?? '')),
            // Validated files and hex only, so it prints unescaped inside <style>.
            'inlineCss' => $schemeCss . $override . meridian_dist_css('critical'),
            'themeColors' => ['light' => $palette['bg'][0], 'dark' => $palette['bg'][1]],
            'customCss' => str_replace('</', '<\/', trim((string) ($data->custom_css ?? ''))),
            'transitions' => $flag('view_transitions'),
            'prefetch' => $flag('turbo_prefetch'),
        ];
    }

    /** Contents of assets/dist/<name>.css, '' when the build has not run. */
    function meridian_dist_css(string $name): string
    {
        static $cache = [];

        return $cache[$name] ??= (string) @file_get_contents(meridian_path('assets/dist/' . $name . '.css'));
    }
}
