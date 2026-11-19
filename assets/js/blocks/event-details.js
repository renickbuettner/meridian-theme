// Live countdown for an event block; the server-rendered date stays as the no-JS fallback.
const SECOND = 1000;

export default function init(el, { signal }) {
    const start = Date.parse(el.dataset.start || '');
    if (Number.isNaN(start)) return;
    const end = Date.parse(el.dataset.end || '') || start;
    const live = el.querySelector('.mr-event__count-live');
    const state = el.querySelector('.mr-event__state');
    const units = Object.fromEntries([...el.querySelectorAll('[data-unit]')].map((n) => [n.dataset.unit, n]));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer;
    if (reduced && units.s) units.s.parentElement.hidden = true;

    const tick = () => {
        const left = start - Date.now();
        if (left <= 0) {
            live.hidden = true;
            state.hidden = false;
            state.textContent = Date.now() < end ? el.dataset.msgLive : el.dataset.msgEnded;
            if (Date.now() >= end) return;
        } else {
            const s = Math.floor(left / SECOND);
            units.d.textContent = String(Math.floor(s / 86400));
            units.h.textContent = String(Math.floor(s / 3600) % 24);
            units.m.textContent = String(Math.floor(s / 60) % 60);
            units.s.textContent = String(s % 60);
        }
        // Reduced motion: a ticking number is motion, so the clock moves once a minute.
        timer = setTimeout(tick, reduced ? 60 * SECOND : SECOND);
    };

    tick();
    signal.addEventListener('abort', () => clearTimeout(timer));
}
