// Counts each figure up once when it scrolls into view; the server-rendered final text stays for no-JS, AT and reduced motion.
const DURATION = 1400;

export default function init(el, { signal }) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nums = [...el.querySelectorAll('.mr-stats__num')];
    if (!nums.length) return;
    let locale = el.dataset.locale || document.documentElement.lang || undefined;
    try { Intl.NumberFormat.supportedLocalesOf(locale); } catch { locale = undefined; }
    const frames = new Set();

    const run = (num) => {
        const end = Number(num.dataset.value);
        const decimals = Number(num.dataset.decimals) || 0;
        const fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        const final = num.textContent;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / DURATION);
            num.textContent = t < 1 ? fmt.format(end * (1 - (1 - t) ** 3)) : final;
            if (t < 1) frames.add(requestAnimationFrame(tick));
        };
        num.textContent = fmt.format(0);
        frames.add(requestAnimationFrame(tick));
    };

    const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            io.unobserve(entry.target);
            run(entry.target);
        }
    }, { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
    signal.addEventListener('abort', () => {
        io.disconnect();
        frames.forEach(cancelAnimationFrame);
    });
}
