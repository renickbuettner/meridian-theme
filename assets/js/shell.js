// Meridian shell: drawer, dark-mode toggle, language dropdown, aria-current and prefetch, glued to October's Turbo (page:* events).
import './islands.js';

const root = document.documentElement;
const base = new URL('./', import.meta.url);
const version = new URL(import.meta.url).search;
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

// Drawer: Bootstrap's Drawer is only fetched when the burger is actually visible (below 992px or in off-canvas mode).
let drawerModule;
const loadDrawer = () => (drawerModule ??= import(new URL(`vendor/bootstrap/drawer.js${version}`, base).href));
const burgerVisible = () => $$('[data-mr-drawer-toggle]').some((el) => el.getClientRects().length > 0);
const syncDrawer = () => { if (burgerVisible()) loadDrawer(); };
matchMedia('(max-width: 991.98px)').addEventListener('change', syncDrawer);
// Own trigger instead of Bootstrap's data-bs-toggle: the plugin loads its Bootstrap 5 bundle (24 KB gzip) whenever the DOM carries one.
document.addEventListener('click', async (event) => {
    const toggle = event.target.closest?.('[data-mr-drawer-toggle]');
    const close = event.target.closest?.('[data-mr-drawer-close]');
    if (!toggle && !close) return;
    const dialog = $('#mr-sidebar');
    const { default: Drawer } = await loadDrawer();
    const drawer = Drawer.getOrCreateInstance(dialog);
    if (close) { drawer.hide(); return; }
    // Bootstrap ignores Esc while the slide runs, and focus now moves in at once: hide as soon as the slide ended.
    if (!dialog.dataset.mrEsc) {
        dialog.dataset.mrEsc = '1';
        dialog.addEventListener('cancel', () => { if (dialog.open) dialog.addEventListener('shown.bs.drawer', () => drawer.hide(), { once: true }); });
    }
    dialog.addEventListener('hidden.bs.drawer', () => toggle.getClientRects().length && toggle.focus({ preventScroll: true }), { once: true });
    drawer.toggle(toggle);
    if (dialog.open) focusDrawerSoon(dialog);
});

// showModal() would focus the first link (the logo); the close button is the quiet entry point. The sidebar CSS makes [open] visible at once,
// so the focus call lands in every browser; shown.bs.drawer repeats it for the case that the frame still held the drawer hidden.
const focusDrawer = (dialog) => {
    const close = $('[data-mr-drawer-close]', dialog);
    const active = document.activeElement;
    if (close && (!dialog.contains(active) || active === dialog || active.matches('.mr-brand'))) close.focus({ preventScroll: true });
};
// Retried per frame: a browser that still holds the freshly opened dialog hidden for a frame refuses the first call.
const focusDrawerSoon = (dialog, frames = 30) => {
    focusDrawer(dialog);
    const stray = !dialog.contains(document.activeElement) || document.activeElement === dialog;
    if (frames > 0 && dialog.open && stray) requestAnimationFrame(() => focusDrawerSoon(dialog, frames - 1));
};
document.addEventListener('shown.bs.drawer', (event) => focusDrawer(event.target));

// Turbo would treat the skip link as a same-page visit and leave focus on the link.
document.addEventListener('click', (event) => {
    if (!event.target.closest?.('.mr-skip')) return;
    event.preventDefault();
    const main = $('#main');
    main?.focus();
    main?.scrollIntoView();
});

const closeDrawer = async () => {
    const dialog = $('#mr-sidebar');
    if (!dialog || dialog.tagName !== 'DIALOG' || !dialog.open) return;
    const { default: Drawer } = await loadDrawer();
    // Instant, so Bootstrap's focus return to the burger finishes before the visit ends and focus moves to the content.
    dialog.classList.add('drawer-instant');
    dialog.addEventListener('hidden.bs.drawer', () => dialog.classList.remove('drawer-instant'), { once: true });
    Drawer.getInstance(dialog)?.hide();
};

// Dark mode: an explicit choice is stored; "system" stays attribute-free so color-scheme follows the OS.
const dark = matchMedia('(prefers-color-scheme: dark)');
const effectiveMode = () => root.getAttribute('data-bs-theme') || (dark.matches ? 'dark' : 'light');
function syncModeToggle() {
    $$('[data-mr-mode-toggle]').forEach((button) => {
        button.hidden = false;
    });
}
document.addEventListener('click', (event) => {
    if (!event.target.closest?.('[data-mr-mode-toggle]')) return;
    const next = effectiveMode() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-bs-theme', next);
    try { localStorage.setItem('mr-mode', next); } catch (error) { /* private mode: the choice lasts for this page only */ }
    syncModeToggle();
});
dark.addEventListener('change', syncModeToggle);

