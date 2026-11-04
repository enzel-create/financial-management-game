import { profitPosition } from './score-settlement.mjs';
import { riskSummary } from './context.mjs';
import { canFund, drawGuarantee, repayGuarantee, totalDebt } from './guarantee.mjs';
import { newsCost, newsEffect } from './market-news.mjs';
import { members, participates, portion, paidFor, receivedFor } from './ownership.mjs';
import { cashEvent } from './debrief.mjs';
import { riskGate, triggerRisk, checklist } from './compliance.mjs';
import { isSpecialty, SPECIALTY_KEYS, getUpgrades, UPGRADES } from './upgrades.mjs';
const round = n => Math.round(n * 100) / 100;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function allocate(total, schedule) { let allocated = 0; return schedule.map((s, i) => { const amount = i === schedule.length - 1 ? round(total - allocated) : round(total * s.share / 100); allocated = round(allocated + amount); return { ...s, amount }; }); }
export function initialCost(project, base) { return project.paymentVersion === 2 ? allocate(base, project.costSchedule)[0].amount : base; }
export function preparePayments(p) { p.costPayments = allocate(p.cost, p.costSchedule).map(x => ({ ...x, paid: false })); p.receipts = allocate(p.price, p.receiptSchedule).map(x => ({ ...x, due: null, received: false })); p.paidCost = 0; p.received = 0; p.blocked = false; p.extra = round(p.cost * p.shock); }
export function lockOrders(r, p, progress) { if (!p.contextVersion)
    return; for (const x of p.costPayments)
    if (x.lockedAmount == null && progress + 1e-7 >= (x.orderAt ?? x.at)) {
        x.lockedAmount = newsCost(r, p, x.amount);
        x.orderedAt = r.time;
    } }
export function payStage(r, p, t, index) { lockOrders(r, p, 100 * (1 - p.remaining / p.total)); const item = p.costPayments[index]; if (item.paid)
    return true; let amount = item.lockedAmount ?? newsCost(r, p, item.amount); p.newsCostDelta ??= 0; if (index === p.costPayments.length - 1) {
    p.shockRevealed = true;
    amount = round(amount + p.extra);
} const ts = members(p).map(m => r.teams.find(t => t.id === m.id)); if (ts.some(t => !canFund(t, p, portion(p, t.id, amount))))
    return false; for (const t of ts) {
    const share = portion(p, t.id, amount);
    drawGuarantee(r, t, p, share);
    t.cash = round(t.cash - share);
    cashEvent(r, t, -share, 'project_cost', { project: p.id, label: item.label });
} p.newsCostDelta = round(p.newsCostDelta + (item.lockedAmount ?? newsCost(r, p, item.amount)) - item.amount); p.paidCost = round(p.paidCost + amount); item.paid = true; item.paidAmount = amount; item.paidAt = r.time; return true; }
export function certify(r, p) { const progress = 100 * (1 - p.remaining / p.total); if (p.contextVersion && progress >= 100 && p.compliance?.documentLevel >= 6)
    p.compliance.closeout = true; for (const item of p.receipts)
    if ((!item.retainage || p.compliance?.closeout) && item.due === null && progress + 1e-7 >= item.at) {
        item.newsDelay = newsEffect(r, p, 'receipt');
        item.due = r.time + Math.max(0, item.delay + (p.receiptDelay || 0) + item.newsDelay);
    } }
