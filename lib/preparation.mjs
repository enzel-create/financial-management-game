import { UPGRADES, isSpecialty, chosenSpecialties, SPECIALTY_KEYS, getUpgrades } from './upgrades.mjs';
import { configureCompany, designBonus, designComplete, DESIGN_GROUPS } from './company-design.mjs';
import { decisionEvent, sampleReview } from './debrief.mjs';
export const INITIAL_POINTS = 8;
export const pointCost = kind => isSpecialty(kind) ? 2 : 1;
const allReady = (r, key) => r.teams.length > 0 && r.teams.every(t => t[key]);
function countdown(r, stage, now) { r.phase = stage + '_countdown'; r.countdownEndsAt = now + 5000; if (stage === 'setup')
    for (const t of r.teams) {
        if (r.modelVersion === 2 && !designComplete(t)) {
            const wasReady = t.setupReady;
            t.setupReady = false;
            const phase = r.phase;
            r.phase = 'setup';
            for (const [group, g] of Object.entries(DESIGN_GROUPS))
                if (!t.companyDesign?.[group]) {
                    let applied = false;
                    for (const choice of Object.keys(g.options)) {
                        try {
                            configureCompany(r, t, { group, choice }, 'system');
                            applied = true;
                            break;
                        }
                        catch { }
                    }
                    if (!applied)
                        throw Error('公司配置无法完成');
                }
            r.phase = phase;
            t.setupReady = wasReady;
        }
        t.initialConfiguration = { total: INITIAL_POINTS, unused: t.setupPoints, levels: { ...t.levels }, design: { ...t.companyDesign } };
        decisionEvent(r, t, 'setup_locked', { configuration: t.initialConfiguration }, 'system');
    } }
export function preparationAction(r, t, a, now, source = 'manual') {
    if (!t || r.preparationVersion !== 2)
        throw Error('当前不可配置初始能力');
    if (a.type === 'ready') {
        if (!['setup', 'planning'].includes(r.phase))
            throw Error('当前准备阶段已结束');
        if (r.phase === 'setup' && r.modelVersion === 2 && a.ready !== false && !designComplete(t))
            throw Error('请先完成四类公司方案选择');
        const key = r.phase === 'setup' ? 'setupReady' : 'planningReady';
        t[key] = a.ready !== false;
        decisionEvent(r, t, 'ready', { ready: t[key], stage: r.phase }, source);
        if (allReady(r, key))
            countdown(r, r.phase, now);
        return;
    }
    if (r.phase !== 'setup' || t.setupReady)
        throw Error('请在能力配置阶段取消确认后调整');
    const specs = getUpgrades(r), u = Object.hasOwn(specs, a.kind) ? specs[a.kind] : null;
    if (!u || !['setup_upgrade', 'setup_refund'].includes(a.type))
        throw Error('无效能力配置');
    const level = t.levels[a.kind] || 0, cost = pointCost(a.kind);
    if (a.type === 'setup_upgrade') {
        if (level >= u.max)
            throw Error('已达到最高等级');
        if (t.setupPoints < cost)
            throw Error('能力点不足');
        if (isSpecialty(a.kind) && !chosenSpecialties(t).includes(a.kind) && chosenSpecialties(t).length >= 2)
            throw Error('每家公司最多发展两个专业方向');
        t.levels[a.kind] = level + 1;
        t.setupPoints -= cost;
    }
    else {
        if (level <= (r.modelVersion === 2 ? (designBonus(t.companyDesign)[a.kind] || 0) : 0))
            throw Error('没有可撤回的能力等级');
        t.levels[a.kind] = level - 1;
        t.setupPoints += cost;
    }
    decisionEvent(r, t, a.type, { kind: a.kind, level: t.levels[a.kind], points: t.setupPoints }, source);
    sampleReview(r, t, true);
}
export function startPreparation(r, now) {
    r.phase = 'setup';
    r.setupEndsAt = now + 300000;
    r.last = now;
    for (const t of r.teams) {
        t.setupPoints ??= INITIAL_POINTS;
        t.setupReady = false;
        t.planningReady = false;
    }
    for (const t of r.teams.filter(t => t.bot)) {
        if (r.modelVersion === 2) {
            let n = [...t.id].reduce((s, c) => s + c.charCodeAt(0), 0);
            for (const [group, g] of Object.entries(DESIGN_GROUPS)) {
                const keys = Object.keys(g.options);
                configureCompany(r, t, { group, choice: keys[n % keys.length] }, 'bot');
                n = Math.floor(n / 3) + t.skill;
            }
        }
        const index = [...t.id].reduce((n, c) => n + c.charCodeAt(0), 0) % SPECIALTY_KEYS.length, track = SPECIALTY_KEYS[index];
        const choices = t.skill === 0 ? ['crew', 'crew', 'speed', 'speed', 'speed', 'insurance', 'insurance', 'safety'] : t.skill >= 7 ? (r.balanceVersion ? [track, track, 'cost', 'cost', 'cost', 'cost'] : [track, track, 'cost', 'cost', 'safety', 'compliance']) : t.skill >= 4 ? [track, 'cost', 'speed', 'crew', 'safety', 'compliance', 'insurance'] : ['crew', 'speed', 'speed', 'insurance', 'safety', 'compliance', 'cost', 'cost'];
        for (const kind of choices) {
            try {
                preparationAction(r, t, { type: 'setup_upgrade', kind }, now, 'bot');
            }
            catch { }
        }
        preparationAction(r, t, { type: 'ready' }, now, 'bot');
    }
}
// Catch up across wall-clock preparation stages without spending any trading seconds.
export function advancePreparation(r, now) {
    for (let i = 0; i < 5; i++) {
        if (r.phase === 'setup') {
            if (now < r.setupEndsAt)
                return null;
            countdown(r, 'setup', r.setupEndsAt);
            continue;
        }
        if (r.phase === 'setup_countdown') {
            if (now < r.countdownEndsAt)
                return null;
            const at = r.countdownEndsAt;
            r.phase = 'planning';
            r.planningEndsAt = at + 300000;
            for (const t of r.teams)
                t.planningReady = !!t.bot;
            if (allReady(r, 'planningReady'))
                countdown(r, 'planning', at);
            continue;
        }
        if (r.phase === 'planning') {
            if (now < r.planningEndsAt)
                return null;
            countdown(r, 'planning', r.planningEndsAt);
            continue;
        }
        if (r.phase === 'planning_countdown') {
            return now >= r.countdownEndsAt ? r.countdownEndsAt : null;
        }
        return null;
    }
    return null;
}
