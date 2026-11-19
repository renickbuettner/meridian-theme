// Command palette: combobox + listbox over the static per-language JSON index (pages and posts).
// Two mounts share this module: the global modal <dialog> in the permanent sidebar frame (Ctrl/Cmd+K, [data-mr-palette-open]) and the inline block.
const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const LIMIT = 8;
const INLINE_GO = 4;
const indexes = new Map();
let seq = 0;

function loadIndex(url) {
    if (!indexes.has(url)) {
        const promise = fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
            .then((json) => (json.items || []).map((i) => ({ ...i, ft: fold(i.t), fd: fold(i.d || '') })));
        promise.catch(() => indexes.delete(url));
        indexes.set(url, promise);
    }
    return indexes.get(url);
}

function score(item, terms, query) {
    let s = 0;
    for (const term of terms) {
        if (item.ft.startsWith(term)) s += 100;
        else if (item.ft.includes(` ${term}`)) s += 70;
        else if (item.ft.includes(term)) s += 40;
        else if (item.fd.includes(term)) s += 10;
        else return -1;
    }
    return s + (item.ft === query ? 100 : 0) + (item.k === 'page' ? 5 : 0);
}

/** Title with the matched terms wrapped in <mark>; offsets are mapped back because folding can change the length. */
function highlight(text, terms) {
    const map = [];
    let folded = '';
    for (let i = 0; i < text.length; i++) {
        const piece = fold(text[i]);
        for (let j = 0; j < piece.length; j++) map.push(i);
        folded += piece;
    }
    const ranges = [];
    for (const term of terms) {
        const at = folded.indexOf(term);
        if (at >= 0) ranges.push([map[at], map[at + term.length - 1] + 1]);
    }
    ranges.sort((a, b) => a[0] - b[0]);
    const out = document.createDocumentFragment();
    let pos = 0;
    for (const [from, to] of ranges) {
        if (to <= pos) continue;
        const start = Math.max(from, pos);
        if (start > pos) out.append(text.slice(pos, start));
        out.append(Object.assign(document.createElement('mark'), { textContent: text.slice(start, to) }));
        pos = to;
    }
    if (pos < text.length) out.append(text.slice(pos));
    return out;
}

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
    node.append(...children);
    return node;
}
const icon = (name) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'mr-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#mr-i-${name}`);
    svg.append(use);
    return svg;
};

