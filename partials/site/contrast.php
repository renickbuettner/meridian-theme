<?php
/** WCAG contrast for the accent override: keeps a free hex readable on the scheme's light and dark background. */

if (!class_exists('MeridianContrast')) {
    final class MeridianContrast
    {
        private const MIN_TEXT = 4.5;

        public static function luminance(string $hex): float
        {
            $c = array_map(
                fn ($i) => hexdec(substr($hex, $i, 2)) / 255,
                [1, 3, 5]
            );
            $c = array_map(fn ($v) => $v <= 0.03928 ? $v / 12.92 : (($v + 0.055) / 1.055) ** 2.4, $c);

            return 0.2126 * $c[0] + 0.7152 * $c[1] + 0.0722 * $c[2];
        }

        public static function ratio(string $a, string $b): float
        {
            [$hi, $lo] = [self::luminance($a), self::luminance($b)];
            if ($lo > $hi) {
                [$hi, $lo] = [$lo, $hi];
            }

            return ($hi + 0.05) / ($lo + 0.05);
        }

        public static function mix(string $a, string $b, float $weightA): string
        {
            $out = '#';
            foreach ([1, 3, 5] as $i) {
                $out .= str_pad(dechex((int) round(hexdec(substr($a, $i, 2)) * $weightA + hexdec(substr($b, $i, 2)) * (1 - $weightA))), 2, '0', STR_PAD_LEFT);
            }

            return $out;
        }

        /**
         * Reads `--mr-<key>: light-dark(#L, #D)` pairs out of a compiled scheme sheet.
         *
         * @return array<string, array{0: string, 1: string}>
         */
        public static function palette(string $css): array
        {
            $palette = [];
            foreach (['bg', 'ink', 'accent', 'on-accent'] as $key) {
                if (preg_match('/--mr-' . $key . ':\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/i', $css, $m)) {
                    $palette[$key] = [strtolower($m[1]), strtolower($m[2])];
                }
            }

            return $palette + [
                'bg' => ['#eef1ef', '#0e1614'], 'ink' => ['#14211f', '#e6eeeb'],
                'accent' => ['#0d6b62', '#4cc3b3'], 'on-accent' => ['#ffffff', '#0e1614'],
            ];
        }

        /** Pulls $hex toward the text colour until it reaches 4.5:1 on $bg. */
        public static function readable(string $hex, string $bg, string $ink): string
        {
            for ($i = 0; $i <= 20 && self::ratio($hex, $bg) < self::MIN_TEXT; $i++) {
                $hex = self::mix($hex, $ink, 0.9);
            }

            return $hex;
        }

        public static function onColour(string $accent, string $light, string $dark): string
        {
            return self::ratio($accent, $light) >= self::ratio($accent, $dark) ? $light : $dark;
        }

        /** @param array<string, array{0: string, 1: string}> $palette */
        public static function accentRule(string $hex, array $palette): string
        {
            $light = self::readable($hex, $palette['bg'][0], $palette['ink'][0]);
            $dark = self::readable($hex, $palette['bg'][1], $palette['ink'][1]);
            $onLight = self::onColour($light, '#ffffff', $palette['bg'][1]);
            $onDark = self::onColour($dark, '#ffffff', $palette['bg'][1]);

            return sprintf(
                'html[data-scheme]{--mr-accent:light-dark(%s,%s);--mr-on-accent:light-dark(%s,%s)}',
                $light, $dark, $onLight, $onDark
            );
        }
    }
}