// Language dropdown: <details> gets Escape, outside click and close-on-navigate.
const closeLang = (returnFocus = false) => {
    const open = $('[data-mr-lang][open]');
    if (!open) return;
    open.removeAttribute('open');
    if (returnFocus) $('summary', open)?.focus();
};
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeLang(true); });
document.addEventListener('click', (event) => { if (!event.target.closest?.('[data-mr-lang]')) closeLang(); });
document.addEventListener('focusin', (event) => { if (!event.target.closest?.('[data-mr-lang]')) closeLang(); });

// Permanent sidebar: its nav marks and language links follow the current page.
function syncSidebar() {
    const here = location.pathname.replace(/\/$/, '') || '/';
    $$('.mr-nav a').forEach((a) => {
        const path = new URL(a.href, location.href).pathname.replace(/\/$/, '') || '/';
        if (path === here) a.setAttribute('aria-current', 'page');
        else if (!a.hasAttribute('data-mr-home') && path !== '/' && here.startsWith(path + '/')) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
    });
    const alternates = Object.fromEntries($$('link[rel="alternate"][hreflang]').map((l) => [l.hreflang, l.href]));
    $$('[data-mr-lang-link]').forEach((a) => {
        a.href = alternates[a.dataset.mrLangLink] || a.dataset.mrHome || a.href;
    });
}

// After a Turbo visit: close overlays, tell assistive tech, and move focus to the content unless the visitor is still in the sidebar nav.
let announcer;
let visiting = false;
function afterVisit() {
    closeLang();
    syncSidebar();
    announcer ??= Object.assign(document.createElement('div'), { className: 'visually-hidden', role: 'status' });
    if (!announcer.isConnected) $('#mr-aside')?.append(announcer);
    announcer.textContent = document.title;
    const main = $('#main');
    if (visiting && main && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
    visiting = false;
}
// page:load fires before the view transition swaps the body, page:render after; it also never fires for the first document.
document.addEventListener('page:visit', () => { visiting = true; });
// Turbo appends the next page's new stylesheets (block modules) and swaps the body at once: hold the swap until they loaded, or the blocks flash unstyled.
document.addEventListener('page:before-render', (event) => {
    const pending = $$('head link[rel="stylesheet"]').filter((link) => !link.sheet);
    if (!pending.length || typeof event.detail?.resume !== 'function') return;
    event.preventDefault();
    const done = Promise.all(pending.map((link) => new Promise((resolve) => {
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });
    })));
    Promise.race([done, new Promise((resolve) => setTimeout(resolve, 3000))]).then(() => event.detail.resume());
});
document.addEventListener('page:before-visit', closeDrawer);
document.addEventListener('page:render', afterVisit);

// Prefetch: Turbo has none and October answers with Cache-Control: no-cache, so the HTTP cache cannot help. A prefetched page is kept
// for 30 s and handed to Turbo's own fetch (recognised by its X-PJAX header) exactly once.
const warm = new Map();
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
    const hit = typeof input === 'string' && init?.headers?.['X-PJAX'] && !init.body ? warm.get(input) : null;
    if (!hit) return nativeFetch(input, init);
    warm.delete(input);
    if (Date.now() - hit.at > 30_000) return nativeFetch(input, init);
    return hit.response.then((response) => response.clone(), () => nativeFetch(input, init));
};
function prefetch(link) {
    if ($('meta[name="mr-prefetch"]')?.content !== 'hover') return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.href === location.href || warm.has(url.href) || link.closest('[data-turbo="false"]') || link.hasAttribute('download') || link.target) return;
    const headers = { Accept: 'text/html, application/xhtml+xml', 'X-PJAX': 1, 'X-PJAX-REFERRER': location.href };
    warm.set(url.href, { at: Date.now(), response: nativeFetch(url.href, { method: 'GET', headers, priority: 'low' }) });
    warm.get(url.href).response.catch(() => warm.delete(url.href));
}
let hoverTimer;
document.addEventListener('pointerover', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.pointerType === 'touch') return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => prefetch(link), 80);
}, { passive: true });
document.addEventListener('pointerout', () => clearTimeout(hoverTimer), { passive: true });
document.addEventListener('touchstart', (event) => {
    const link = event.target.closest?.('a[href]');
    if (link) prefetch(link);
}, { passive: true });

function ready() {
    syncDrawer();
    syncModeToggle();
    syncSidebar();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
else ready();