/** Builds the combobox into `root` and returns its controller. `opts.modal` shows the close button and key hints, `opts.scope` limits the kinds. */
function mount(root, { t, indexUrl, searchUrl, modal, scope, onPick, signal }) {
    const uid = `mr-cp-${++seq}`;
    const input = el('input', {
        id: `${uid}-input`, type: 'text', role: 'combobox', class: 'mr-cp__input', 'aria-expanded': 'true', 'aria-controls': `${uid}-list`,
        'aria-autocomplete': 'list', 'aria-label': t.label, placeholder: t.placeholder, autocomplete: 'off', autocapitalize: 'off',
        spellcheck: 'false', enterkeyhint: 'go', inputmode: 'search',
    });
    const list = el('ul', { id: `${uid}-list`, class: 'mr-cp__list', role: 'listbox', tabindex: '-1', 'aria-label': t.list });
    const status = el('p', { class: 'visually-hidden', role: 'status' });
    const close = modal ? el('button', { type: 'button', class: 'mr-icon-btn mr-cp__close', 'aria-label': t.close }, icon('close')) : null;
    const field = el('div', { class: 'mr-cp__field' }, icon('search'), input, ...(close ? [close] : []));
    const hints = modal ? el('p', { class: 'mr-cp__hints', 'aria-hidden': 'true' },
        el('span', {}, el('kbd', {}, '↑'), el('kbd', {}, '↓'), ` ${t.hint_move}`),
        el('span', {}, el('kbd', {}, 'Enter'), ` ${t.hint_open}`),
        el('span', {}, el('kbd', {}, 'Esc'), ` ${t.hint_close}`)) : null;
    root.replaceChildren(field, list, status, ...(hints ? [hints] : []));

    let entries = [];
    let active = -1;
    let items = null;
    let failed = false;

    const navLinks = () => [...document.querySelectorAll('#mr-sidebar .mr-nav a')].map((a) => ({ t: a.textContent.trim(), u: a.href, k: 'page', d: '' })).filter((i) => i.t);

    function setActive(i, scroll = true) {
        active = i;
        [...list.querySelectorAll('[role="option"]')].forEach((node, n) => node.setAttribute('aria-selected', String(n === i)));
        const node = list.querySelectorAll('[role="option"]')[i];
        if (node) {
            input.setAttribute('aria-activedescendant', node.id);
            if (scroll) node.scrollIntoView({ block: 'nearest' });
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    }

    function row(item, terms) {
        const link = el('span', { 'data-href': item.u, class: 'mr-cp__link' });
        const title = el('span', { class: 'mr-cp__title' });
        title.append(terms.length ? highlight(item.t, terms) : item.t);
        const text = el('span', { class: 'mr-cp__text' }, title);
        if (item.d && terms.length) text.append(el('span', { class: 'mr-cp__desc' }, item.d));
        link.append(text, el('span', { class: 'mr-cp__kind' }, item.k === 'all' ? '' : t[item.k] || ''));
        return el('li', { role: 'option', id: `${uid}-o${list.children.length}`, 'aria-selected': 'false', class: 'mr-cp__option' }, link);
    }

    function render() {
        const query = fold(input.value.trim());
        const terms = query.split(/\s+/).filter(Boolean);
        const pool = (items || []).filter((i) => !scope || scope === 'all' || i.k === scope);
        const nodes = [];
        let count = 0;
        entries = [];
        list.replaceChildren();
        const push = (item, tms) => { const node = row(item, tms); list.append(node); entries.push(item); nodes.push(node); };
        const label = (text) => list.append(el('li', { role: 'presentation', class: 'mr-cp__label' }, text));

        if (!terms.length) {
            const go = (scope === 'post' ? [] : navLinks()).slice(0, modal ? LIMIT : INLINE_GO);
            if (go.length) label(t.go);
            go.forEach((i) => push(i, []));
            const latest = pool.filter((i) => i.k === 'post').slice(0, 3);
            if (latest.length) label(t.latest);
            latest.forEach((i) => push(i, []));
            count = entries.length;
            status.textContent = '';
        } else {
            const hits = pool.map((i) => [score(i, terms, query), i]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).slice(0, LIMIT);
            hits.forEach(([, i]) => push(i, terms));
            count = hits.length;
            if (!count) list.append(el('li', { role: 'presentation', class: 'mr-cp__empty' }, failed ? t.error : items ? t.none : t.loading));
            status.textContent = count ? t.results.replace(':count', String(count)) : failed ? t.error : items ? t.none : '';
        }
        if (searchUrl && input.value.trim().length >= 2) {
            push({ t: t.all.replace(':query', input.value.trim()), u: `${searchUrl}${searchUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(input.value.trim())}`, k: 'all', d: '' }, []);
        }
        setActive(entries.length ? 0 : -1, false);
        list.hidden = !list.children.length;
        input.setAttribute('aria-expanded', String(!list.hidden));
    }

    function ensureIndex() {
        if (items || !indexUrl) return;
        loadIndex(indexUrl).then((data) => { items = data; failed = false; render(); }, () => { failed = true; render(); });
    }

    function pick(i, event) {
        const href = list.querySelectorAll('[role="option"] .mr-cp__link')[i]?.dataset.href;
        if (!href) return;
        if (event && (event.ctrlKey || event.metaKey || event.shiftKey)) { window.open(href, '_blank', 'noopener'); return; }
        onPick?.();
        // A real anchor click keeps Turbo navigation; options hold no interactive child, so axe's nested-interactive stays clean.
        const a = el('a', { href, hidden: true });
        document.body.append(a);
        a.click();
        a.remove();
    }

    input.addEventListener('input', render, { signal });
    input.addEventListener('focus', ensureIndex, { signal });
    input.addEventListener('keydown', (event) => {
        const n = entries.length;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (list.hidden) { render(); return; }
            if (n) setActive((active + (event.key === 'ArrowDown' ? 1 : -1) + n) % n);
        } else if (event.key === 'Enter' && active >= 0) {
            event.preventDefault();
            pick(active, event);
        } else if (event.key === 'Escape' && !modal) {
            if (input.value) { input.value = ''; render(); event.stopPropagation(); }
            else { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
        }
    }, { signal });
    list.addEventListener('pointermove', (event) => {
        const option = event.target.closest('[role="option"]');
        const i = option ? [...list.querySelectorAll('[role="option"]')].indexOf(option) : -1;
        if (i >= 0 && i !== active) setActive(i, false);
    }, { signal });
    list.addEventListener('click', (event) => {
        const option = event.target.closest('[role="option"]');
        if (option) pick([...list.querySelectorAll('[role="option"]')].indexOf(option), event);
    }, { signal });
    // The input keeps focus while the pointer works the list.
    list.addEventListener('pointerdown', (event) => { if (event.target.closest('[role="option"]')) event.preventDefault(); }, { signal });
    // The inline block keeps its suggestions visible so the section never shows a bare field.
    if (!modal) { render(); ensureIndex(); }

    return { input, close, reset() { input.value = ''; render(); ensureIndex(); }, ensureIndex };
}

let globalReady = false;

/** Global palette: lives in the permanent sidebar frame, so it is set up once per document and never torn down by Turbo cleanup. */
function initGlobal(host) {
    if (globalReady) return;
    globalReady = true;
    const t = JSON.parse(host.dataset.t);
    const dialog = el('dialog', { class: 'mr-palette', 'aria-label': t.label });
    const panel = el('div', { class: 'mr-cp mr-cp--modal' });
    dialog.append(panel);
    host.append(dialog);

    const palette = mount(panel, { t, indexUrl: host.dataset.index, searchUrl: host.dataset.searchUrl, modal: true, onPick: () => dialog.close() });
    palette.close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

    const open = () => {
        if (dialog.open) return;
        dialog.showModal();
        palette.reset();
        palette.input.focus();
    };
    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
        event.preventDefault();
        if (dialog.open) dialog.close(); else open();
    });
    document.addEventListener('click', (event) => {
        const trigger = event.target.closest?.('[data-mr-palette-open]');
        if (!trigger || event.ctrlKey || event.metaKey || event.shiftKey || event.button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        open();
    }, true);
    const warm = (event) => { if (event.target.closest?.('[data-mr-palette-open]')) palette.ensureIndex(); };
    document.addEventListener('pointerover', warm, { passive: true });
    document.addEventListener('focusin', warm);
    document.addEventListener('page:unload', () => { if (dialog.open) dialog.close(); });

    const apple = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    document.querySelectorAll('[data-mr-palette-key]').forEach((node) => { node.textContent = apple ? '⌘K' : 'Ctrl K'; node.hidden = false; });
}

export default function init(host, { signal }) {
    if (host.hasAttribute('data-mr-palette-host')) {
        initGlobal(host);
        return;
    }
    const mountPoint = host.querySelector('[data-palette-mount]');
    const t = JSON.parse(host.dataset.t);
    mount(mountPoint, { t, indexUrl: host.dataset.index, searchUrl: host.dataset.searchUrl, modal: false, scope: host.dataset.scope, signal });
}
