<?php
/** Journal (blog) data layer: queries, card data, reading time, table of contents, SEO variables. */

require_once meridian_path('partials/site/page-seo.php');

if (!function_exists('meridian_journal_posts')) {
    function meridian_journal_per_page(): int
    {
        return 6;
    }

    /** Published posts, newest first, with the relations every card needs. */
    function meridian_journal_posts(): \Illuminate\Database\Eloquent\Builder
    {
        $query = \Tailor\Models\EntryRecord::inSection('Meridian\\Post');
        $table = $query->getModel()->getTable();

        // Tailor leaves published_at NULL when the editor sets no date but fills published_at_date (= published_at ?: created_at) on save.
        return $query->applyPublishedStatus()
            ->with(['category', 'tags', 'author'])
            ->orderByRaw("COALESCE({$table}.published_at_date, {$table}.published_at, {$table}.created_at) DESC");
    }

    /** The date a post counts as published: Tailor's published_at_date, else published_at, else created_at. */
    function meridian_journal_published($post): ?\Carbon\Carbon
    {
        return $post->published_at_date ?: ($post->published_at ?: ($post->created_at ?: null));
    }

    function meridian_journal_url(string $page = 'journal', array $params = []): string
    {
        return \Cms::pageUrl($page, $params);
    }

    /** @return array{src: string, srcset: string, webp: string, avif: string} */
    function meridian_journal_image(?string $path, int $width, int $height, array $widths): array
    {
        $path = trim((string) $path);
        $empty = ['src' => '', 'srcset' => '', 'webp' => '', 'avif' => ''];
        if ($path === '') {
            return $empty;
        }
        if (!class_exists(\Renick\Content\Classes\BlockRenderer::class)) {
            return ['src' => (string) \Media\Classes\MediaLibrary::url($path)] + $empty;
        }

        $options = ['mode' => 'crop', 'quality' => 78];
        $srcset = static fn (array $extra): string => \Renick\Content\Classes\BlockRenderer::srcset($path, $widths, ['ratio' => $height / $width] + $extra + $options);

        return [
            'src' => \Renick\Content\Classes\BlockRenderer::resizeUrl($path, $width, $height, $options),
            'srcset' => $srcset([]),
            'webp' => $srcset(['extension' => 'webp']),
            'avif' => $srcset(['extension' => 'avif']),
        ];
    }

    /** Locale date from a Carbon; the format is a pattern per language, not prose. */
    function meridian_journal_date($date, bool $short = false): string
    {
        if (!$date) {
            return '';
        }
        $locale = meridian_locale();
        $formats = [
            'en' => ['F j, Y', 'M j, Y'],
            'de' => ['j. F Y', 'j. M Y'],
            'es' => ['j \d\e F \d\e Y', 'j M Y'],
        ];
        $format = ($formats[$locale] ?? $formats['en'])[$short ? 1 : 0];

        return \Illuminate\Support\Carbon::parse($date)->locale($locale)->translatedFormat($format);
    }

    /** All visible words of a content document, code blocks excluded. */
    function meridian_journal_words(mixed $content): int
    {
        if (is_string($content)) {
            $content = json_decode($content, true);
        }
        $count = 0;
        $walk = function (array $blocks) use (&$walk, &$count): void {
            foreach ($blocks as $block) {
                if (!is_array($block)) {
                    continue;
                }
                if (($block['type'] ?? '') !== 'code') {
                    foreach ((array) ($block['data'] ?? []) as $value) {
                        if (is_string($value) && $value !== '') {
                            $count += count(preg_split('/\s+/u', trim(strip_tags($value)), -1, PREG_SPLIT_NO_EMPTY) ?: []);
                        }
                    }
                }
                $walk((array) ($block['children'] ?? []));
            }
        };
        $walk(is_array($content) ? (array) ($content['blocks'] ?? $content) : []);

        return $count;
    }

    // Firefox lacks a German hyphenation dictionary in places, so very long words get soft hyphens at crude syllable breaks.
    function meridian_journal_shy(string $text): string
    {
        $out = '';
        foreach (preg_split('~(\p{L}{16,})~u', $text, -1, PREG_SPLIT_DELIM_CAPTURE) as $i => $piece) {
            if ($i % 2 === 0) {
                $out .= e($piece);
                continue;
            }
            $chunks = [];
            $chunk = '';
            foreach (preg_split('~(?<=[aeiouyäöü])(?=[^aeiouyäöü][aeiouyäöü])~u', $piece) as $part) {
                $chunk .= $part;
                if (mb_strlen($chunk) >= 6) {
                    $chunks[] = e($chunk);
                    $chunk = '';
                }
            }
            if ($chunk !== '') {
                $chunks[] = e($chunk);
            }
            $out .= implode('&shy;', $chunks);
        }
        return $out;
    }

    function meridian_journal_minutes(int $words): int
    {
        $wpm = ['de' => 200, 'es' => 230][meridian_locale()] ?? 220;

        return max(1, (int) ceil($words / $wpm));
    }

    /** Plain array for the card partial: no Eloquent objects in the template. */
    function meridian_journal_card($post, bool $lead = false): array
    {
        $category = $post->category;
        $author = $post->author;

        return [
            'id' => $post->id,
            'title' => (string) $post->title,
            'titleHtml' => meridian_journal_shy((string) $post->title),
            'url' => meridian_journal_url('journal-post', ['slug' => $post->slug]),
            'excerpt' => trim((string) $post->excerpt),
            'date' => meridian_journal_date(meridian_journal_published($post), true),
            'iso' => meridian_journal_published($post)?->format('Y-m-d') ?? '',
            'minutes' => meridian_journal_minutes(meridian_journal_words($post->content)),
            'category' => $category ? ['title' => (string) $category->title, 'url' => meridian_journal_url('journal-category', ['slug' => $category->slug])] : null,
            'author' => $author ? ['name' => (string) $author->title, 'url' => meridian_journal_url('journal-author', ['slug' => $author->slug])] : null,
            'alt' => trim((string) $post->cover_alt),
            'image' => $lead
                ? meridian_journal_image($post->cover, 1200, 750, [480, 720, 960, 1200])
                : meridian_journal_image($post->cover, 640, 400, [320, 480, 640, 800]),
        ];
    }

    /** @return list<array<string, mixed>> */
    function meridian_journal_cards($posts, bool $leadFirst = false): array
    {
        $cards = [];
        foreach ($posts as $i => $post) {
            $cards[] = meridian_journal_card($post, $leadFirst && $i === 0);
        }

        return $cards;
    }

    /** Category chips for the filter row, with the number of posts each holds. */
    function meridian_journal_categories(): array
    {
        $out = [];
        foreach (\Tailor\Models\EntryRecord::inSection('Meridian\\Category')->orderBy('title')->get() as $category) {
            $out[] = ['id' => $category->id, 'slug' => (string) $category->slug, 'title' => (string) $category->title, 'url' => meridian_journal_url('journal-category', ['slug' => $category->slug])];
        }

        return $out;
    }

    /** Pagination URL template (with {page}) for the current URL, other query parameters kept. */
    function meridian_journal_page_template(): string
    {
        $query = \Request::except('page');
        $qs = $query ? http_build_query($query) . '&' : '';

        return \Request::url() . '?' . $qs . 'page={page}';
    }

    /** Related posts: same category and shared tags first. */
    function meridian_journal_related($post, int $limit = 3): array
    {
        $tagIds = $post->tags->pluck('id')->all();
        $categoryId = $post->category?->id;
        $scored = [];
        foreach (meridian_journal_posts()->where('id', '!=', $post->id)->limit(40)->get() as $other) {
            $score = ($categoryId && $other->category?->id === $categoryId ? 2 : 0) + count(array_intersect($tagIds, $other->tags->pluck('id')->all()));
            $scored[] = [$score, $other];
        }
        usort($scored, fn ($a, $b) => $b[0] <=> $a[0]);

        return meridian_journal_cards(array_map(fn ($row) => $row[1], array_slice($scored, 0, $limit)));
    }

    /**
     * Adds ids to h2/h3 and returns the outline.
     *
     * @return array{0: string, 1: list<array{id: string, text: string, level: int}>}
     */
    function meridian_journal_outline(string $html): array
    {
        $items = [];
        $used = [];
        $html = preg_replace_callback('~<h([23])(\s[^>]*)?>(.*?)</h\1>~is', function ($m) use (&$items, &$used) {
            $text = trim(html_entity_decode(strip_tags($m[3]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            $attrs = (string) ($m[2] ?? '');
            if ($text === '') {
                return $m[0];
            }
            if (preg_match('/\sid="([^"]+)"/', $attrs, $existing)) {
                $id = $existing[1];
            } else {
                $base = \Str::slug($text) ?: 'section';
                $id = $base;
                // A heading "Bootstrap" must not become window.bootstrap (the plugin's reserved globals)
                $reserved = static fn (string $id): bool => method_exists(\Renick\Content\Classes\Render\ReservedIds::class, 'isReserved')
                    && \Renick\Content\Classes\Render\ReservedIds::isReserved($id);
                for ($n = 2; isset($used[$id]) || $reserved($id); $n++) {
                    $id = $base . '-' . $n;
                }
                $attrs .= ' id="' . e($id) . '"';
            }
            $used[$id] = true;
            $items[] = ['id' => $id, 'text' => $text, 'level' => (int) $m[1]];

            return '<h' . $m[1] . $attrs . '>' . $m[3] . '</h' . $m[1] . '>';
        }, $html);

        return [$html, $items];
    }

    /** seo* variables of the shared SEO partial (contract: skills/meridian/seo.md). */
    function meridian_journal_seo($page, array $seo): void
    {
        foreach ($seo as $key => $value) {
            $page['seo' . ucfirst($key)] = $value;
        }
    }

    /** The 404 response every journal route uses for an unknown slug or a page past the end. */
    function meridian_journal_not_found($page)
    {
        $page->setStatusCode(404);

        return $page->controller->run('404');
    }

    /** Frontend string from the theme's translate catalog, key itself when RainLab.Translate is absent. */
    function meridian_journal_t(string $key, array $params = []): string
    {
        if (class_exists(\RainLab\Translate\Models\Message::class)) {
            return (string) \RainLab\Translate\Models\Message::trans($key, $params);
        }

        return $key;
    }

    /** The Meridian\Page row that fronts the journal (title, lead and SEO are editable there). */
    function meridian_journal_index_entry(): ?\Tailor\Models\EntryRecord
    {
        try {
            return \Tailor\Models\EntryRecord::inSection('Meridian\\Page')->applyPublishedStatus()->where('fullslug', 'journal')->first();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Shared body of every listing route: paginate (404 past the end), build the cards and the SEO variables.
     *
     * @param  array{eyebrow: string, title: string, lead?: string, extra?: array}  $head
     * @param  list<array{label: string, url: ?string}>  $trail  crumbs below home
     * @return mixed a 404 response, else null
     */
    function meridian_journal_listing($page, $query, array $head, array $trail, array $opts = [])
    {
        // The lead card makes page 1 seven items (lead + two full rows), later pages six.
        $per = meridian_journal_per_page();
        $lead = !empty($opts['lead']);
        $total = (clone $query)->toBase()->getCountForPagination();
        $first = $lead ? $per + 1 : $per;
        $last = 1 + (int) ceil(max(0, $total - $first) / $per);
        $current = max(1, (int) \Request::input('page', 1));
        if ($current > $last) {
            return meridian_journal_not_found($page);
        }
        $posts = $query->skip($current === 1 ? 0 : $first + ($current - 2) * $per)->take($current === 1 ? $first : $per)->get();

        $page['jHead'] = $head;
        $page['jCards'] = meridian_journal_cards($posts, $lead && $current === 1);
        $page['jLead'] = $lead && $current === 1;
        $page['jTotal'] = $total;
        $page['jPager'] = ['current' => $current, 'last' => $last, 'url' => meridian_journal_page_template()];
        $page['jCategories'] = meridian_journal_categories();
        $page['jActiveCategory'] = $opts['category'] ?? '';
        $page['jIndexUrl'] = meridian_journal_url('journal');

        $title = $head['title'] . ($current > 1 ? ' · ' . meridian_journal_t('meridian.front.journal.page_suffix', ['page' => $current]) : '');
        meridian_journal_seo($page, [
            'title' => $opts['seoTitle'] ?? $title,
            'description' => $opts['seoDescription'] ?? ($head['lead'] ?? null),
            'url' => \Request::url() . ($current > 1 ? '?page=' . $current : ''),
            'schemaType' => 'CollectionPage',
            'breadcrumbs' => $trail,
        ]);

        return null;
    }

    /** Plain array for the author box and the author page. */
    function meridian_journal_author($author): array
    {
        $name = (string) $author->title;
        $initials = '';
        foreach (preg_split('/\s+/u', $name, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $part) {
            $initials .= mb_strtoupper(mb_substr($part, 0, 1));
        }
        $website = trim((string) $author->website);

        return [
            'name' => $name,
            'role' => trim((string) $author->role),
            'bio' => trim((string) $author->bio),
            'url' => meridian_journal_url('journal-author', ['slug' => $author->slug]),
            'website' => preg_match('~^https?://~i', $website) === 1 ? $website : '',
            'initials' => mb_substr($initials, 0, 2),
            'avatar' => meridian_journal_image($author->avatar, 192, 192, [96, 192]),
        ];
    }
}
