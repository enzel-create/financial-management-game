import { cashEvent, decisionEvent } from './debrief.mjs';
export const INFORMATION_MONTHLY_FEE = 1;
const money = n => Math.round(n * 100) / 100;
export const informationRate = (r, t) => t.informationSupport ? INFORMATION_MONTHLY_FEE * 12 / r.duration : 0;
export function settleInformation(r, t) { const amount = money(t.informationAccrued || 0); if (!amount)
    return; t.informationAccrued = (t.informationAccrued || 0) - amount; t.cash = money(t.cash - amount); t.profit = money(t.profit - amount); t.informationPaid = money((t.informationPaid || 0) + amount); cashEvent(r, t, -amount, 'information_fee'); }
export function accrueInformation(r, t) { if (!t.informationSupport || t.bankrupt)
    return; t.informationAccrued = (t.informationAccrued || 0) + informationRate(r, t); if (Math.floor(r.time * 12 / r.duration) > Math.floor((r.time - 1) * 12 / r.duration))
    settleInformation(r, t); }
export function changeInformation(r, t, a) { if (!t || !['running', 'paused'].includes(r.phase) || t.bankrupt)
    throw Error('请等待比赛开始或恢复'); if (typeof a.enabled !== 'boolean')
    throw Error('无效模式'); if (!!t.informationSupport === a.enabled)
    return; if (a.enabled && t.cash < INFORMATION_MONTHLY_FEE)
    throw Error('现金不足'); settleInformation(r, t); t.informationSupport = a.enabled; decisionEvent(r, t, a.enabled ? 'information_hire' : 'information_dismiss', { monthlyFee: INFORMATION_MONTHLY_FEE }); }
