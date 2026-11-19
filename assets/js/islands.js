// Island loader. Any element with data-island="<handle>" gets assets/dist/js/blocks/<handle>.js imported once it is needed.
// A block module exports default init(el, ctx) and may return a destroy function (or {destroy}); ctx.signal aborts on cleanup.
// data-island-load="visible" (default) | "idle" | "eager". Runs again after every Turbo visit and cleans up before the page is swapped.
const base = new URL('./', import.meta.url);
const version = new URL(import.meta.url).search;
const HANDLE = /^[a-z0-9-]+$/;
const live = new Set();
const started = new WeakSet();
let observer;

async function start(el) {
    if (started.has(el) || el.hasAttribute('data-island-ready') || el.hasAttribute('data-island-error')) return;
    started.add(el);
    const handle = el.getAttribute('data-island') || '';
    if (!HANDLE.test(handle)) return;
    const controller = new AbortController();
    const entry = { el, controller, destroy: null };
    live.add(entry);
    try {
        const mod = await import(new URL(`blocks/${handle}.js${version}`, base).href);
        const result = await (mod.init ?? mod.default)(el, { signal: controller.signal });
        entry.destroy = typeof result === 'function' ? result : result?.destroy ?? null;
        el.setAttribute('data-island-ready', '');
    } catch (error) {
        live.delete(entry);
        el.setAttribute('data-island-error', '');
        console.error(`[meridian] island "${handle}" failed`, error);
    }
}

function schedule(el) {
    const when = el.getAttribute('data-island-load') || 'visible';
    if (when === 'eager') return start(el);
    // WebKit has no requestIdleCallback, so an element with that id would stand in for it
    if (when === 'idle') return (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback : setTimeout)(() => start(el));
    if (!('IntersectionObserver' in window)) return start(el);
    observer ??= new IntersectionObserver((records) => {
        for (const r of records) {
            if (!r.isIntersecting) continue;
            observer.unobserve(r.target);
            start(r.target);
        }
    }, { rootMargin: '200px 0px' });
    observer.observe(el);
}

export function scan(scope = document) {
    scope.querySelectorAll('[data-island]:not([data-island-ready]):not([data-island-error])').forEach(schedule);
}

export function cleanup() {
    observer?.disconnect();
    observer = undefined;
    for (const entry of live) {
        entry.controller.abort();
        try { entry.destroy?.(); } catch (error) { console.error('[meridian] island destroy failed', error); }
        entry.el.removeAttribute('data-island-ready');
    }
    live.clear();
}

document.addEventListener('page:unload', cleanup);
document.addEventListener('page:render', () => scan());
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan(), { once: true });
else scan();
