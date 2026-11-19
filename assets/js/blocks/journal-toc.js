// Marks the heading being read in the post outline (aria-current="location"); the links themselves are plain anchors.
export default function init(el, { signal }) {
    const links = [...el.querySelectorAll('a[href^="#"]')];
    const entries = links
        .map((link) => ({ link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
        .filter((entry) => entry.heading);
    if (!entries.length) return;

    let frame = 0;
    const update = () => {
        frame = 0;
        const line = innerHeight * 0.3;
        let current = entries[0];
        for (const entry of entries) {
            if (entry.heading.getBoundingClientRect().top <= line) current = entry;
        }
        // At the very end the last section may never reach the line.
        if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) current = entries[entries.length - 1];
        for (const entry of entries) {
            if (entry === current) entry.link.setAttribute('aria-current', 'location');
            else entry.link.removeAttribute('aria-current');
        }
    };
    const schedule = () => { frame ||= requestAnimationFrame(update); };

    addEventListener('scroll', schedule, { passive: true, signal });
    addEventListener('resize', schedule, { passive: true, signal });
    update();
    return () => cancelAnimationFrame(frame);
}