export function collectReceipts(r) { for (const p of r.projects) {
    if (p.paymentVersion !== 2 || !p.owner || p.state === 'terminated')
        continue;
    if (p.state === 'done') {
        if (r.modules?.manualCompliance === false && p.compliance)
            p.compliance.closeout = true;
        certify(r, p);
    }
    const ts = members(p).map(m => r.teams.find(t => t.id === m.id));
    if (ts.some(t => t.bankrupt))
        continue;
    for (const item of p.receipts) {
        if (!item.received && item.due !== null && item.due <= r.time) {
            item.received = true;
            item.receivedAt = r.time;
            p.received = round(p.received + item.amount);
            for (const t of ts) {
                const amount = portion(p, t.id, item.amount);
                t.cash = round(t.cash + amount);
                cashEvent(r, t, amount, 'project_receipt', { project: p.id, label: item.label });
                repayGuarantee(r, t, p, amount);
            }
        }
    }
} }
export function advanceProject(r, p, t, speed) { if (r.modules?.manualCompliance === false && p.compliance) {
    for (const kind of ['safety', 'documents', 'closeout'])
        if (!p.compliance[kind] && (kind !== 'closeout' || 100 * (1 - p.remaining / p.total) >= 95)) {
            try {
                checklist(r, t, { project: p.id, kind });
            }
            catch { /* Cash shortages retain normal consequences. */ }
        }
} let remaining = riskGate(p, Math.max(0, p.remaining - speed * (1 + newsEffect(r, p, 'speed')))), progress = 100 * (1 - remaining / p.total); p.blocked = false; lockOrders(r, p, progress); for (let i = 0; i < p.costPayments.length; i++) {
    const item = p.costPayments[i];
    if (!item.paid && progress + 1e-7 >= item.at && !payStage(r, p, t, i)) {
        remaining = p.total * (1 - item.at / 100);
        p.blocked = true;
        break;
    }
} p.remaining = remaining; triggerRisk(r, p, t); certify(r, p); return p.remaining <= 1e-7 && !p.blocked; }
export function sampleLiquidity(r, t) { t.liquiditySum = (t.liquiditySum || 0) + clamp(cashPosition(r, t).netCash / (t.initialCash || 160), 0, 1) * 100; t.liquiditySamples = (t.liquiditySamples || 0) + 1; t.shortageSeconds = (t.shortageSeconds || 0) + (t.cash < 0 || r.projects.some(p => participates(p, t.id) && p.state === 'building' && p.blocked) ? 1 : 0); }
export function cashPosition(r, t) { const projects = r.projects.filter(p => participates(p, t.id) && p.paymentVersion === 2); const outstanding = round(projects.filter(p => p.state === 'building').reduce((sum, p) => sum + (p.costPayments || []).filter(x => !x.paid).reduce((n, x) => n + portion(p, t.id, (x.lockedAmount ?? newsCost(r, p, x.amount))), 0), 0)); const receivable = round(projects.filter(p => p.state === 'done').reduce((sum, p) => sum + p.receipts.filter(x => !x.received).reduce((n, x) => n + portion(p, t.id, x.amount), 0), 0)); const advance = round(projects.filter(p => ['building', 'terminated'].includes(p.state)).reduce((sum, p) => sum + receivedFor(p, t.id), 0)); const pending = round(projects.filter(p => p.state !== 'terminated').reduce((sum, p) => sum + p.receipts.filter(x => !x.received && x.due !== null).reduce((n, x) => n + portion(p, t.id, x.amount), 0), 0)); return { netCash: round(t.cash - totalDebt(t) - advance), outstanding, receivable, advance, pending }; }
export function capabilityScore(r, t) { const specs = getUpgrades(r); const general = Object.entries(specs).filter(([k]) => !isSpecialty(k)).map(([k, u]) => (t.levels[k] || 0) / u.max).sort((a, b) => b - a); const focus = general.slice(0, 4).reduce((a, b) => a + b, 0) / 4; const specialty = Math.max(...SPECIALTY_KEYS.map(k => (t.levels[k] || 0) / 6)); const start = t.initialConfiguration?.levels || {}; const gained = Object.entries(t.levels).reduce((n, [k, v]) => n + Math.max(0, v - (start[k] || 0)), 0); return round(100 * (.45 * focus + .35 * specialty + .2 * clamp(gained / 8, 0, 1))); }
export function financeScores(r, t) { const position = cashPosition(r, t); const risks = r.contextVersion ? riskSummary(r, t) : { expectedLoss: 0, warrantyReserve: 0 }; risks.expectedLoss = profitPosition(r, t).expectedLoss; const ending = clamp((position.netCash - risks.expectedLoss - risks.warrantyReserve) / (t.initialCash || 160), 0, 1) * 100; const average = t.liquiditySamples ? t.liquiditySum / t.liquiditySamples : ending; const continuity = t.liquiditySamples ? 100 * (1 - (t.shortageSeconds || 0) / t.liquiditySamples) : 100; return { ...position, growth: r.balanceVersion ? capabilityScore(r, t) : round(r.riskVersion ? (Object.entries(getUpgrades(r)).filter(([k]) => !isSpecialty(k)).reduce((n, [k, u]) => n + (t.levels[k] || 0) / u.max, 0) / (r.modelVersion === 2 ? 11 : 6) * (r.specialtyVersion ? .7 : 1) + (r.specialtyVersion ? .3 * Math.max(...SPECIALTY_KEYS.map(k => (t.levels[k] || 0) / (r.modelVersion === 2 ? 6 : 2))) : 0)) * 100 : (t.levels.cost / 3 + t.levels.speed / 3 + t.levels.crew / 2) / 3 * 100), cashScore: round(.5 * ending + .3 * average + .2 * continuity), liquidityAverage: round(average), shortageSeconds: t.shortageSeconds || 0 }; }
