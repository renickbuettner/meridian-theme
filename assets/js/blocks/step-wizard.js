// Island for the step-wizard block: one fieldset at a time, per-step validation, result card, lead form posted by the plugin's forms.js.
let uid = 0;

export default function init(el, { signal }) {
    const form = el.querySelector('form');
    const steps = [...el.querySelectorAll('[data-step]')];
    const dots = [...el.querySelectorAll('.mr-wiz__dot')];
    const back = el.querySelector('[data-wiz-back]');
    const next = el.querySelector('[data-wiz-next]');
    const submit = el.querySelector('[data-wiz-submit]');
    const recommendation = el.querySelector('[data-wiz-recommendation]');
    const summary = el.querySelector('[data-wiz-summary]');
    const cards = [...el.querySelectorAll('[data-result-card]')];
    const msg = el.dataset;
    const id = `mr-wiz-${++uid}`;
    const last = steps.length - 1;
    if (!form || !steps.length) return;

    // Answers are sent as one readable summary. Without names they drop out of FormData; without `required`
    // a nameless radio would block the native check, and this island validates each step itself.
    for (const input of el.querySelectorAll('[data-answer]')) {
        input.removeAttribute('name');
        input.removeAttribute('required');
    }

    let current = 0;

    const errorOf = (scope) => scope.querySelector(':scope > .rc-form-field-error');

    function clearError(scope, control) {
        errorOf(scope)?.remove();
        for (const c of [scope, control]) {
            if (!c) continue;
            c.removeAttribute('aria-invalid');
            const rest = (c.getAttribute('aria-describedby') || '').split(/\s+/).filter((x) => x && !x.endsWith('-error'));
            rest.length ? c.setAttribute('aria-describedby', rest.join(' ')) : c.removeAttribute('aria-describedby');
        }
    }

    function setError(scope, control, text, errorId) {
        clearError(scope, control);
        const p = document.createElement('p');
        p.className = 'rc-form-field-error';
        p.id = errorId;
        p.textContent = text;
        scope.append(p);
        for (const c of [control]) {
            c.setAttribute('aria-invalid', 'true');
            c.setAttribute('aria-describedby', [c.getAttribute('aria-describedby'), errorId].filter(Boolean).join(' '));
        }
    }

    const checkedOf = (step) => [...step.querySelectorAll('input[data-answer]:checked')];

    function validateQuestion(step, index) {
        const kind = step.dataset.kind;
        if (step.dataset.required !== '1') return true;
        if (kind === 'text') {
            const area = step.querySelector('textarea');
            if (area.value.trim()) return true;
            setError(step, area, msg.msgText, `${id}-${index}-error`);
            area.focus();
            return false;
        }
        if (checkedOf(step).length) return true;
        const first = step.querySelector('input');
        const text = kind === 'multiple' ? msg.msgChooseMultiple : msg.msgChoose;
        setError(step, kind === 'single' ? step : first, text, `${id}-${index}-error`);
        first.focus();
        return false;
    }

    function validateLead(step) {
        let firstBad = null;
        for (const row of step.querySelectorAll('[data-rc-field]')) {
            const control = row.querySelector('input, textarea');
            let text = '';
            if (control.type === 'checkbox') {
                if (control.required && !control.checked) text = msg.msgPrivacy;
            } else if (control.required && !control.value.trim()) {
                text = msg.msgRequired;
            } else if (control.type === 'email' && control.value.trim() && !control.validity.valid) {
                text = msg.msgEmail;
            }
            if (text) {
                setError(row, control, text, `${control.id}-error`);
                firstBad ??= control;
            } else {
                clearError(row, control);
            }
        }
        firstBad?.focus();
        return !firstBad;
    }

    const validate = (index) => (index === last ? validateLead(steps[index]) : validateQuestion(steps[index], index));

    function winner() {
        const counts = new Map();
        for (const input of el.querySelectorAll('input[data-answer][data-result]:checked')) {
            counts.set(input.dataset.result, (counts.get(input.dataset.result) || 0) + 1);
        }
        let best = null;
        for (const card of cards) {
            const n = counts.get(card.dataset.resultCard) || 0;
            if (n > 0 && (!best || n > best.n)) best = { card, n };
        }
        return best?.card || null;
    }

    function showResult() {
        const win = winner();
        for (const card of cards) card.hidden = card !== win;
        recommendation.value = win ? win.querySelector('.mr-wiz__result-title').textContent.trim() : '';
    }

    function compileSummary() {
        const lines = [];
        steps.forEach((step, i) => {
            if (i === last) return;
            const question = step.querySelector('[data-question]').firstChild.textContent.trim();
            const answer = step.dataset.kind === 'text'
                ? step.querySelector('textarea').value.trim()
                : checkedOf(step).map((x) => x.value).join(', ');
            lines.push(`${i + 1}. ${question}: ${answer || '-'}`);
        });
        summary.value = lines.join('\n');
    }

    function show(index, focus) {
        current = index;
        steps.forEach((step, i) => { step.hidden = i !== index; });
        dots.forEach((dot, i) => {
            dot.classList.toggle('is-done', i < index);
            dot.classList.toggle('is-current', i === index);
        });
        back.hidden = index === 0;
        next.hidden = index === last;
        submit.hidden = index !== last;
        if (index === last) showResult();
        if (focus) steps[index].querySelector('legend').focus();
    }

    next.addEventListener('click', () => {
        if (validate(current)) show(current + 1, true);
    }, { signal });
    back.addEventListener('click', () => show(current - 1, true), { signal });

    // Capture phase on the island: runs before forms.js, so an invalid step never reaches it.
    el.addEventListener('submit', (event) => {
        if (event.target !== form) return;
        if (current !== last) {
            event.preventDefault();
            event.stopPropagation();
            if (validate(current)) show(current + 1, true);
            return;
        }
        if (!validateLead(steps[last])) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        compileSummary();
        showResult();
    }, { capture: true, signal });

    // Editing a field withdraws its error.
    form.addEventListener('input', (event) => {
        const row = event.target.closest('[data-rc-field], [data-step]');
        if (row && errorOf(row)) clearError(row, event.target);
        const step = event.target.closest('[data-step]');
        if (step?.dataset.kind === 'single') clearError(step, step);
    }, { signal });

    const sentObserver = new MutationObserver(() => {
        if (form.classList.contains('rc-form-sent')) el.querySelector('.mr-wiz__success').focus();
    });
    sentObserver.observe(form, { attributes: true, attributeFilter: ['class'] });

    show(0, false);

    return () => sentObserver.disconnect();
}
