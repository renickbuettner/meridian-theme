// Product hotspots: pins are disclosure buttons (one tab stop, arrows move, Enter/Space toggle); one shared live card, Esc or the close button dismisses it.
export default function init(el, { signal }) {
    const stage = el.querySelector('.mr-hs__stage');
    const card = el.querySelector('.mr-hs__card');
    const pins = [...el.querySelectorAll('button.mr-hs__pin')];
    if (!stage || !card || !pins.length) return;
    let active = null;

    const place = () => {
        card.classList.remove('mr-hs__card--below');
        card.style.removeProperty('inset');
        if (!active || getComputedStyle(card).position !== 'absolute') return;
        const box = stage.getBoundingClientRect();
        const frame = stage.querySelector('.mr-hs__frame').getBoundingClientRect();
        const pr = active.getBoundingClientRect();
        const gap = 12;
        const w = card.offsetWidth;
        const h = card.offsetHeight;
        const f = { l: frame.left - box.left + gap / 2, t: frame.top - box.top + gap / 2, r: frame.right - box.left - gap / 2, b: frame.bottom - box.top - gap / 2 };
        const cx = pr.left + pr.width / 2 - box.left;
        const cy = pr.top + pr.height / 2 - box.top;
        const dot = pr.width / 2;
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
        const others = pins.filter((p) => p !== active).map((p) => {
            const r = p.getBoundingClientRect();
            return { l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top };
        });
        // The card grows away from the frame's centre so it leaves the art below (or above) the pin free.
        const lower = cy > (f.t + f.b) / 2;
        const sideTop = clamp(lower ? cy + dot - h : cy - dot, f.t, f.b - h);
        const midLeft = clamp(cx - w / 2, f.l, f.r - w);
        const candidates = [
            [cx + dot + gap, sideTop],
            [cx - dot - gap - w, sideTop],
            [midLeft, cy + dot + gap],
            [midLeft, cy - dot - gap - h],
        ];
        const spot = candidates.find(([l, t]) => l >= f.l && t >= f.t && l + w <= f.r && t + h <= f.b
            && !others.some((o) => l < o.r && l + w > o.l && t < o.b && t + h > o.t));
        if (!spot) return card.classList.add('mr-hs__card--below');
        card.style.inset = `${spot[1]}px auto auto ${spot[0]}px`;
    };

    const close = (returnFocus) => {
        const was = active;
        active = null;
        pins.forEach((p) => p.setAttribute('aria-expanded', 'false'));
        card.hidden = true;
        card.replaceChildren();
        card.style.removeProperty('inset');
        card.classList.remove('mr-hs__card--below');
        if (returnFocus) was?.focus();
    };

    const open = (pin, reveal = true) => {
        const src = el.querySelector(`#${CSS.escape(pin.dataset.for)}`);
        if (!src) return;
        active = pin;
        pins.forEach((p) => {
            p.setAttribute('aria-expanded', String(p === pin));
            p.tabIndex = p === pin ? 0 : -1;
        });
        const body = document.createElement('div');
        body.className = 'mr-hs__card-body';
        for (const node of src.children) body.append(node.cloneNode(true));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mr-hs__close';
        button.setAttribute('aria-label', el.dataset.tClose || 'Close');
        button.innerHTML = '<svg class="mr-icon" aria-hidden="true" focusable="false"><use href="#mr-i-close"/></svg>';
        button.addEventListener('click', () => close(true), { signal });
        card.replaceChildren(body, button);
        card.hidden = false;
        place();
        if (reveal && (getComputedStyle(card).position !== 'absolute' || card.classList.contains('mr-hs__card--below'))) {
            const r = card.getBoundingClientRect();
            if (r.bottom > innerHeight || r.top < 0) card.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
    };

    pins.forEach((pin, i) => {
        pin.addEventListener('click', () => (active === pin ? close(false) : open(pin)), { signal });
        pin.addEventListener('keydown', (event) => {
            const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: pins.length - 1 }[event.key];
            if (to === undefined) return;
            event.preventDefault();
            const next = pins[(to + pins.length) % pins.length];
            pins.forEach((p) => { p.tabIndex = p === next ? 0 : -1; });
            next.focus();
        }, { signal });
    });

    // Start on the first point so the block never reads as a plain picture.
    open(pins[0], false);

    el.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && active) {
            event.stopPropagation();
            close(true);
        }
    }, { signal });
    addEventListener('resize', place, { signal });
    card.querySelector('img')?.addEventListener('load', place, { signal });
}
