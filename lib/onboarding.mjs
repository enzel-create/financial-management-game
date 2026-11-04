import { memberForKey, allMembersReady } from './team-play.mjs';
export const GUIDE_STEPS = 10;
export const guideSteps = r => GUIDE_STEPS;
export function onboardingAction(r, t, host, a, actor = t?.key) {
    if (r.onboardingVersion !== 1)
        return false;
    if (!['guide_step', 'lobby_ready'].includes(a.type))
        return false;
    const person = host ? r : memberForKey(t, actor), field = host ? 'hostGuideStep' : 'guideStep';
    if (!person)
        throw Error('访问凭证无效，请重新加入');
    if (a.type === 'guide_step') {
        const step = Number(a.step), current = person[field] || 0;
        if (!Number.isInteger(step) || step < 1 || step > guideSteps(r) || step > current + 1)
            throw Error('请按顺序完成新手指引');
        person[field] = Math.max(current, step);
        return true;
    }
    if (r.phase !== 'lobby')
        throw Error('入场准备阶段已结束');
    if (host)
        throw Error('主持人完成指引后等待公司准备');
    if (a.ready !== false && (person.guideStep || 0) < guideSteps(r))
        throw Error('请先完整阅读新手指引 / Complete your guide first');
    person.memberReady = a.ready !== false;
    t.lobbyReady = allMembersReady(t, guideSteps(r));
    return true;
}
export const lobbyCanStart = r => r.teams.length >= 2 && (r.onboardingVersion !== 1 || r.teams.every(t => t.bot || allMembersReady(t, guideSteps(r))));
