import { participates, portion } from './ownership.mjs';
export const RULESET = 'FMG-2026.11';
export const money = n => Math.round(n * 100) / 100;
export const BASE_QUALIFICATIONS = { registration: true, registrationBond: true, liability: true, workersComp: true, publicWorks: true, licensedTrades: true };
export function projectContext(p) {
    const sector = Number(p.catalogId?.split('-')[1]);
    const variant = Number(p.catalogId?.match(/sector-\d+-(\d+)/)?.[1] || 0) + Number(p.catalogId?.match(/-v(\d+)/)?.[1] || 0) + (p.catalogId?.endsWith('-joint') ? 1 : 0);
    const owner = ['private', 'wa-public', 'federal'][variant % 3];
    const publicWork = owner !== 'private', retainageRate = owner === 'wa-public' ? .05 : owner === 'private' ? .03 : 0;
    const receiptSchedule = p.receiptSchedule.map(x => ({ ...x, share: x.share * (1 - retainageRate) }));
    if (retainageRate)
        receiptSchedule.push({ at: 100, share: retainageRate * 100, delay: 30, retainage: true, label: ['保留款：验收与收尾审核后释放', 'Retainage: release after acceptance & closeout'] });
    return { ...p, contextVersion: 1, selectionVersion: 2, ownerType: owner, fundingSource: owner === 'federal' ? 'federal' : owner === 'wa-public' ? 'state-local' : 'private', publicWork, selection: owner === 'private' ? 'best-value' : 'lowest-price', invited: owner === 'private' && p.releaseTier >= 2, retainageRate, receiptSchedule, buildingUse: sector === 9 ? '政府服务设施' : p.sector, costSchedule: p.costSchedule.map(x => ({ ...x, orderAt: Math.max(0, x.at - 10) })), laborShare: .35 };
}
export function qualifies(p, t) { return !p.contextVersion || Object.keys(BASE_QUALIFICATIONS).every(k => t.qualifications?.[k] === true); }
export function accounting(r, t) {
    const jobs = r.projects.filter(p => participates(p, t.id)), building = jobs.filter(p => p.state === 'building');
    return { completedContract: money(jobs.filter(p => p.state === 'done').reduce((n, p) => n + portion(p, t.id, p.price), 0)), earnedWork: money(building.reduce((n, p) => n + portion(p, t.id, p.price * Math.max(0, 1 - p.remaining / p.total)), 0)), actualReceipts: money(jobs.reduce((n, p) => n + portion(p, t.id, p.received || 0), 0)), retained: money(jobs.reduce((n, p) => n + (p.receipts || []).filter(x => x.retainage && !x.received).reduce((a, x) => a + portion(p, t.id, x.amount), 0), 0)) };
}
export const trackRecord = (t, track) => (t.trackRecord?.[track] || 0);
export function marketAccess(p, t) { return !p.invited || trackRecord(t, p.specialty) >= 1 || (t.completedProjects || 0) >= 2 || (p.selectionVersion === 2 && (t.levels[p.specialty] || 0) >= 3 && (t.levels.quality || 0) >= 2); }
export function selectionScore(p, t, amount, minPrice) { if (p.selection !== 'best-value')
    return null; const price = (p.selectionVersion === 2 ? 80 : 60) * minPrice / Math.max(1, amount), capability = (p.selectionVersion === 2 ? 15 : 20) * Math.min(1, (t.levels[p.specialty] || 0) / 6), record = (p.selectionVersion === 2 ? 5 : 20) * Math.min(1, trackRecord(t, p.specialty) / 3); return money(price + capability + record); }
// Diagnostic simulation reserves; never claim these are audited liabilities.
export function riskSummary(r, t) {
    const jobs = r.projects.filter(p => participates(p, t.id) && p.state !== 'terminated');
    let expectedLoss = 0, concentration = {}, warranty = 0;
    for (const p of jobs) {
        const share = membersShare(p, t.id);
        concentration[p.ownerType || 'legacy'] = (concentration[p.ownerType || 'legacy'] || 0) + (p.price || 0) * share;
        if (p.state === 'building') {
            const unpaid = (p.costPayments || []).filter(x => !x.paid).reduce((n, x) => n + (x.lockedAmount ?? x.amount), 0);
            const risk = (p.cost || 0) * .08 * (.75 * (1 - (p.procurementLevel || 0) * .08) + .25 * (1 - (p.qualityLevel || 0) * .08));
            expectedLoss += Math.max(0, (p.paidCost || 0) + unpaid + (p.costPayments?.at(-1)?.paid ? 0 : risk) - (p.price || 0)) * share;
        }
        if (p.state === 'done')
            warranty += (p.price || 0) * .01 * share;
    }
    const total = Object.values(concentration).reduce((a, b) => a + b, 0);
    return { expectedLoss: money(expectedLoss), warrantyReserve: money(warranty), channelConcentration: total ? money(Math.max(...Object.values(concentration)) / total * 100) : 0, teamStability: money(t.teamStability ?? 100), staffGapUntil: t.staffGapUntil || 0, turnoverCosts: t.turnoverCosts || 0, trackRecord: t.trackRecord || {} };
}
function membersShare(p, id) { return p.joint ? (p.joint.members.find(m => m.id === id)?.share || 0) / 100 : 1; }
