import { participates, portion } from './ownership.mjs';
const money = n => Math.round(n * 100) / 100;
// Public risk envelope, never hidden future outcomes. Same cutoff convention for exit and round end.
export function profitPosition(r, t) {
    if (t.scoreSettlement)
        return t.scoreSettlement;
    let expectedLoss = 0, wipExpectedProfit = 0;
    for (const p of r.projects.filter(p => participates(p, t.id) && ['building', 'terminated'].includes(p.state))) {
        const unpaid = (p.costPayments || []).filter(x => !x.paid).reduce((n, x) => n + (x.lockedAmount ?? x.amount), 0);
        const risk = (p.cost || 0) * .08 * (.75 * (1 - (p.procurementLevel || 0) * .08) + .25 * (1 - (p.qualityLevel || 0) * .08));
        const total = (p.paidCost || 0) + unpaid + (p.costPayments?.at(-1)?.paid ? 0 : risk);
        const expected = portion(p, t.id, (p.price || 0) - total);
        wipExpectedProfit += expected;
        expectedLoss += Math.max(0, -expected);
    }
    return { realizedProfit: money(t.profit), expectedLoss: money(expectedLoss), wipExpectedProfit: money(wipExpectedProfit), scoredProfit: money(t.profit - expectedLoss) };
}
export function freezeSettlement(r, t) { if (!t.scoreSettlement)
    t.scoreSettlement = { ...profitPosition(r, t), settledAt: r.time }; return t.scoreSettlement; }
