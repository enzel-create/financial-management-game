import { decisionEvent } from './debrief.mjs';
import { isSpecialty, chosenSpecialties, getUpgrades, UPGRADES } from './upgrades.mjs';
export function editPlan(r, t, a) {
    if (r.preparationVersion === 2 && (!['planning', 'running', 'paused'].includes(r.phase) || (r.phase === 'planning' && t.planningReady)))
        throw Error('请在战略规划阶段取消确认后调整');
    if (!['lobby', 'planning', 'running', 'paused'].includes(r.phase))
        throw Error('战略规划已关闭');
    t.plan ??= [];
    t.planReserve ??= 20;
    if (a.type === 'plan_reserve') {
        const n = Number(a.value);
        if (!Number.isSafeInteger(n) || n < 0 || n > 1000000)
            throw Error('现金储备金额无效');
        t.planReserve = n;
        return;
    }
    const task = t.plan.find(x => x.id === a.id);
    if (a.type === 'plan_cancel') {
        if (!task || task.status !== 'pending')
            throw Error('仅可修改未执行的任务');
        task.status = 'cancelled';
        return;
    }
    if (a.type === 'plan_move') {
        if (!task || task.status !== 'pending')
            throw Error('仅可修改未执行的任务');
        const pending = t.plan.filter(x => x.status === 'pending'), i = pending.indexOf(task), other = pending[i + (a.direction === -1 ? -1 : 1)];
        if (other) {
            const x = t.plan.indexOf(task), y = t.plan.indexOf(other);
            [t.plan[x], t.plan[y]] = [t.plan[y], t.plan[x]];
        }
        return;
    }
    if (!['plan_add', 'plan_edit'].includes(a.type))
        throw Error('未知规划操作');
    if (a.type === 'plan_edit' && (!task || task.status !== 'pending'))
        throw Error('仅可修改未执行的任务');
    const at = Number(a.at), kind = a.kind;
    if (!Number.isSafeInteger(at) || at < 0 || at >= r.duration || !['rest', 'welfare', ...Object.keys(getUpgrades(r))].includes(kind))
        throw Error('任务或执行时间无效');
    if (a.type === 'plan_add') {
        if (t.plan.filter(x => ['pending', 'running'].includes(x.status)).length >= 8)
            throw Error('最多安排8项待执行或进行中的任务');
        if (t.plan.length >= 100)
            throw Error('规划记录已满');
        t.plan.push({ id: crypto.randomUUID(), kind, at, status: 'pending' });
    }
    else
        Object.assign(task, { kind, at, reason: '' });
}
function advancePlan(r, t, execute) {
    t.plan ??= [];
    for (const task of t.plan.filter(x => x.status === 'running'))
        if (task.end <= r.time)
            task.status = 'done';
    if (t.plan.some(x => x.status === 'running'))
        return;
    const task = t.plan.find(x => x.status === 'pending');
    if (!task)
        return;
    if (task.at > r.time) {
        task.reason = '等待预定执行时间';
        return;
    }
    const u = getUpgrades(r)[task.kind], price = u ? u.price * ((t.levels[task.kind] || 0) + 1) : task.kind === 'welfare' ? 12 : 0;
    if (u && (t.levels[task.kind] || 0) >= u.max) {
        task.status = 'skipped';
        task.reason = '已达到最高等级';
        return;
    }
    if (isSpecialty(task.kind) && !chosenSpecialties(t).includes(task.kind) && chosenSpecialties(t).length >= 2) {
        task.status = 'skipped';
        task.reason = '每家公司最多发展两个专业方向';
        return;
    }
    if (r.time + (u?.time || 45) >= r.duration) {
        task.status = 'skipped';
        task.reason = '剩余经营时间不足';
        return;
    }
    if (t.cash - price < (t.planReserve ?? 20)) {
        task.reason = '等待现金满足储备要求';
        return;
    }
    try {
        execute(r, t.key, { type: u ? 'upgrade' : task.kind, kind: task.kind, round: r.round });
        task.status = 'running';
        task.startedAt = r.time;
        task.reason = '';
        task.end = r.time + (u?.time || 45);
    }
    catch (e) {
        task.reason = e.message;
    }
}
export function runPlan(r, t, execute) { const before = new Map((t.plan || []).map(x => [x.id, JSON.stringify([x.status, x.reason, x.end])])); advancePlan(r, t, execute); for (const task of t.plan || [])
    if (before.get(task.id) !== JSON.stringify([task.status, task.reason, task.end]))
        decisionEvent(r, t, 'plan_status', { task }, 'plan'); }
