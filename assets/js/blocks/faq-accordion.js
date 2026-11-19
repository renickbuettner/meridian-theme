// Search filter for the FAQ list; the accordion itself is native <details>.
const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export default function init(el, { signal }) {
    const input = el.querySelector('input[type="search"]');
    const status = el.querySelector('[role="status"]');
    const items = [...el.querySelectorAll('.mr-faq__item')].map((node) => ({ node, text: fold(node.textContent) }));
    if (!input) return;

    function filter() {
        const terms = fold(input.value).split(/\s+/).filter(Boolean);
        let count = 0;
        for (const { node, text } of items) {
            const show = terms.every((t) => text.includes(t));
            node.hidden = !show;
            if (show) count++;
        }
        status.textContent = !terms.length ? '' : count ? el.dataset.msgResults.replace(':count', String(count)) : el.dataset.msgNone;
    }

    input.addEventListener('input', filter, { signal });
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && input.value) {
            input.value = '';
            filter();
        }
    }, { signal });
}
