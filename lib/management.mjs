import { participates, slotsFor } from './ownership.mjs';
import { cashEvent } from './debrief.mjs';
const round = n => Math.round(n * 100) / 100;
export const managementRate = t => t.modelVersion === 2 ? round((t.balanceVersion ? .35 : 1) * (1 + 1.5 * (t.levels.crew || 0) + .25 * (t.levels.crew || 0) ** 2) * (1 - .04 * (t.levels.coordination || 0))) : 0;
export function settleManagement(r, t) { if (t.modelVersion !== 2 || !t.managementAccrued)
    return; const amount = round(t.managementAccrued); t.managementAccrued = 0; if (!amount)
    return; t.cash = round(t.cash - amount); t.profit = round(t.profit - amount); t.managementPaid = round((t.managementPaid || 0) + amount); cashEvent(r, t, -amount, 'management_overhead'); }
export function accrueManagement(r, t) { if (t.modelVersion !== 2 || t.bankrupt)
    return; t.managementAccrued = (t.managementAccrued || 0) + managementRate(t) / 60; if (r.time % 60 === 0)
    settleManagement(r, t); }
export const crewUse = (r, t) => r.projects.filter(p => participates(p, t.id) && p.state === 'building').reduce((n, p) => n + slotsFor(p, t.id), 0);
