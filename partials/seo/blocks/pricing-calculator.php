<?php
/**
 * Shared Product + Offers builder (pricing-plans.php reuses it). Fields: product_name|title, description|lead, currency (ISO 4217),
 * unit (text), price_monthly / price_yearly (per month), plans[] {name, price_monthly, price_yearly}. The pricing-calculator block
 * prints its own Product markup from the live tiers, so it is skipped here to avoid a second Product.
 */

return function (array $block, array $ctx): ?array {
    if ($block['type'] === 'pricing-calculator') {
        return null;
    }
    $data = $block['data'];
    $currency = strtoupper(preg_replace('/[^A-Za-z]/', '', (string) ($data['currency'] ?? ''))) ?: 'EUR';
    $unit = meridian_seo_text($data['unit'] ?? '');

    $offer = function (array $row, string $name = '') use ($currency, $unit): array {
        $offers = [];
        foreach (['price_monthly' => 'monthly', 'price_yearly' => 'yearly'] as $field => $term) {
            $price = meridian_seo_price($row[$field] ?? null);
            if ($price === null) {
                continue;
            }
            $offers[] = [
                '@type' => 'Offer',
                'name' => $name !== '' ? $name . ' (' . $term . ')' : null,
                'price' => $price,
                'priceCurrency' => $currency,
                'availability' => 'https://schema.org/InStock',
                'priceSpecification' => [
                    '@type' => 'UnitPriceSpecification', 'price' => $price, 'priceCurrency' => $currency,
                    'billingDuration' => 1, 'billingIncrement' => 1, 'unitCode' => 'MON', 'unitText' => $unit ?: null,
                ],
            ];
        }

        return $offers;
    };

    $offers = [];
    foreach ((array) ($data['plans'] ?? []) as $plan) {
        if (is_array($plan)) {
            $offers = array_merge($offers, $offer($plan, meridian_seo_text($plan['name'] ?? '')));
        }
    }
    if (!$offers) {
        $offers = $offer($data);
    }
    if (!$offers) {
        return null;
    }

    return [
        '@type' => 'Product', '@id' => $ctx['url'] . '#product',
        'name' => meridian_seo_text(meridian_seo_pick($data, ['product_name', 'title'])) ?: (string) ($ctx['brand'] ?? ''),
        'description' => meridian_seo_text(meridian_seo_pick($data, ['description', 'lead'])) ?: ($ctx['description'] ?? null),
        'image' => $ctx['image'] ?? null,
        'brand' => ['@type' => 'Brand', 'name' => $ctx['brand'] ?? null],
        'offers' => count($offers) === 1 ? $offers[0] : $offers,
    ];
};
