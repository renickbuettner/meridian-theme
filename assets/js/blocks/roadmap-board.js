// roadmap-board island: topic filter chips. The server renders every card; filtering only toggles `hidden`.
export default function init(el, { signal }) {
    const scroller = el.querySelector('.mr-rb__scroller');
    const hint = el.querySelector('.mr-rb__hint');
    if (scroller && hint) {
        const sync = () => {
            const room = scroller.scrollWidth - scroller.clientWidth;
            hint.hidden = room <= 1;
            scroller.toggleAttribute('data-more', room > 1 && Math.abs(scroller.scrollLeft) < room - 1);
        };
        sync();
        scroller.addEventListener('scroll', sync, { passive: true, signal });
        const ro = new ResizeObserver(sync);
        ro.observe(scroller);
        signal.addEventListener('abort', () => ro.disconnect());
    }
    const chips = [...el.querySelectorAll('.mr-rb__filters .mr-chip')];
    if (!chips.length) return;
    const cards = [...el.querySelectorAll('.mr-rb__card')];
    const cols = [...el.querySelectorAll('.mr-rb__col')];
    const count = el.querySelector('[data-count]');

    function filter(key, announce) {
        for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.topic === key));
        for (const card of cards) card.hidden = key !== 'all' && card.dataset.topic !== key;
        for (const col of cols) {
            const n = col.querySelectorAll('.mr-rb__card:not([hidden])').length;
            col.querySelector('[data-n]').textContent = n;
            col.querySelector('.mr-rb__empty').hidden = n > 0;
        }
        const shown = cards.filter((c) => !c.hidden).length;
        if (announce) count.textContent = (el.dataset.tCount || '').replace(':shown', shown).replace(':total', cards.length);
    }

    for (const chip of chips) chip.addEventListener('click', () => filter(chip.dataset.topic, true), { signal });
    filter('all', false);
}
