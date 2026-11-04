import { financialReport, sampleFinancials } from './financial-reporting.mjs';
import { profitPosition } from './score-settlement.mjs';
import { accounting, riskSummary } from './context.mjs';
export const LEVEL_KEYS = ['cost', 'speed', 'crew', 'safety', 'compliance', 'insurance', 'digital', 'industrial', 'medical', 'infrastructure', 'buildings', 'coordination', 'talent', 'procurement', 'technology', 'quality'];
const clone = x => JSON.parse(JSON.stringify(x));
const round = x => Math.round(x * 100) / 100;
export function initReview(r, t, partial = false) { if (!r.reviewVersion || t.review)
    return; t.review = { partial, initial: { abilityPoints: t.setupPoints, cash: t.cash, reserve: t.planReserve ?? 20, mode: t.mode, plan: clone(t.plan || []), levels: { ...t.levels } }, points: [], cash: [], decisions: [] }; sampleReview(r, t, true); }
export function sampleReview(r, t, force = false) { if (!t.review || t.review.ended)
    return; const points = t.review.points, last = points.at(-1), levels = LEVEL_KEYS.map(k => t.levels[k] || 0); if (!force && last && last.cash === t.cash && last.levels.every((x, i) => x === levels[i]))
    return; const point = { time: r.time, cash: t.cash, levels }; if (last?.time === r.time)
    points[points.length - 1] = point;
else
    points.push(point); }
export function cashEvent(r, t, amount, type, detail = {}, balance = t.cash) { if (!t.review || !amount)
    return; t.review.cash.push({ time: r.time, amount: round(amount), type, balance: round(balance), ...detail }); sampleReview(r, t); }
export function decisionEvent(r, t, type, detail = {}, source = 'manual') { if (!t.review)
    return; t.review.decisions.push({ seq: t.review.decisions.length + 1, time: r.time, phase: r.phase, type, source, ...clone(detail) }); }
export const DECISION_TYPES = new Set(['upgrade', 'welfare', 'rest', 'mode', 'loan', 'repay', 'compliance', 'bankrupt', 'bid', 'withdraw']);
export function recordAction(r, t, a, before, source) {
    if (!t?.review)
        return;
    const task = a.type === 'plan_add' ? t.plan.at(-1) : t.plan?.find(x => x.id === a.id);
    if (a.type.startsWith('plan_'))
        decisionEvent(r, t, a.type, { task: task ? clone(task) : undefined, reserve: t.planReserve, order: t.plan.filter(x => x.status === 'pending').map(x => ({ id: x.id, kind: x.kind, at: x.at })) }, source);
    else if (DECISION_TYPES.has(a.type))
        decisionEvent(r, t, a.type, { kind: a.kind, mode: a.mode, project: a.project, amount: a.amount, endsAt: a.type === 'rest' ? t.restUntil : t.training?.find(x => x.kind === (a.type === 'welfare' ? 'welfare' : a.kind))?.end }, source);
    const delta = round(t.cash - before);
    if (a.type === 'loan' && delta) {
        cashEvent(r, t, 40, 'loan', {}, before + 40);
        cashEvent(r, t, -4, 'financing_fee');
    }
    else if (delta && !/^(equipment_|bank_|surety_)/.test(a.type) && !['bankrupt', 'compliance', 'information_support', 'guarantee_buy', 'guarantee_repay'].includes(a.type))
        cashEvent(r, t, delta, a.type, { kind: a.kind, project: a.project });
    sampleReview(r, t);
}
export function finishReview(r, t) { if (!t.review || t.review.ended)
    return; sampleReview(r, t, true); sampleFinancials(r, t, true); t.review.ended = true; t.review.endTime = r.time; }
export function debriefView(r) { if (r.phase !== 'finished' || !r.reviewVersion)
    return null; return { version: 1, ruleset: r.ruleset || "legacy", news: r.news || [], round: r.round, duration: r.duration, endTime: r.time, companies: r.teams.map(t => ({ financials: financialReport(r, t), ...accounting(r, t), ...riskSummary(r, t), ...profitPosition(r, t), peaks: t.peaks, id: t.id, name: t.name, memberNames: [t.memberName || '成员1', ...(t.collaborators || []).map(m => m.name)], bot: !!t.bot, skill: t.skill, bankrupt: !!t.bankrupt, bankruptAt: t.bankruptAt, bankruptReason: t.bankruptReason, initial: t.review?.initial, initialConfiguration: t.initialConfiguration, companyDesign: t.companyDesign, interestEarned: t.interestEarned || 0, managementPaid: t.managementPaid || 0, informationPaid: t.informationPaid || 0, partial: !!t.review?.partial, points: t.review?.points || [], cash: t.review?.cash || [], decisions: t.review?.decisions || [], endTime: t.review?.endTime ?? r.time, plan: clone(t.plan || []), reserve: t.planReserve, mode: t.mode, debt: t.debt, levels: { ...t.levels }, finalCash: t.cash, guaranteeDebt: t.guaranteeDebt || 0, guarantees: clone(t.guarantees || {}), revenue: t.revenue, profit: t.profit })), projects: r.projects.filter(p => p.owner).map(p => ({ id: p.id, name: p.name, owner: p.owner, joint: p.joint, state: p.state, price: p.price, started: p.started, finished: p.finished })) }; }
