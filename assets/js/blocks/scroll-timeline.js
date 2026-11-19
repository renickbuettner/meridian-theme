// Fills each item's connecting segment as its dot passes a trigger line in the viewport. Scroll-linked, so no easing and nothing to turn off for reduced motion.
const TRIGGER = 0.6;

export default function init(el, { signal }) {
    const items = [...el.querySelectorAll('.mr-tl__item')];
    const dot = el.querySelector('.mr-tl__dot');
    if (!items.length || !dot) return;
    const half = dot.offsetHeight / 2;
    let frame = 0;
    let near = false;

    const update = () => {
        frame = 0;
        // At the very end of the page the trigger line can be unreachable for the last items.
        const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
        const line = atEnd ? Infinity : innerHeight * TRIGGER;
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            const reach = line - (rect.top + half);
            const span = rect.height - half;
            item.classList.toggle('is-reached', reach >= 0);
            item.style.setProperty('--mr-tl-fill', Math.min(1, Math.max(0, span > 0 ? reach / span : 0)).toFixed(3));
        }
    };
    const request = () => { if (near && !frame) frame = requestAnimationFrame(update); };

    const io = new IntersectionObserver(([entry]) => {
        near = entry.isIntersecting;
        request();
    }, { rootMargin: '100px 0px' });
    io.observe(el);

    addEventListener('scroll', request, { passive: true, signal });
    addEventListener('resize', request, { passive: true, signal });
    update();

    return () => {
        io.disconnect();
        cancelAnimationFrame(frame);
    };
}
