import {exitInstitutions} from './institutions.mjs';
import { canFund } from './guarantee.mjs';
import { newsCost } from './market-news.mjs';
import { settleInformation } from './information-support.mjs';
import { members, participates, portion, paidFor, receivedFor } from './ownership.mjs';
import { settleInterest } from './interest.mjs';
import { settleManagement } from './management.mjs';
import { decisionEvent, finishReview } from './debrief.mjs';
export function shortage(r, t) { if (t.cash < 0)
    return true; return r.projects.some(p => { if (!participates(p, t.id) || p.state !== 'building' || !p.blocked)
    return false; const i = p.costPayments?.findIndex(x => !x.paid); if (i == null || i < 0)
    return false; return !canFund(t, p, portion(p, t.id, (p.costPayments[i].lockedAmount ?? newsCost(r, p, p.costPayments[i].amount)) + (i === p.costPayments.length - 1 ? (p.extra || 0) : 0))); }); }
export function endCompany(r, t, reason) {
    if (t.bankrupt)
        return;
    settleInterest(r, t);
    settleManagement(r, t);
    settleInformation(r, t);
    t.informationSupport = false;
    t.bankrupt = true;
    t.bankruptAt = r.time;
    t.bankruptReason = reason;
    t.training = [];
    t.restUntil = 0;
    for (const task of t.plan || [])
        if (['pending', 'running'].includes(task.status))
            task.status = 'cancelled';
    for (const p of r.projects) {
        if (p.state === 'open') {
            for (const [id, b] of Object.entries(p.bids))
                if (id === t.id || b.joint?.members.some(m => m.id === t.id))
                    delete p.bids[id];
            if (p.jointOffers)
                p.jointOffers = p.jointOffers.filter(o => o.lead !== t.id && o.partner !== t.id);
        }
        if (participates(p, t.id) && p.state === 'building') {
            p.state = 'terminated';
            p.blocked = false;
            p.terminatedAt = r.time;
            p.reason = '公司破产，项目终止';
        }
    }
    exitInstitutions(r,t);
    decisionEvent(r, t, 'company_exit', { reason }, 'system');
    finishReview(r, t);
    r.logs.unshift({ time: r.time, text: t.name + ' 已破产，本局经营结束；按退出结算成绩参评，历史峰值只用于复盘。' });
    r.logs = r.logs.slice(0, 80);
}
