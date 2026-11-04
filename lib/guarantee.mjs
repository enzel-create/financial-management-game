import { cashEvent, decisionEvent } from './debrief.mjs';
export const GUARANTORS = [{ id: 'bridge', name: ['桥梁信贷', 'Bridge Credit'], cover: .4, rate: .02 }, { id: 'harbor', name: ['港湾信贷', 'Harbor Credit'], cover: .8, rate: .03 }, { id: 'summit', name: ['峰顶信贷', 'Summit Credit'], cover: 1.25, rate: .04 }];
export const DRAW_FEE = .05;
const money = n => Math.round(n * 100) / 100;
export const guaranteeRemaining = (t, p) => Math.max(0, money((t.guarantees?.[p.id]?.limit || 0) - (t.guarantees?.[p.id]?.drawn || 0)));
export const totalDebt = t => (t.debt || 0) + (t.guaranteeDebt || 0) + (t.bankAccrued || 0) + (t.suretyRecourse || 0);
export function guaranteeQuote(base, id) { const provider = GUARANTORS.find(g => g.id === id); if (!provider)
    return null; const limit = money(base * provider.cover); return { provider: id, limit, fee: Math.max(.5, money(limit * provider.rate)) }; }
export function buyGuarantee(r, t, p, base, id) { if (r.phase !== 'running' || t.bankrupt || p.state !== 'open' || p.closes <= r.time || p.paymentVersion !== 2)
    throw Error('当前不能申请授信 / Credit unavailable'); if (t.guarantees?.[p.id])
    throw Error('本项目已申请授信 / Credit already opened'); if (Object.entries(p.bids).some(([key, b]) => key === t.id || b.joint?.members.some(m => m.id === t.id)))
    throw Error('请先撤回报价再申请授信 / Withdraw your bid first'); if (!guaranteeApproval(r, t, id))
    throw Error('未满足授信记录要求 / Credit track-record requirement not met'); const q = guaranteeQuote(base, id); if (!q)
    throw Error('无效担保机构 / Invalid credit provider'); if (t.cash < q.fee)
    throw Error('现金不足以支付授信开通费 / Insufficient cash for fee'); t.guarantees ??= {}; t.guarantees[p.id] = { ...q, drawn: 0, debt: 0, paidAt: r.time }; t.cash = money(t.cash - q.fee); t.profit = money(t.profit - q.fee); cashEvent(r, t, -q.fee, 'guarantee_fee', { project: p.id }); decisionEvent(r, t, 'guarantee_buy', { project: p.id, ...q }); }
export function drawNeeded(cash, cost) { const spendable = Math.max(0, cash - 10); if (cost <= spendable + 1e-8)
    return 0; let draw = Math.ceil((cost - spendable) / (1 - DRAW_FEE) * 100) / 100; while (money(spendable + draw - money(draw * DRAW_FEE)) + 1e-8 < cost)
    draw = money(draw + .01); return draw; }
export const canFund = (t, p, cost) => { const draw = Math.min(drawNeeded(t.cash, cost), guaranteeRemaining(t, p)); return t.cash >= 0 && money(t.cash + draw - money(draw * DRAW_FEE)) + 1e-8 >= cost; };
export function drawGuarantee(r, t, p, cost) { const draw = Math.min(drawNeeded(t.cash, cost), guaranteeRemaining(t, p)); if (!draw)
    return true; if (!canFund(t, p, cost))
    return false; const g = t.guarantees[p.id], fee = money(draw * DRAW_FEE); g.drawn = money(g.drawn + draw); g.debt = money(g.debt + draw); t.guaranteeDebt = money((t.guaranteeDebt || 0) + draw); t.cash = money(t.cash + draw); cashEvent(r, t, draw, 'guarantee_draw', { project: p.id }); t.cash = money(t.cash - fee); t.profit = money(t.profit - fee); cashEvent(r, t, -fee, 'guarantee_finance', { project: p.id }); return true; }
export function repayGuarantee(r, t, p, amount) { const g = t.guarantees?.[p.id]; if (!g?.debt)
    return; const paid = money(Math.min(g.debt, Math.max(0, t.cash), amount)); if (!paid)
    return; g.debt = money(g.debt - paid); t.guaranteeDebt = money(Math.max(0, (t.guaranteeDebt || 0) - paid)); t.cash = money(t.cash - paid); cashEvent(r, t, -paid, 'guarantee_repay', { project: p.id }); }
export function guaranteeApproval(r, t, id) { if (!r.contextVersion)
    return true; const required = id === 'summit' ? 2 : id === 'harbor' ? 1 : 0; return !t.bankrupt && t.cash - totalDebt(t) >= 0 && (t.completedProjects || 0) >= required && (id !== 'summit' || (t.incidents || 0) <= 2); }
