// The edge-shadow cue is CSS-only on the pre, but it must exist only while the text really overflows.
export default function init(el, { signal }) {
    const pre = el.querySelector('.rc-code-pre');
    if (!pre) return;
    const update = () => pre.toggleAttribute('data-overflow', pre.scrollWidth > pre.clientWidth + 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(pre);
    document.fonts?.ready.then(() => !signal.aborted && update());
    return () => ro.disconnect();
}
