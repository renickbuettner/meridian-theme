// Island for the pricing-calculator block: config comes from data-config (tiers, currency, discount, strings).
let uid = 0;

const fill = (text, values) => text.replace(/:(\w+)/g, (m, k) => (k in values ? values[k] : m));

export default function init(el, { signal }) {
    const cfg = JSON.parse(el.dataset.config || '{}');
    const t = cfg.i18n;
    const lang = document.documentElement.lang || undefined;
    const q = (name) => el.querySelector(`[data-out="${name}"]`);
    const input = (name) => el.querySelector(`[data-input="${name}"]`);

    const tiers = (cfg.tiers || [])
        .map((tier) => ({ ...tier, limit: tier.upTo > 0 ? tier.upTo : Infinity }))
        .sort((a, b) => a.limit - b.limit);
    if (!tiers.length) return;

    const seats = input('seats');
    const term = input('term');
    const yearly = input('yearly');
    const plural = new Intl.PluralRules(lang);
    const count = (n, one, other) => fill(plural.select(n) === 'one' ? one : other, { count: n });

    const cents = (v) => Math.round(v * 100) / 100;
    const money = (v) => {
        const whole = Number.isInteger(cents(v));
        return new Intl.NumberFormat(lang, {
            style: 'currency',
            currency: cfg.currency,
            minimumFractionDigits: whole ? 0 : 2,
            maximumFractionDigits: 2,
        }).format(v);
    };

    const id = ++uid;
    for (const [name, control] of [['seats', seats], ['term', term]]) {
        control.id = `mr-calc-${id}-${name}`;
        el.querySelector(`[data-for="${name}"]`).htmlFor = control.id;
        q(name).htmlFor = control.id;
    }

    const out = {
        plan: q('plan'), price: q('price'), unit: q('unit'), billed: q('billed'),
        totalLabel: q('total-label'), total: q('total'), saving: q('saving'), features: q('features'),
        cta: q('cta'), live: q('live'),
        totalRow: el.querySelector('[data-row="total"]'), savingRow: el.querySelector('[data-row="saving"]'),
    };

    let liveTimer;
    let renderedPlan = null;

    const update = () => {
        const n = Number(seats.value);
        const months = Number(term.value);
        const isYearly = yearly.getAttribute('aria-checked') === 'true';
        const tier = tiers.find((x) => n <= x.limit) || tiers[tiers.length - 1];
        const seatsText = count(n, t.seats_one, t.seats_other);
        const termText = count(months, t.term_one, t.term_other);

        for (const [control, text] of [[seats, seatsText], [term, termText]]) {
            control.setAttribute('aria-valuetext', text);
            control.style.setProperty('--mr-calc-fill', `${((control.value - control.min) / (control.max - control.min)) * 100}%`);
        }
        q('seats').value = seatsText;
        q('term').value = termText;
        out.plan.textContent = tier.name;

        let summary;
        if (tier.unit == null) {
            out.price.textContent = t.custom;
            out.unit.textContent = '';
            out.billed.textContent = t.custom_hint;
            out.totalRow.hidden = true;
            out.savingRow.hidden = true;
            summary = fill(t.summary_custom, { plan: tier.name, seats: seatsText });
        } else {
            const monthly = n * tier.unit;
            const effective = monthly * (isYearly ? (100 - cfg.discount) / 100 : 1);
            const total = effective * months;
            out.price.textContent = money(cents(effective));
            out.unit.textContent = t.per_month;
            out.billed.textContent = isYearly ? fill(t.billed_yearly, { amount: money(cents(effective * 12)) }) : t.billed_monthly;
            out.totalLabel.textContent = fill(t.total, { term: termText });
            out.total.textContent = money(cents(total));
            out.totalRow.hidden = false;
            const saved = (monthly - effective) * months;
            out.savingRow.hidden = !(isYearly && saved > 0);
            out.saving.textContent = money(cents(saved));
            summary = fill(t.summary, { plan: tier.name, seats: seatsText, price: money(cents(effective)), total: money(cents(total)), term: termText });
        }

        if (renderedPlan !== tier) {
            renderedPlan = tier;
            out.features.replaceChildren(...tier.features.map((f) => Object.assign(document.createElement('li'), { textContent: f })));
            out.features.hidden = !tier.features.length;
            out.cta.hidden = !(tier.label && tier.url);
            if (!out.cta.hidden) {
                out.cta.textContent = tier.label;
                out.cta.href = tier.url;
            }
        }

        clearTimeout(liveTimer);
        liveTimer = setTimeout(() => { out.live.textContent = summary; }, 500);
    };

    yearly.addEventListener('click', () => {
        yearly.setAttribute('aria-checked', String(yearly.getAttribute('aria-checked') !== 'true'));
        update();
    }, { signal });
    seats.addEventListener('input', update, { signal });
    term.addEventListener('input', update, { signal });
    update();

    return () => clearTimeout(liveTimer);
}
