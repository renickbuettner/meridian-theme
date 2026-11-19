// Filter chips (aria-pressed) over a grid that is fully visible without JS; kept items glide to their new cell (FLIP).
export default function init(el, { signal }) {
    const chips = [...el.querySelectorAll('.mr-chip[data-cat]')];
    const items = [...el.querySelectorAll('.mr-pg__item')];
    const count = el.querySelector('[data-count]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const label = el.dataset.tCount || '';
    const running = new Set();
    let current = 'all';

    // Native lazy loading can leave off-screen cards empty on short viewports; the island loads on idle, so fetch them now.
    el.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });

    function say() {
        const shown = items.filter((i) => !i.hidden).length;
        if (count) count.textContent = current === 'all' ? '' : label.replace(':shown', shown).replace(':total', items.length);
    }

    function apply(cat) {
        const animate = !reduced.matches && typeof Element.prototype.animate === 'function';
        const first = animate ? new Map(items.filter((i) => !i.hidden).map((i) => [i, i.getBoundingClientRect()])) : null;
        running.forEach((a) => a.cancel());
        running.clear();

        current = cat;
        chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === cat)));
        items.forEach((i) => { i.hidden = cat !== 'all' && i.dataset.cat !== cat; });
        say();
        if (!animate) return;

        const opts = { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
        items.forEach((item) => {
            if (item.hidden) return;
            const from = first.get(item);
            const to = item.getBoundingClientRect();
            const frames = from
                ? [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: 'none' }]
                : [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }];
            if (from && from.left === to.left && from.top === to.top) return;
            const a = item.animate(frames, opts);
            running.add(a);
            a.onfinish = a.oncancel = () => running.delete(a);
        });
    }

    chips.forEach((chip) => chip.addEventListener('click', () => apply(chip.dataset.cat), { signal }));
    return () => { running.forEach((a) => a.cancel()); };
}
