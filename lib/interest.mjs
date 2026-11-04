import { totalDebt } from './guarantee.mjs';
import { participates, receivedFor } from './ownership.mjs';
import { cashEvent } from './debrief.mjs';
const round = n => Math.round(n * 100) / 100;
export function interestBase(r, t) { const advance = r.projects.filter(p => participates(p, t.id) && p.state === 'building').reduce((n, p) => n + (p.joint ? receivedFor(p, t.id) : (p.received || 0)), 0); return Math.max(0, t.cash - totalDebt(t) - advance); }
export function settleInterest(r,t){
 if(r.interestVersion!==1||!t.interestAccrued)return;
 const due=round(t.interestAccrued),bank=r.institutions?.bank,amount=bank?Math.min(due,Math.max(0,bank.cash)):due;
 t.interestAccrued=round(due-amount);if(!amount)return;
 if(bank){bank.cash=round(bank.cash-amount);bank.profit=round(bank.profit-amount);}
 t.cash=round(t.cash+amount);t.profit=round(t.profit+amount);t.interestEarned=round((t.interestEarned||0)+amount);cashEvent(r,t,amount,'cash_interest');
}
export function accrueInterest(r, t) { if (r.interestVersion !== 1 || t.bankrupt)
    return; t.interestAccrued = (t.interestAccrued || 0) + interestBase(r, t) * .04 / r.duration; if (r.time % 60 === 0)
    settleInterest(r, t); }
