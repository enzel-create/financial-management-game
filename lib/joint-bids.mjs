import { suretyQuote } from './institutions.mjs';
import { saveBidBudget } from './financial-reporting.mjs';
import { canFund } from './guarantee.mjs';
import { estimate } from './game.mjs';
import { eligible } from './compliance.mjs';
import { crewUse } from './management.mjs';
import { fundingReview, fundingReviewEnabled } from './funding-review.mjs';
import { portion, slotsFor, participates } from './ownership.mjs';
import { decisionEvent } from './debrief.mjs';
export const jointEnabled = r => r.modelVersion === 2 && r.jointVersion === 1;
export function jointTeam(r, joint) { const ts = joint.members.map(m => r.teams.find(t => t.id === m.id)); if (ts.some(t => !t))
    throw Error('联合成员不存在'); return { ...ts[0], qualifications: Object.fromEntries(Object.keys(ts[0].qualifications || {}).map(k => [k, ts.every(t => t.qualifications?.[k])])), trackRecord: Object.fromEntries(['digital', 'industrial', 'medical', 'infrastructure', 'buildings'].map(k => [k, Math.max(...ts.map(t => t.trackRecord?.[k] || 0))])), name: ts.map(t => t.name).join(' + '), levels: Object.fromEntries(Object.keys(ts[0].levels).map(k => [k, Math.max(...ts.map(t => t.levels[k] || 0))])), cash: ts.reduce((n, t) => n + t.cash, 0), debt: ts.reduce((n, t) => n + t.debt, 0), guaranteeDebt: ts.reduce((n, t) => n + (t.guaranteeDebt || 0), 0), completedProjects: Math.max(...ts.map(t => t.completedProjects || 0)), fatigue: Math.max(...ts.map(t => t.fatigue)), mode: 'normal', bankrupt: ts.some(t => t.bankrupt) }; }
export function evaluateOffer(r, p, id, b) {
    const joint = b.joint, ts = joint ? joint.members.map(m => r.teams.find(t => t.id === m.id)) : [r.teams.find(t => t.id === id)], v = joint ? jointTeam(r, joint) : ts[0], e = { ...estimate(p, v), qualityLevel: v.levels.quality || 0, procurementLevel: v.levels.procurement || 0, safetyLevel: v.levels.safety || 0, documentLevel: v.levels.compliance || 0 }, candidate = { ...p, joint };
    let reason = '';
    if (ts.some(t => t.bankrupt))
        reason = '公司已破产，不能中标';
    else if (!eligible(p, v))
        reason = '未满足项目准入要求';
    else if (ts.some(t => t.restUntil > r.time || crewUse(r, t) + (joint ? slotsFor(candidate, t.id) : p.crewSlots || 1) > 1 + t.levels.crew || !canFund(t, p, (joint ? portion(candidate, t.id, e.initial) : e.initial))))
        reason = '未授标：经营履约能力检查未通过';
    const bonds = ts.map(t => ({ id: t.id, ...suretyQuote(r, t, p, joint ? portion(candidate, t.id, b.amount) : b.amount) }));
    if (!reason && bonds.some(q => !q.approved))
        reason = bonds.find(q => !q.approved).reason;
    if(!reason && ts.some(t=>!canFund({...t,cash:t.cash-(bonds.find(q=>q.id===t.id)?.premium||0)},p,joint?portion(candidate,t.id,e.initial):e.initial))) reason='Premium leaves insufficient start cash / 保费后开工现金不足';
    const funding = fundingReviewEnabled(r) ? ts.map(t => ({ id: t.id, ...fundingReview(r, {...t,cash:t.cash-(bonds.find(q=>q.id===t.id)?.premium||0)}, candidate, b.amount, e) })) : [];
    if (!reason && funding.some(x => !x.passes))
        reason = '未授标：全周期履约资金不足';
    return { passes: !reason, reason, estimate: e, team: v, teams: ts, funding, bonds };
}
export const bidFor = (p, id) => Object.entries(p.bids).find(([lead, b]) => lead === id || b.joint?.members.some(m => m.id === id));
const involved = (o, id) => o.lead === id || o.partner === id;
export function jointAction(r, t, a) {
    if (!jointEnabled(r))
        throw Error('下一局启用联合投标');
    const p = r.projects.find(p => p.id === a.project);
    if (!p || p.state !== 'open' || p.closes <= r.time)
        throw Error('竞标已截止');
    p.jointOffers ??= [];
    if (a.type === 'joint_propose') {
        const partner = r.teams.find(x => x.id === a.partner), amount = Number(a.amount), share = Number(a.share);
        if (!partner || partner.id === t.id || partner.bankrupt)
            throw Error('请选择有效的合作公司');
        if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000 || !Number.isInteger(share) || share < 1 || share > 99)
            throw Error('报价须为正整数，分摊比例须为1至99的整数');
        if ([t, partner].some(x => bidFor(p, x.id) || p.jointOffers.some(o => involved(o, x.id))))
            throw Error('请先撤回该项目的报价或联合邀请');
        const o = { id: crypto.randomUUID(), lead: t.id, partner: partner.id, amount, share, joint: { relationship: 'joint-venture', lead: t.id, responsibility: 'shared-delivery', agreementVersion: 1, members: [{ id: t.id, share }, { id: partner.id, share: 100 - share }] } };
        p.jointOffers.push(o);
        decisionEvent(r, t, 'joint_propose', { project: p.id, partner: partner.id, amount, share });
        return;
    }
    const o = p.jointOffers.find(x => x.id === a.offer);
    if (!o || !involved(o, t.id))
        throw Error('联合邀请已变更或不存在');
    if (a.type === 'joint_cancel') {
        p.jointOffers = p.jointOffers.filter(x => x.id !== o.id);
        for (const id of [o.lead, o.partner])
            decisionEvent(r, r.teams.find(t => t.id === id), 'joint_cancel', { project: p.id, amount: o.amount, share: o.share });
        return;
    }
    if (a.type !== 'joint_accept' || o.partner !== t.id)
        throw Error('仅受邀公司可确认联合报价');
    const check = evaluateOffer(r, p, o.lead, o);
    if (!check.passes)
        throw Error(check.reason);
    if (bidFor(p, o.lead) || bidFor(p, o.partner))
        throw Error('请先撤回该项目的报价或联合邀请');
    saveBidBudget(r, p, { id: o.lead, amount: o.amount, joint: o.joint }, check.estimate);
    p.bids[o.lead] = { amount: o.amount, joint: o.joint, estimate: check.estimate, tie: crypto.getRandomValues(new Uint32Array(1))[0] };
    p.jointOffers = p.jointOffers.filter(x => x.id !== o.id);
    for (const id of [o.lead, o.partner])
        decisionEvent(r, r.teams.find(t => t.id === id), 'joint_accept', { project: p.id, members: o.joint.members, amount: o.amount });
}
export function jointView(r, p, t) { if (!t || p.state !== 'open')
    return []; return (p.jointOffers || []).filter(o => involved(o, t.id)).map(o => { const check = evaluateOffer(r, p, o.lead, o); return { ...o, estimate: check.estimate, canAccept: check.passes, reason: check.reason, funding: check.funding.find(x => x.id === t.id) }; }); }
