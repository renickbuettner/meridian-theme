// Docs layout: builds "on this page" from the article headings and marks the one being read (scrollspy).
const slug = (text) => text.trim().toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';

export default function init(el, { signal }) {
    const article = el.querySelector('.mr-docs__article');
    const heads = [...article.querySelectorAll('h2, h3')].filter((h) => !h.closest('.mr-docs__toc'));
    const lists = [...el.querySelectorAll('[data-toc-list]')];
    const menu = el.querySelector('[data-docs-menu]');
    const wide = matchMedia('(min-width: 1280px)');

    // Browsers without ::details-content cannot show a closed <details> docked; open it while docked.
    const syncMenu = () => { if (menu && wide.matches) menu.open = true; };
    syncMenu();
    wide.addEventListener('change', syncMenu, { signal });

    if (!lists.length || heads.length < 2) return;

    const used = new Set();
    const links = [];
    for (const h of heads) {
        let id = h.id || slug(h.textContent);
        for (let n = 2; used.has(id); n++) id = `${slug(h.textContent)}-${n}`;
        used.add(id);
        h.id = id;
    }
    for (const list of lists) {
        const own = [];
        for (const h of heads) {
            const li = document.createElement('li');
            if (h.tagName === 'H3') li.className = 'is-sub';
            const a = document.createElement('a');
            a.href = `#${h.id}`;
            a.textContent = h.textContent;
            li.append(a);
            list.append(li);
            own.push(a);
        }
        links.push(own);
    }

    const mark = (index) => {
        for (const own of links) own.forEach((a, i) => (i === index ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
    };
    // The heading that crossed the upper third of the viewport last is the one being read.
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
        for (const e of entries) seen.set(e.target, e.isIntersecting || e.boundingClientRect.top < 0);
        const active = heads.findLastIndex((h) => seen.get(h));
        mark(active);
    }, { rootMargin: '0px 0px -66% 0px' });
    heads.forEach((h) => io.observe(h));

    return () => io.disconnect();
}
