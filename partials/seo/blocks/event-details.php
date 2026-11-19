<?php
/**
 * Event from event-details. Fields: name, description, start, end (date-time in `timezone`), mode (offline|online|mixed), venue, address,
 * join_url, price, currency, registration_url, status (scheduled|cancelled|postponed), performer.
 */

return function (array $block, array $ctx): ?array {
    $data = $block['data'];
    $zone = in_array($data['timezone'] ?? '', \DateTimeZone::listIdentifiers(), true) ? $data['timezone'] : 'Europe/Berlin';
    $start = meridian_seo_date(meridian_seo_pick($data, ['start', 'starts_at', 'start_date']), $zone);
    if ($start === null) {
        return null;
    }

    $mode = in_array($data['mode'] ?? '', ['online', 'mixed'], true) ? $data['mode'] : 'offline';
    $location = [];
    if ($mode !== 'online') {
        $location[] = ['@type' => 'Place', 'name' => meridian_seo_text($data['venue'] ?? ''), 'address' => meridian_seo_text($data['address'] ?? '')];
    }
    if ($mode !== 'offline') {
        $location[] = ['@type' => 'VirtualLocation', 'url' => meridian_seo_text($data['join_url'] ?? '') ?: $ctx['url']];
    }
    $location = array_values(array_filter($location, fn ($l) => count(meridian_seo_prune($l)) > 1));

    $price = meridian_seo_price($data['price'] ?? null);
    $status = ['cancelled' => 'EventCancelled', 'postponed' => 'EventPostponed'][$data['status'] ?? ''] ?? 'EventScheduled';
    $attendance = ['online' => 'OnlineEventAttendanceMode', 'mixed' => 'MixedEventAttendanceMode'][$mode] ?? 'OfflineEventAttendanceMode';

    return [
        '@type' => 'Event', '@id' => $ctx['url'] . '#event',
        'name' => meridian_seo_text($data['name'] ?? '') ?: ($ctx['title'] ?? ''),
        'description' => meridian_seo_text($data['description'] ?? '') ?: ($ctx['description'] ?? null),
        'startDate' => $start,
        'endDate' => meridian_seo_date(meridian_seo_pick($data, ['end', 'ends_at', 'end_date']), $zone),
        'eventStatus' => 'https://schema.org/' . $status,
        'eventAttendanceMode' => 'https://schema.org/' . $attendance,
        'location' => count($location) === 1 ? $location[0] : $location,
        'image' => $ctx['image'] ?? null,
        'inLanguage' => $ctx['locale'] ?? null,
        'organizer' => ['@id' => rtrim((string) $ctx['siteUrl'], '/') . '/#organization'],
        'performer' => !empty($data['performer']) ? ['@type' => 'Person', 'name' => meridian_seo_text($data['performer'])] : null,
        'offers' => $price !== null ? [
            '@type' => 'Offer', 'price' => $price, 'priceCurrency' => strtoupper(preg_replace('/[^A-Za-z]/', '', (string) ($data['currency'] ?? '')) ?: 'EUR'),
            'url' => meridian_seo_text($data['registration_url'] ?? '') ?: $ctx['url'], 'availability' => 'https://schema.org/InStock',
        ] : null,
    ];
};
