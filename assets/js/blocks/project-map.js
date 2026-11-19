// project-map island: fetches the world geometry, fits the view to the canvas, filters pins by category, shows the chosen project in a live detail card.
// Pins are rendered by the server as buttons; the static list items are the single source of the card content.
const WORLD = new URL('../../../map/world.svg', import.meta.url);
let world;

function loadWorld(signal) {
    world ??= fetch(WORLD, { signal }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`world.svg ${r.status}`))));
    return world;
}

const WORLD_W = 1000;
const WORLD_H = 394;
const PAD = 56;
const PAD_NARROW = 28;
const MIN_SCALE = 1 / 1.2;
const MIN_VIEW_W = 130;
const SPARSE_VIEW_W = 170;
const CONTROLS_W = 56;
const MIN_GAP = 24;
const NARROW = 600;
const MAX_ZOOM = 8;
const LABEL_GAP = 6;

export default async function init(el, { signal }) {
    const pins = [...el.querySelectorAll('.mr-map__pin')];
    const chips = [...el.querySelectorAll('.mr-map__filters .mr-chip')];
    const card = el.querySelector('[data-card]');
    const count = el.querySelector('[data-count]');
    const canvas = el.querySelector('.mr-map__canvas');
    const svg = el.querySelector('.mr-map__svg');
    const sparse = el.classList.contains('mr-map--sparse');
    const group = el.querySelector('.mr-map__pins');
    const visible = () => pins.filter((p) => !p.hidden);
    let current = null;
    let zoom = 1;
    let zoomSet = false;
    let center = null;
    let last = null;

    loadWorld(signal).then((text) => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const g = el.querySelector('[data-world]');
        for (const node of doc.documentElement.children) g.append(document.importNode(node, true));
    }).catch((error) => { if (error.name !== 'AbortError') console.error('[meridian] project-map geometry failed', error); });

    function roving(pin) {
        for (const p of pins) p.tabIndex = p === pin ? 0 : -1;
    }

    // World-wide pin sets show the whole world; a tight set zooms to its bounds, never closer than MIN_VIEW_W units.
    function layout() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        // Without pins Math.max() is -Infinity and the viewBox NaN: frame the whole world instead.
        const xs = pins.length ? pins.map((p) => +p.dataset.x) : [0, WORLD_W];
        const ys = pins.length ? pins.map((p) => +p.dataset.y) : [0, WORLD_H];
        const spanX = Math.max(...xs) - Math.min(...xs) || 1;
        const spanY = Math.max(...ys) - Math.min(...ys) || 1;
        if (!zoomSet) zoom = 1;
        const narrow = w < NARROW;
        const pad = narrow ? PAD_NARROW : PAD;
        const strip = narrow ? 0 : CONTROLS_W;
        // The default view frames every pin inside the padding and clear of the zoom column; a little ocean beyond the world edge is fine.
        const framed = Math.min(w / (sparse ? SPARSE_VIEW_W : MIN_VIEW_W), (w - 2 * pad - strip) / spanX, (h - 2 * pad) / spanY);
        const fit = Math.max(w * MIN_SCALE / WORLD_W, framed);
        const scale = Math.max(w * MIN_SCALE / WORLD_W, fit * zoom);
        const vw = w / scale;
        const vh = h / scale;
        const cx = center ? center.x : (Math.max(...xs) + Math.min(...xs)) / 2 + strip / 2 / scale;
        const cy = center ? center.y : (Math.max(...ys) + Math.min(...ys)) / 2;
        // A view wider than the world may slide inside the surplus, so the zoom column keeps its reserved strip.
        const place = (c, v, max) => (v >= max ? Math.min(0, Math.max(max - v, c - v / 2)) : Math.min(max - v, Math.max(0, c - v / 2)));
        const vx = place(cx, vw, WORLD_W);
        const vy = vh >= WORLD_H ? (WORLD_H - vh) / 2 : place(cy, vh, WORLD_H);
        last = { vx, vy, vw, vh, scale, fit };
        svg.setAttribute('viewBox', `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);

        const shown = visible();
        const at = shown.map((p) => ({ p, x: (+p.dataset.x - vx) * scale, y: (+p.dataset.y - vy) * scale }));
        // Pins closer than MIN_GAP are pushed apart so every dot stays distinct and tappable.
        for (let pass = 0; pass < 40; pass++) {
            let moved = false;
            for (let i = 0; i < at.length; i++) {
                for (let j = i + 1; j < at.length; j++) {
                    let dx = at[j].x - at[i].x;
                    let dy = at[j].y - at[i].y;
                    let d = Math.hypot(dx, dy);
                    if (d >= MIN_GAP) continue;
                    if (d < 0.01) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1; }
                    const push = (MIN_GAP - d) / 2 + 0.1;
                    at[i].x -= (dx / d) * push; at[i].y -= (dy / d) * push;
                    at[j].x += (dx / d) * push; at[j].y += (dy / d) * push;
                    moved = true;
                }
            }
            if (!moved) break;
        }
        // A pin closer to the frame than MIN_GAP is hidden (still focusable, focus pulls it into view) rather than cut off by the edge.
        let off = 0;
        for (const a of at) {
            const out = a.x < MIN_GAP || a.x > w - MIN_GAP || a.y < MIN_GAP || a.y > h - MIN_GAP;
            a.p.classList.toggle('is-off', out);
            if (out) off++;
            a.p.style.left = `${((a.x / w) * 100).toFixed(2)}%`;
            a.p.style.top = `${((a.y / h) * 100).toFixed(2)}%`;
        }

        // Only the selected or hovered pin shows a label (CSS); one that would touch another dot, the zoom buttons or the frame flips, moves above or below, then drops.
        for (const p of pins) p.classList.remove('is-flip', 'is-above', 'is-below', 'is-nolabel');
        const cr = canvas.getBoundingClientRect();
        const cb = controls.getBoundingClientRect();
        const zr = { left: cb.left - MIN_GAP / 2, right: cb.right + MIN_GAP / 2, top: cb.top - MIN_GAP / 2, bottom: cb.bottom + MIN_GAP / 2 };
        const hit = (r, o, g) => r.left < o.right + g && o.left < r.right + g && r.top < o.bottom + g && o.top < r.bottom + g;
        const dots = shown.filter((p) => !p.classList.contains('is-off')).map((p) => ({ p, r: p.querySelector('.mr-map__dot').getBoundingClientRect() }));
        const free = (r, own) => r.left >= cr.left && r.right <= cr.right && r.top >= cr.top && r.bottom <= cr.bottom && !hit(r, zr, 0) && !dots.some((d) => d.p !== own && hit(r, d.r, 2));
        for (const d of dots) {
            const label = d.p.querySelector('.mr-map__label');
            if (free(label.getBoundingClientRect(), d.p)) continue;
            const spot = ['is-flip', 'is-above', 'is-below'].find((c) => {
                d.p.classList.remove('is-flip', 'is-above', 'is-below');
                d.p.classList.add(c);
                return free(label.getBoundingClientRect(), d.p);
            });
            if (spot) continue;
            d.p.classList.remove('is-flip', 'is-above', 'is-below');
            d.p.classList.add('is-nolabel');
        }
        zoomHint.textContent = off ? (el.dataset.tOff || '').replace(':count', off) : (el.dataset.tDrag || '');
        el.classList.add('is-fit');
    }

    function setZoom(next) {
        if (!last) return;
        center ??= { x: last.vx + last.vw / 2, y: last.vy + last.vh / 2 };
        zoom = Math.min(MAX_ZOOM, Math.max(1, next));
        zoomSet = true;
        layout();
    }

    function ui(key, sign) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mr-map__zoom-btn';
        b.setAttribute('aria-label', el.dataset[key] || '');
        b.innerHTML = sign;
        return b;
    }
    const controls = document.createElement('div');
    controls.className = 'mr-map__zoom';
    const zin = ui('tZoomIn', '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/></svg>');
    const zout = ui('tZoomOut', '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/></svg>');
    const zreset = ui('tZoomReset', '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 8a5.5 5.5 0 1 0 1.8-4.1M2.5 2.5v3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>');
    const zoomHint = document.createElement('p');
    zoomHint.className = 'mr-map__zoom-hint';
    controls.append(zoomHint, zin, zout, zreset);
    canvas.parentElement.append(controls);
    zin.addEventListener('click', () => setZoom(zoom * 1.6), { signal });
    zout.addEventListener('click', () => setZoom(zoom / 1.6), { signal });
    zreset.addEventListener('click', () => { zoomSet = false; center = null; layout(); }, { signal });

    // Drag pans once the pointer moved a few px, so a plain tap on a pin still selects it.
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('.mr-map__pin')) return;
        if (!last) return;
        center ??= { x: last.vx + last.vw / 2, y: last.vy + last.vh / 2 };
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: center.x, cy: center.y, moved: false };
    }, { signal });
    canvas.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id || !last) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        if (!drag.moved) { drag.moved = true; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-panning'); }
        center = { x: drag.cx - dx / last.scale, y: drag.cy - dy / last.scale };
        zoomSet = true;
        layout();
    }, { signal });
    const endDrag = () => { drag = null; canvas.classList.remove('is-panning'); };
    canvas.addEventListener('pointerup', endDrag, { signal });
    canvas.addEventListener('pointercancel', endDrag, { signal });
    canvas.addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        setZoom(zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
    }, { signal, passive: false });

    // Bring a pin that is off screen (keyboard focus, selection) back into the view.
    function reveal(pin) {
        if (!last) return;
        const px = (+pin.dataset.x - last.vx) * last.scale;
        const py = (+pin.dataset.y - last.vy) * last.scale;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const m = MIN_GAP * 2;
        if (px >= m && px <= w - m && py >= m && py <= h - m) return;
        center = { x: +pin.dataset.x, y: +pin.dataset.y };
        zoomSet = true;
        layout();
    }
    group.addEventListener('focusin', (e) => { const pin = e.target.closest('.mr-map__pin'); if (pin) reveal(pin); }, { signal });

    function select(pin, { focus = false } = {}) {
        current = pin;
        for (const p of pins) p.setAttribute('aria-pressed', String(p === pin));
        card.replaceChildren();
        if (pin) {
            const item = el.querySelector(`#${CSS.escape(pin.dataset.for)} > article`);
            if (item) card.append(item.cloneNode(true));
            roving(pin);
            reveal(pin);
            if (focus) pin.focus({ preventScroll: true });
        } else if (!sparse) {
            const hint = document.createElement('p');
            hint.className = 'mr-map__hint';
            hint.textContent = el.dataset.tHint || '';
            card.append(hint);
        }
        if (!pin) roving(visible()[0] ?? null);
    }

    function filter(key, announce) {
        for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.cat === key));
        for (const p of pins) p.hidden = key !== 'all' && p.dataset.cat !== key;
        const shown = visible();
        if (announce) count.textContent = (el.dataset.tCount || '').replace(':shown', shown.length).replace(':total', pins.length);
        if (current && !current.hidden) roving(current);
        else select(announce || sparse ? null : shown[0] ?? null);
        layout();
    }

    // Nearest visible pin in the arrow's direction; off-axis distance counts double so rows and columns feel natural.
    function neighbour(from, dx, dy) {
        const a = from.getBoundingClientRect();
        let best = null;
        let bestScore = Infinity;
        for (const p of visible()) {
            if (p === from) continue;
            const b = p.getBoundingClientRect();
            const mx = b.x - a.x;
            const my = b.y - a.y;
            const along = mx * dx + my * dy;
            if (along <= 0) continue;
            const score = along + 2 * Math.abs(mx * dy - my * dx);
            if (score < bestScore) { best = p; bestScore = score; }
        }
        return best;
    }

    const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    group.addEventListener('click', (e) => {
        const pin = e.target.closest('.mr-map__pin');
        if (pin) select(pin);
    }, { signal });
    group.addEventListener('keydown', (e) => {
        const pin = e.target.closest('.mr-map__pin');
        if (!pin) return;
        let next = null;
        if (dirs[e.key]) next = neighbour(pin, ...dirs[e.key]);
        else if (e.key === 'Home') next = visible()[0];
        else if (e.key === 'End') next = visible().at(-1);
        else return;
        e.preventDefault();
        if (!next) return;
        roving(next);
        next.focus();
    }, { signal });

    for (const chip of chips) chip.addEventListener('click', () => filter(chip.dataset.cat, true), { signal });

    filter('all', false);
    const observer = new ResizeObserver(layout);
    observer.observe(canvas);
    signal.addEventListener('abort', () => observer.disconnect());
}
