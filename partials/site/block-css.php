<?php
/** Per-page block stylesheets: assets/dist/block-<handle>.css loads when the document contains that block type. */

if (!function_exists('meridian_block_types')) {
    /** @return list<string> distinct block types in a content document, children included */
    function meridian_block_types(mixed $content): array
    {
        if (is_string($content)) {
            $content = json_decode($content, true);
        }
        $blocks = is_array($content) ? ($content['blocks'] ?? $content) : [];
        $types = [];
        $walk = function (array $list) use (&$walk, &$types): void {
            foreach ($list as $block) {
                if (!is_array($block)) {
                    continue;
                }
                if (is_string($block['type'] ?? null)) {
                    $types[$block['type']] = true;
                }
                if (is_array($block['children'] ?? null)) {
                    $walk($block['children']);
                }
            }
        };
        $walk($blocks);

        return array_keys($types);
    }

    /** Combined stylesheet URL for the blocks a document uses, null when none of them ship a module. */
    function meridian_block_css(mixed $content): ?string
    {
        $modules = [];
        foreach (meridian_block_types($content) as $type) {
            if (preg_match('/^[a-z0-9-]+$/', $type) && is_file(meridian_path("assets/dist/block-{$type}.css"))) {
                $modules[] = meridian_asset("dist/block-{$type}.css");
            }
        }
        sort($modules);

        return $modules ? \System\Classes\CombineAssets::combine($modules) : null;
    }
}
