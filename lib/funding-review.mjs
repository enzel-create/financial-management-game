import { guaranteeRemaining, drawNeeded, DRAW_FEE } from './guarantee.mjs';
import { informationRate } from './information-support.mjs';
import { newsEffect, newsCost } from './market-news.mjs';
import { participates, portion } from './ownership.mjs';
import { allocate } from './cashflow.mjs';
import { managementRate } from './management.mjs';
const money = n => Math.round(n * 100) / 100;
export const fundingReviewEnabled = r => r.modelVersion === 2 && r.fundingVersion === 1;
const checkFee = level => level >= 6 ? 0 : level >= 4 ? 1 : level >= 2 ? 1.5 : 2;
// A public simulation stress case, never the hidden sampled material shock.
// Combine all committed work with this prospective award in one cash timeline.
export function fundingReview(r, t, candidate, amount, estimate) {
    const events = [], now = r.time || 0, speed = (t.fatigue >= 70 ? .8 : 1) * ((t.staffGapUntil || 0) > now ? .85 : 1);
    const add = (at, cost, projectId = null, covered = false) => events.push({ at: Math.max(0, Math.ceil(at)), cost, projectId, covered });
    function project(p, fresh = false) {
        const base = fresh ? estimate.base : p.cost, total = fresh ? estimate.duration : p.total;
        const progress = fresh ? 0 : Math.max(0, 100 * (1 - p.remaining / total));
        const hold = fresh ? Math.max(0, (p.closes || now) - now) : Math.max(0, (p.holdUntil || 0) - now);
        const at = percent => Math.max(0, (percent - progress) * total / 100 / speed / Math.min(1, 1 + newsEffect(r, p, 'speed'))) + hold;
        const quality = fresh ? (estimate.qualityLevel ?? t.levels.quality ?? 0) : (p.qualityLevel || 0);
        const procurement = fresh ? (estimate.procurementLevel ?? t.levels.procurement ?? 0) : (p.procurementLevel || 0);
        const contingency = money(base * .2 * (p.contextVersion ? .75 * (1 - procurement * .08) + .25 * (1 - quality * .08) : 1 - quality * .08));
        const split = value => p.joint ? portion(p, t.id, value) : value;
        const costs = fresh ? allocate(base, p.costSchedule) : p.costPayments;
        costs.forEach((x, i) => { if (!x.paid)
            add(at(x.at), split((x.lockedAmount ?? Math.max(x.amount, newsCost(r, p, x.amount, now + at(x.orderAt ?? x.at)))) + (i === costs.length - 1 ? contingency : 0)), p.id, true); });
        const receipts = fresh ? allocate(amount, p.receiptSchedule) : p.receipts;
        receipts.forEach(x => { if (!x.received)
            add(!fresh && x.due != null ? x.due - now : at(x.at) + x.delay + (fresh ? 0 : p.receiptDelay || 0) + Math.max(0, newsEffect(r, p, 'receipt', now + at(x.at))), -split(x.amount), p.id); });
        for (const [kind, key, percent] of [['safety', 'safetyLevel', 25], ...(p.contextVersion ? [['safety', 'safetyLevel', 65]] : []), ['documents', 'documentLevel', 55]]) {
            if (percent < progress)
                continue;
            if (!fresh && p.compliance?.[kind] && !(kind === 'safety' && percent === 65 && !p.compliance.safetyCycle))
                continue;
            const level = fresh ? (estimate[key] ?? t.levels[kind === 'safety' ? 'safety' : 'compliance'] ?? 0) : (p.compliance?.[key] || 0);
            add(Math.max(0, at(percent) - 1), split(checkFee(level)));
        }
    }
    for (const p of r.projects || []) {
        if (!participates(p, t.id) || p.paymentVersion !== 2)
            continue;
        if (p.state === 'building')
            project(p);
        else if (p.state === 'done')
            for (const x of p.receipts || [])
                if (!x.received && x.due != null)
                    add(x.due - now, -portion(p, t.id, x.amount), p.id);
    }
    project(candidate, true);
    // Reserve accrued overhead immediately; then accrue at today's completed levels.
    // No speculative new loans, unsigned awards, interest, or future upgrades count.
    events.sort((a, b) => a.at - b.at || b.cost - a.cost);
    let used = (t.managementAccrued || 0) + (t.informationAccrued || 0), peak = Math.max(0, used), last = 0;
    const rate = managementRate(t) / 60 + informationRate(r, t);
    for (const e of events) {
        used += (e.at - last) * rate;
        peak = Math.max(peak, used);
        used += e.cost;
        peak = Math.max(peak, used);
        last = e.at;
    }
    const unguaranteedRequired = Math.ceil((peak - 1e-8) * 100) / 100, available = money(t.cash);
    const hasGuarantees = events.some(e => t.guarantees?.[e.projectId]);
    function survives(start) {
        let cash = start - (t.managementAccrued || 0) - (t.informationAccrued || 0), at = 0;
        const gs = Object.fromEntries(Object.entries(t.guarantees || {}).map(([id, g]) => [id, { left: guaranteeRemaining(t, { id }), debt: g.debt || 0 }]));
        if (cash < 0)
            return false;
        for (const e of events) {
            cash -= (e.at - at) * rate;
            at = e.at;
            if (cash < -1e-8)
                return false;
            const g = gs[e.projectId];
            if (e.cost > 0 && e.covered && g) {
                const draw = Math.min(drawNeeded(cash, e.cost), g.left);
                g.left = money(g.left - draw);
                g.debt = money(g.debt + draw);
                cash += draw - money(draw * DRAW_FEE);
            }
            cash -= e.cost;
            if (cash < -1e-8)
                return false;
            if (e.cost < 0 && g) {
                const paid = Math.min(g.debt, -e.cost, Math.max(0, cash));
                cash -= paid;
                g.debt -= paid;
            }
        }
        return true;
    }
    let required = unguaranteedRequired;
    if (hasGuarantees) {
        let lo = 0, hi = Math.ceil((unguaranteedRequired + (t.guaranteeDebt || 0) + 1) * 100);
        while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (survives(mid / 100))
                hi = mid;
            else
                lo = mid + 1;
        }
        required = lo / 100;
    }
    const shortfall = money(Math.max(0, required - available));
    return { required, unguaranteedRequired, guaranteeRelief: money(Math.max(0, unguaranteedRequired - required)), available, shortfall, passes: shortfall === 0, horizon: last };
}
