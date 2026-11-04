import { qualifies, marketAccess } from './context.mjs';
import { totalDebt } from './guarantee.mjs';
import { members, participates, portion } from './ownership.mjs';
import { cashEvent, decisionEvent } from './debrief.mjs';
import { crewUse } from './management.mjs';
import { specialtyRequirements } from './specialization.mjs';
const round = n => Math.round(n * 100) / 100;
export function requirements(p, specialized = false) { if (p.modelVersion === 2)
    return p.requirements; if (specialized)
    return specialtyRequirements(p); const s = Number(p.catalogId?.split('-')[1]); if ([1].includes(s))
    return { safety: 1, compliance: 1, insurance: 1 }; if (s === 0)
    return { compliance: 1, insurance: 1 }; if (s === 3)
    return { safety: 1, compliance: 1 }; if (s === 2)
    return { compliance: 1 }; if ([4, 5].includes(s))
    return { safety: 1 }; if ([6, 7].includes(s))
    return { safety: 1, insurance: 1 }; if (s === 9)
    return { compliance: 2, insurance: 1 }; return {}; }
export function eligible(p, t, r) { if (!qualifies(p, t) || !marketAccess(p, t))
    return false; const meets = req => Object.entries(req || {}).every(([k, n]) => (t.levels[k] || 0) >= n), e = p.entryRules; if (!meets(p.requirements))
    return false; if (!e)
    return true; return (!e.anyOf?.length || e.anyOf.some(meets)) && (t.completedProjects || 0) >= (e.completed || 0) && t.cash - totalDebt(t) >= (e.netCash || 0) && (!r || crewUse(r, t) + (p.crewSlots || 1) <= 1 + t.levels.crew); }
export function prepareCompliance(p, t) { p.compliance = { closeout: false, safetyCycle: 0, modelVersion: t.modelVersion || 1, safety: (t.levels.safety || 0) >= (t.modelVersion === 2 ? 6 : 2), documents: (t.levels.compliance || 0) >= (t.modelVersion === 2 ? 6 : 2), safetyLevel: t.levels.safety || 0, documentLevel: t.levels.compliance || 0, insurance: t.levels.insurance || 0, events: [] }; }
export function checklist(r, t, a) { const p = r.projects.find(p => p.id === a.project); if (!p || !participates(p, t.id) || !['building', 'done'].includes(p.state) || !p.compliance)
    throw Error('没有可操作的本公司在建项目'); const k = a.kind; if (!['safety', 'documents', ...(p.contextVersion ? ['closeout'] : [])].includes(k))
    throw Error('无效检查项目'); if (k === 'closeout') {
    if (100 * (1 - p.remaining / p.total) < 95)
        throw Error('95%进度后提交收尾资料 / Closeout opens at 95%');
    p.compliance.closeout = true;
    return;
} if (p.state !== 'building')
    throw Error('项目已结束'); if (p.compliance[k])
    throw Error('该检查已处理'); const level = k === 'safety' ? p.compliance.safetyLevel : p.compliance.documentLevel, price = p.compliance.modelVersion === 2 ? (level >= 4 ? 1 : level >= 2 ? 1.5 : 2) : level >= 1 ? 1 : 2; const ts = members(p).map(m => r.teams.find(t => t.id === m.id)); if (ts.some(t => t.cash < portion(p, t.id, price)))
    throw Error('现金不足'); for (const t of ts) {
    const amount = portion(p, t.id, price);
    t.cash = round(t.cash - amount);
    t.profit = round(t.profit - amount);
    cashEvent(r, t, -amount, 'compliance', { project: p.id, kind: k });
} p.compliance[k] = true; }
export function riskGate(p, remaining) { if (!p.compliance)
    return remaining; for (const [k, at] of [['safety', p.contextVersion && p.compliance.safetyCycle ? 65 : 25], ['documents', 55]])
    if (!p.compliance[k])
        remaining = Math.max(remaining, p.total * (1 - at / 100)); return remaining; }
export function triggerRisk(r, p, t) { const c = p.compliance; if (!c)
    return; const progress = 100 * (1 - p.remaining / p.total); if (p.contextVersion && progress >= 40 && !c.safetyCycle) {
    c.safetyCycle = 1;
    c.safety = c.safetyLevel >= 6;
} if (p.contextVersion && progress >= 65 && !c.siteReviewed) {
    c.siteReviewed = true;
    const fatigue = Math.max(...members(p).map(m => r.teams.find(x => x.id === m.id).fatigue));
    if (fatigue >= 70) {
        p.holdUntil = Math.max(p.holdUntil || 0, r.time + 6);
        c.events.push({ kind: 'site_review', time: r.time, cost: 0 });
        for (const m of members(p))
            decisionEvent(r, r.teams.find(x => x.id === m.id), 'site_review', { project: p.id }, 'system');
    }
} for (const [k, at] of [['safety', p.contextVersion && c.safetyCycle ? 65 : 25], ['documents', 55]]) {
    if (c[k] || progress + 1e-7 < at)
        continue;
    c[k] = true;
    let cost;
    if (k === 'safety') {
        cost = round(2 + p.cost * .06 * (1 - c.insurance * (c.modelVersion === 2 ? .1 : .3)));
        p.holdUntil = r.time + 12;
    }
    else {
        cost = 3;
        p.receiptDelay = 18;
        for (const x of p.receipts)
            if (!x.received && x.due !== null)
                x.due += 18;
    }
    c.events.push({ kind: k, time: r.time, cost });
    for (const m of members(p)) {
        const t = r.teams.find(t => t.id === m.id), share = portion(p, t.id, cost);
        t.cash = round(t.cash - share);
        t.profit = round(t.profit - share);
        t.riskCosts = round((t.riskCosts || 0) + share);
        t.incidents = (t.incidents || 0) + 1;
        cashEvent(r, t, -share, 'compliance_incident', { project: p.id, kind: k });
        decisionEvent(r, t, 'compliance_incident', { project: p.id, kind: k, cost: share }, 'system');
    }
} }
