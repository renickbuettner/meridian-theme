// Tabs pattern (WAI-ARIA APG, automatic activation): roving tabindex, arrow/Home/End keys, deep link by panel id.
export default function init(el, { signal }) {
    const tabs = [...el.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((tab) => el.querySelector(`[id="${CSS.escape(tab.getAttribute('aria-controls'))}"]`));
    if (!tabs.length || panels.some((p) => !p)) throw new Error('feature-tabs: tab without panel');
    const rtl = () => getComputedStyle(el).direction === 'rtl';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    panels.forEach((panel, i) => {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tabs[i].id);
        panel.tabIndex = 0;
    });

    function select(index, { focus = false, hash = false } = {}) {
        tabs.forEach((tab, i) => {
            const on = i === index;
            tab.setAttribute('aria-selected', String(on));
            tab.tabIndex = on ? 0 : -1;
            panels[i].hidden = !on;
        });
        if (focus) tabs[index].focus();
        if (hash) history.replaceState(history.state, '', `#${panels[index].id}`);
    }

    function fromHash(scroll) {
        const id = decodeURIComponent(location.hash.slice(1));
        const index = id ? panels.findIndex((p) => p.id === id) : -1;
        if (index < 0) return false;
        select(index);
        if (scroll) el.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
        tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return true;
    }

    if (!fromHash(true)) select(Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')));

    tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i, { hash: true }), { signal }));
    el.querySelector('[role="tablist"]').addEventListener('keydown', (event) => {
        const current = tabs.indexOf(document.activeElement);
        if (current < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
        const next = rtl() ? 'ArrowLeft' : 'ArrowRight';
        const prev = rtl() ? 'ArrowRight' : 'ArrowLeft';
        let target = -1;
        if (event.key === next) target = (current + 1) % tabs.length;
        else if (event.key === prev) target = (current - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = tabs.length - 1;
        if (target < 0) return;
        event.preventDefault();
        select(target, { focus: true, hash: true });
    }, { signal });
    addEventListener('hashchange', () => fromHash(true), { signal });
}
