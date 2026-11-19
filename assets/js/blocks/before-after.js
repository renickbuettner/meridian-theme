// Before/after slider: pointer drag (mouse, touch, pen), click-to-jump and the APG slider keys on the handle.
const clamp = (n) => Math.min(100, Math.max(0, n));

export default function init(el, { signal }) {
    const stage = el.querySelector('.mr-ba__stage');
    const handle = el.querySelector('.mr-ba__handle');
    if (!stage || !handle) return;
    const rtl = () => getComputedStyle(stage).direction === 'rtl';
    const template = handle.dataset.text || '';
    let pos = Number(el.dataset.start) || 50;

    const set = (value) => {
        pos = clamp(Math.round(value));
        el.style.setProperty('--mr-ba-pos', `${pos}%`);
        handle.setAttribute('aria-valuenow', String(pos));
        if (template) handle.setAttribute('aria-valuetext', template.replace(':percent', String(pos)));
    };
    const fromPointer = (event) => {
        const box = stage.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        set((rtl() ? 1 - x : x) * 100);
    };

    stage.addEventListener('pointerdown', (event) => {
        if (event.button > 0) return;
        stage.setPointerCapture(event.pointerId);
        stage.toggleAttribute('data-dragging', true);
        fromPointer(event);
        handle.focus({ preventScroll: true });
        if (event.pointerType === 'mouse') event.preventDefault();
    }, { signal });
    stage.addEventListener('pointermove', (event) => {
        if (stage.hasPointerCapture(event.pointerId)) fromPointer(event);
    }, { signal });
    const end = (event) => {
        stage.toggleAttribute('data-dragging', false);
        if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    };
    stage.addEventListener('pointerup', end, { signal });
    stage.addEventListener('pointercancel', end, { signal });

    handle.addEventListener('keydown', (event) => {
        // Arrow keys follow what is on screen, so they flip in right-to-left text.
        const dir = rtl() ? -1 : 1;
        const step = event.shiftKey ? 10 : 2;
        const next = {
            ArrowRight: pos + dir * step,
            ArrowLeft: pos - dir * step,
            ArrowUp: pos + step,
            ArrowDown: pos - step,
            PageUp: pos + 10,
            PageDown: pos - 10,
            Home: 0,
            End: 100,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        set(next);
    }, { signal });
}
