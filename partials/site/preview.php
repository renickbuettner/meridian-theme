<?php
/** Draft preview for manually-routed pages: onStart() runs before the section component checks `_preview_token`; core still enforces it. */

if (!function_exists('meridian_preview_entry')) {
    function meridian_preview_entry(string $handle): ?\Tailor\Models\EntryRecord
    {
        $token = trim((string) get('_preview_token'));
        if ($token === '' || !class_exists(\Tailor\Models\PreviewToken::class)) {
            return null;
        }

        try {
            \Tailor\Models\PreviewToken::checkTokenForCurrentUrl($token);

            $enabled = \Tailor\Models\PreviewToken::getEnabledToken();
            $previewId = $enabled?->getRouteParam('id');
            if (!$previewId) {
                return null;
            }

            return \Tailor\Models\EntryRecord::inSection($handle)
                ->withoutGlobalScopes()
                ->find($previewId);
        } catch (\Throwable) {
            return null;
        }
    }
}
