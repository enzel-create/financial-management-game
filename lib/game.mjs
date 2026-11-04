import { initInstitutions, institutionAction, tickInstitutions, settleInstitutions, exitInstitutions, bindBonds, assignEquipment, closeInstitutionsProject, equipmentSpeed, institutionsView, suretyQuote } from './institutions.mjs';
import { openFinancialBooks, saveOperatingBudget, saveBidBudget, lockProjectBudget, financialReport, sampleFinancials } from './financial-reporting.mjs';
import { teamForKey, memberForKey, publicMembers, allMembersGuided, allMembersReady, normalizeCompanyName, companyNameKey } from './team-play.mjs';
import { profitPosition, freezeSettlement } from './score-settlement.mjs';
import { RULESET, BASE_QUALIFICATIONS, projectContext, accounting, selectionScore, riskSummary } from './context.mjs';
import { updateTeamContinuity } from './team-continuity.mjs';
import { accrueInformation, settleInformation, changeInformation } from './information-support.mjs';
import { buyGuarantee, canFund, totalDebt, repayGuarantee } from './guarantee.mjs';
import { bidWindow, bidComplexity } from './bid-window.mjs';
import { drawTier } from './market-mix.mjs';
import { advanceNews, newsView, newsEffect, newsInterval } from './market-news.mjs';
import { jointAction, jointView, bidFor, evaluateOffer, jointEnabled } from './joint-bids.mjs';
import { slotsFor, members, participates, portion, paidFor, receivedFor } from './ownership.mjs';
import { fundingReview, fundingReviewEnabled } from './funding-review.mjs';
import { staggered, startWave, advanceWave } from './waves.mjs';
import { accrueInterest, settleInterest, interestBase } from './interest.mjs';
import { catalogFor, EXPANDED_CATALOG } from './catalog-expanded.mjs';
import { configureCompany } from './company-design.mjs';
import { onboardingAction, lobbyCanStart, GUIDE_STEPS, guideSteps } from './onboarding.mjs';
import { accrueManagement, settleManagement, managementRate, crewUse } from './management.mjs';
import { startPreparation, advancePreparation, preparationAction, INITIAL_POINTS } from './preparation.mjs';
import { initReview, sampleReview, cashEvent, decisionEvent, recordAction, finishReview, debriefView, DECISION_TYPES } from './debrief.mjs';
import { availableIndices, releaseStage, nextUnlock } from './release-phases.mjs';
import { botDecision } from './bots.mjs';
import { shortage, endCompany } from './bankruptcy.mjs';
import { editPlan, runPlan } from './strategy.mjs';
import { requirements, eligible, prepareCompliance, checklist } from './compliance.mjs';
import { initialCost, preparePayments, payStage, collectReceipts, advanceProject, sampleLiquidity, financeScores, cashPosition, allocate } from './cashflow.mjs';
import { CATALOG, shuffledPool, randomInt } from './catalog.mjs';
export { CATALOG } from './catalog.mjs';
import { isSpecialty, chosenSpecialties, getUpgrades, UPGRADES } from './upgrades.mjs';
export { UPGRADES } from './upgrades.mjs';
const LEGACY_CATALOG = [['社区诊所', 60, 92, 100], ['校园翻新', 85, 125, 125], ['物流仓库', 100, 150, 145], ['城市公寓', 130, 190, 165], ['河畔办公楼', 150, 220, 180], ['绿色图书馆', 110, 165, 150], ['交通枢纽', 180, 260, 210], ['社区体育馆', 140, 205, 170]];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round = x => Math.round(x * 100) / 100;
export function newRoom(code, host, minutes = 18, gameMode = 'full') { if(gameMode!=='full')throw Error('Unsupported game mode'); const room = { code, host, gameMode: 'full', institutionsVersion: 1, financeVersion: 1, contextVersion: 1, scoringVersion: 2, modules: { news: true, joint: true, credit: true, manualCompliance: true }, ruleset: RULESET, newsVersion: 1, newsScheduleVersion: 2, news: [], nextNews: newsInterval(), marketMixVersion: 1, balanceVersion: 1, jointVersion: 1, fundingVersion: 1, waveVersion: 2, waveDue: [], interestVersion: 1, modelVersion: 2, onboardingVersion: 1, hostGuideStep: 0, round: 1, preparationVersion: 2, specialtyVersion: 1, reviewVersion: 1, releaseVersion: 1, bankruptcyVersion: 1, riskVersion: 1, economicsVersion: 2, phase: 'lobby', duration: minutes * 60, time: 0, last: 0, teams: [], projects: [], logs: [], counter: 0, pool: shuffledPool(300), catalogVersion: 4, procurementVersion: 3, nextWave: 0, auto: true, processed: [], revision: 0 }; initInstitutions(room);return room; }
export function log(r, text) { r.logs.unshift({ time: r.time, text }); r.logs = r.logs.slice(0, 80); }
export function addTeam(r, id, key, name) { if (r.phase !== 'lobby')
    throw Error('比赛已开始，暂不接受新公司'); if (r.teams.length >= 12)
    throw Error('房间最多 12 家公司'); if (r.teams.some(t => t.name === name))
    throw Error('公司名已被使用'); r.teams.push({ id, key, name, memberName: '成员1', memberReady: false, collaborators: [], actionRevision: 0, qualifications: r.contextVersion ? { ...BASE_QUALIFICATIONS } : undefined, balanceVersion: r.balanceVersion || 0, modelVersion: r.modelVersion || 1, companyDesign: {}, guideStep: 0, lobbyReady: false, completedProjects: 0, setupPoints: INITIAL_POINTS, setupReady: false, planningReady: false, cash: 160, revenue: 0, profit: 0, debt: 0, fatigue: 10, fatigueSum: 0, samples: 0, welfare: 0, overtimeCount: 0, plan: [], planReserve: 20, levels: Object.fromEntries(Object.keys(getUpgrades(r)).map(k => [k, 0])), training: [], restUntil: 0, mode: 'normal' }); ; initReview(r, r.teams.at(-1)); log(r, name + ' 加入市场'); }
export function joinCompany(r, id, key, name, memberName = '') {
    name = normalizeCompanyName(name);
    memberName = normalizeCompanyName(memberName);
    if (!name || name.length > 16 || memberName.length > 16)
        throw Error('公司名与昵称最多16字 / Company name and nickname: max 16 characters');
    const already = teamForKey(r, key);
    if (already) {
        if (companyNameKey(already.name) !== companyNameKey(name))
            throw Error('此设备已属于另一家公司 / Device already belongs to another company');
        return already;
    }
    const t = r.teams.find(t => companyNameKey(t.name) === companyNameKey(name));
    if (!t) {
        addTeam(r, id, key, name);
        const fresh = r.teams.at(-1);
        fresh.memberName = memberName || '成员1';
        fresh.collaborators = [];
        fresh.actionRevision = 0;
        return fresh;
    }
    if (t.bot)
        throw Error('机器人公司不接受成员，请使用你们的公司名 / Bot companies cannot be joined');
    t.collaborators ??= [];
    if (t.collaborators.length >= 19)
        throw Error('同一公司最多20台成员设备 / Maximum 20 member devices per company');
    t.collaborators.push({ id, key, name: memberName || '成员' + (t.collaborators.length + 2), guideStep: 0 });
    t.actionRevision = (t.actionRevision || 0) + 1;
    if (r.phase === 'lobby')
        t.lobbyReady = false;
    return t;
}
export function release(r, count = 1) {
    ;
    if (r.time > r.duration - 240)
        throw Error('最后 4 分钟停止发布项目，进入收尾');
    const catalog = catalogFor(r), modern = Array.isArray(r.pool), available = modern ? availableIndices(r, catalogFor(r)) : [];
    const take = modern ? Math.min(count, available.length) : count;
    for (let i = 0; i < take; i++) {
        let ix = r.counter++, item;
        if (modern) {
            let chosen = available[i];
            if (r.balanceVersion) {
                const remaining = available.filter(ix => r.pool.includes(ix)), roll = randomInt(100), stage = releaseStage(r), tier = r.marketMixVersion ? drawTier(stage, roll) : stage === 0 ? 0 : roll < 65 ? 0 : roll < 85 ? Math.min(stage, 1) : stage;
                const group = remaining.filter(ix => catalog[ix].releaseTier === tier);
                const candidates = group.length ? group : remaining;
                chosen = candidates[randomInt(candidates.length)];
            }
            r.pool.splice(r.pool.indexOf(chosen), 1);
            item = catalog[chosen];
        }
        else {
            const old = LEGACY_CATALOG[ix % LEGACY_CATALOG.length];
            item = { name: old[0], base: old[1], ceiling: old[2], duration: old[3] };
        }
        if (r.contextVersion)
            item = projectContext(item);
        const projectRequirements = r.riskVersion ? requirements(item, r.specialtyVersion === 1) : item.requirements;
        const window = bidWindow({ ...item, requirements: projectRequirements });
        const demand = 1 + newsEffect(r, item, 'demand');
        const procurement = r.procurementVersion === 3 ? { procurementVersion: 3, governmentEstimate: Math.round(item.base * demand * (1.15 + randomInt(21) / 100)), fundingLimit: Math.round(item.base * demand * (1.35 + randomInt(31) / 100)) } : {};
        r.projects.push({ ...item, ...procurement, ...(r.riskVersion ? { requirements: projectRequirements } : {}), paymentVersion: r.economicsVersion === 2 ? 2 : 1, id: 'p' + ix, name: item.name + ' #' + (ix + 1), bidWindow: window, bidComplexity: bidComplexity({ ...item, requirements: projectRequirements }), closes: r.time + window, state: 'open', bids: {}, shock: randomInt(3) * (r.balanceVersion ? .04 : .1) });
    }
    if (!take && modern && r.pool.length)
        log(r, '本阶段项目已发完，等待下一阶段解锁。');
    if (take)
        log(r, `市场随机发布 ${take} 个项目；竞标时间按需求复杂度为30–120秒`);
    if (modern && !r.pool.length) {
        r.auto = false;
        if (take)
            log(r, `${catalog.length} 个项目已全部发布，项目池已耗尽。`);
    }
    return take;
}
export function active(r, t) { return r.projects.filter(p => participates(p, t.id) && p.state === 'building').sort((a, b) => a.started - b.started || a.id.localeCompare(b.id)); }
export function estimate(p, t) { const fine = t.modelVersion === 2; let base = round(p.base * (1 - t.levels.cost * (fine ? .035 : .07) - (fine ? (t.levels.procurement || 0) * .01 : 0)) * (t.fatigue >= 70 ? 1.10 : 1)); let duration = Math.ceil(p.duration * (1 - t.levels.speed * (fine ? .05 : .1) - (fine ? (t.levels.technology || 0) * .01 : 0)) * (t.mode === 'overtime' ? .75 : 1)); return { base, duration, initial: initialCost(p, base) }; }
function closeProject(r, p) {
    p.openedAt = r.time;
    p.review = {};
    p.jointOffers = [];
    const offers = Object.entries(p.bids).map(([id, b]) => ({ id, ...b })).sort((a, b) => a.amount - b.amount || a.tie - b.tie);
    const evaluate = b => { const result = evaluateOffer(r, p, b.id, b); if (p.procurementVersion === 3 && b.amount > p.fundingLimit)
        return { ...result, passes: false, reason: '未授标：模拟可用资金不足（非超过政府估算自动废标）' }; return result; };
    const qualified = offers.filter(b => evaluate(b).passes);
    if (p.selection === 'best-value') {
        const min = Math.min(...qualified.map(b => b.amount));
        for (const b of offers)
            b.selectionScore = qualified.includes(b) ? selectionScore(p, evaluate(b).team, b.amount, min) : -1;
        offers.sort((a, b) => b.selectionScore - a.selectionScore || a.tie - b.tie);
        p.selectionScores = Object.fromEntries(offers.map(b => [b.id, b.selectionScore]));
    }
    const drawKey = b => p.selection === 'best-value' ? b.selectionScore : b.amount;
    const ordered = offers.filter(b => qualified.includes(b));
    p.tieDraw = Array.from(new Set(ordered.map(drawKey))).map(amount => ({ amount, basis: p.selection === 'best-value' ? 'score' : 'price', entries: ordered.filter(b => drawKey(b) === amount).map((b, i) => ({ id: b.id, rank: i + 1 })) })).filter(g => g.entries.length > 1);
    for (const b of offers) {
        const result = evaluate(b);
        if (!result.passes) {
            p.review[b.id] = result.reason;
            continue;
        }
        if (p.owner) {
            p.review[b.id] = p.selection === 'best-value' ? '未授标：综合得分排序或同分抽签落后 / Lower best-value score or tie draw' : '未授标：价格排序或同等资格抽签落后';
            continue;
        }
        const t = result.team, e = result.estimate;
        p.review[b.id] = p.selection === 'best-value' ? '授标：经营综合评分最高（同分抽签） / Highest simulation best-value score' : '授标：通过经营审核的最低报价（同价同资格抽签）';
        p.owner = b.id;
        if (b.joint)
            p.joint = structuredClone(b.joint);
        p.price = b.amount;
        bindBonds(r, p);
        p.state = 'building';
        assignEquipment(r, p);
        p.qualityLevel = t.levels.quality || 0;
        p.procurementLevel = t.levels.procurement || 0;
        if (t.modelVersion === 2) {
            if (p.contextVersion) {
                p.materialShock = p.shock * .75 * (1 - p.procurementLevel * .08);
                p.reworkShock = p.shock * .25 * (1 - p.qualityLevel * .08);
                p.shock = p.materialShock + p.reworkShock;
            }
            else
                p.shock *= 1 - p.qualityLevel * .08;
        }
        p.price = b.amount;
        p.cost = e.base;
        p.remaining = e.duration;
        p.total = e.duration;
        p.started = r.time;
        lockProjectBudget(r, p);
        p.overtime = t.mode === 'overtime';
        if (r.riskVersion)
            prepareCompliance(p, t);
        if (p.paymentVersion === 2) {
            preparePayments(p);
            payStage(r, p, t, 0);
        }
        else {
            t.cash = round(t.cash - e.base);
        }
        if (p.overtime)
            for (const member of result.teams)
                member.overtimeCount++;
        log(r, `${t.name} 以 ${b.amount} 中标 ${p.name}`);
    }
    if (!p.owner) {
        p.state = 'unsold';
        p.reason = offers.length ? '未授标：未找到资金可覆盖且通过经营履约检查的报价' : '未授标：无报价';
        log(r, p.name + ' ' + p.reason);
    }
}
function finish(r, p) { p.extra = round(p.cost * p.shock); p.earned = round(p.price - (p.paymentVersion === 2 ? p.paidCost : p.cost + p.extra)); for (const m of members(p)) {
    const t = r.teams.find(t => t.id === m.id), revenue = p.joint ? p.receipts.reduce((n, x) => n + portion(p, t.id, x.amount), 0) : p.price, cost = p.paymentVersion === 2 ? paidFor(p, t.id) : p.cost + p.extra;
    if (p.paymentVersion !== 2)
        t.cash = round(t.cash + p.price - p.extra);
    t.revenue = round(t.revenue + revenue);
    t.profit = round(t.profit + revenue - cost);
    t.completedProjects = (t.completedProjects || 0) + 1;
    if (r.contextVersion) {
        t.trackRecord ??= {};
        t.trackRecord[p.specialty] = (t.trackRecord[p.specialty] || 0) + 1;
    }
} p.state = 'done'; p.finished = r.time; closeInstitutionsProject(r, p); log(r, `${members(p).map(m => r.teams.find(t => t.id === m.id).name).join(' + ')} 完成 ${p.name}：收入 ${p.price}，项目利润 ${p.earned}，成本冲击 +${Math.round(p.shock * 100)}%`); }
function beginTrading(r, now) { initInstitutions(r); for (const t of r.teams) {
    openFinancialBooks(r, t);
    sampleFinancials(r, t, true);
} r.phase = 'running'; r.last = now; r.nextWave = 90; ; if (r.releaseVersion !== 1 && r.riskVersion && r.pool?.length) {
    const index = r.pool.findIndex(i => Object.keys(requirements(CATALOG[i])).length === 0);
    if (index > 0)
        [r.pool[0], r.pool[index]] = [r.pool[index], r.pool[0]];
} if (staggered(r)) {
    if (r.auto) {
        startWave(r);
        advanceWave(r, release);
    }
    else
        release(r, 1);
}
else
    release(r, Math.max(2, Math.ceil(r.teams.length * .75))); rememberPeaks(r); }
export function tick(r, now = Date.now()) {
    ;
    if (r.preparationVersion === 2 && ['setup', 'setup_countdown', 'planning', 'planning_countdown'].includes(r.phase)) {
        const startAt = advancePreparation(r, now);
        if (startAt !== null)
            beginTrading(r, startAt);
        else
            return;
    }
    if (r.phase === 'planning') {
        if (now < r.planningEndsAt)
            return;
        beginTrading(r, r.planningEndsAt);
    }
    if (r.phase !== 'running') {
        r.last = now;
        return;
    }
    let steps = Math.min(1800, Math.max(0, Math.floor((now - r.last) / 1000)));
    for (let n = 0; n < steps; n++) {
        r.time++;
        if (r.modules?.news !== false)
            advanceNews(r);
        collectReceipts(r);
        tickInstitutions(r);
        for (let t of r.teams) {
            if (t.bankrupt)
                continue;
            accrueInterest(r, t);
            accrueManagement(r, t);
            accrueInformation(r, t);
            for (let u of t.training.filter(u => u.end <= r.time)) {
                if (u.kind === 'welfare') {
                    t.fatigue = Math.max(0, t.fatigue - 25);
                    t.welfare = Math.min(12, t.welfare + 4);
                    decisionEvent(r, t, 'welfare_complete', {}, 'system');
                    log(r, t.name + ' 福利计划生效：疲劳 −25');
                }
                else {
                    t.levels[u.kind]++;
                    decisionEvent(r, t, 'upgrade_complete', { kind: u.kind, level: t.levels[u.kind] }, 'system');
                    log(r, t.name + ' ' + getUpgrades(r)[u.kind].name + ' 升级完成');
                }
            }
            t.training = t.training.filter(u => u.end > r.time);
            if (t.bot) {
                const decision = (botDecision)(view(r, t.key), t.skill);
                if (decision) {
                    try {
                        action(r, t.key, { ...decision, round: r.round }, Date.now(), 'bot');
                    }
                    catch { /* A pending operation may have consumed capacity; retry next decision tick. */ }
                }
                if (t.bankrupt)
                    continue;
            }
            else if (r.riskVersion)
                runPlan(r, t, (room, key, a) => action(room, key, a, Date.now(), 'plan'));
            let jobs = active(r, t);
            let working = jobs.filter(p => !p.blocked && !(p.holdUntil > r.time));
            let delta = working.length ? working.reduce((x, p) => x + (p.overtime ? .20 : .11) * (p.joint ? members(p).find(m => m.id === t.id).share / 100 : 1), 0) / (1 + t.levels.crew) : t.restUntil > r.time ? -.45 : -.13;
            if (t.modelVersion === 2 && delta > 0)
                delta *= 1 - (t.levels.talent || 0) * .05;
            ;
            t.fatigue = clamp(t.fatigue + delta, 0, 100);
            if (r.contextVersion)
                updateTeamContinuity(r, t, working.length);
            t.fatigueSum += t.fatigue;
            t.samples++;
            for (let p of jobs) {
                if (p.owner !== t.id || p.holdUntil > r.time)
                    continue;
                if (p.paymentVersion === 2) {
                    if (advanceProject(r, p, t, equipmentSpeed(r, p) * (members(p).some(m => r.teams.find(x => x.id === m.id).fatigue >= 70) ? .8 : 1) * (members(p).some(m => (r.teams.find(x => x.id === m.id).staffGapUntil || 0) > r.time) ? .85 : 1)))
                        finish(r, p);
                }
                else {
                    p.remaining -= t.fatigue >= 70 ? .8 : 1;
                    if (p.remaining <= 0)
                        finish(r, p);
                }
            }
        }
        for (let p of r.projects.filter(p => p.state === 'open' && p.closes <= r.time))
            closeProject(r, p);
        if (staggered(r))
            advanceWave(r, release);
        else if (r.auto && r.time >= r.nextWave && r.time <= r.duration - 240) {
            release(r, Math.max(2, Math.ceil(r.teams.length * .75)));
            r.nextWave = r.releaseVersion === 1 && !availableIndices(r, catalogFor(r)).length && nextUnlock(r) !== null ? nextUnlock(r) : r.time + 90;
        }
        if (r.economicsVersion === 2)
            for (const t of r.teams)
                if (!t.bankrupt)
                    sampleLiquidity(r, t);
        if (r.bankruptcyVersion) {
            rememberPeaks(r);
            for (const t of r.teams) {
                if (t.bankrupt)
                    continue;
                t.distressSeconds = shortage(r, t) ? (t.distressSeconds || 0) + 1 : 0;
                if (t.distressSeconds >= 60)
                    exitCompany(r, t, '持续缺款60秒');
            }
        }
        for (const t of r.teams) {
            sampleReview(r, t);
            if (!t.bankrupt)
                sampleFinancials(r, t);
        }
        if (r.time >= r.duration) {
            for (const t of r.teams)
                if (!t.bankrupt) {
                    settleInterest(r, t);
                    settleManagement(r, t);
                    settleInformation(r, t);
                    settleInstitutions(r, t);
                }
            r.phase = 'finished';
            for (const t of r.teams) {
                ;
                freezeSettlement(r, t);
                finishReview(r, t);
            }
            for (let p of r.projects.filter(p => p.state === 'open')) {
                p.state = 'unsold';
                p.cancelled = true;
                p.reason = '比赛结束，未开标取消；报价不公开';
            }
            log(r, '经营期结束。在建盈利不计分；预计亏损扣减计分利润，现金与账面已实现利润单列。');
            break;
        }
    }
    r.last += steps * 1000;
    if (r.phase === 'finished')
        r.last = now;
}
export function rating(t) { return round(clamp(90 - ((100 - (t.teamStability ?? 100)) * .15) - (t.samples ? t.fatigueSum / t.samples : 10) * .65 + t.welfare - t.overtimeCount * 2, 0, 100)); }
function currentRanking(r, dimension = 'performance') { let max = Math.max(1, ...r.teams.map(t => t.revenue)); return r.teams.map(t => { const settlement = profitPosition(r, t), profit = settlement.scoredProfit; let margin = t.revenue ? profit / t.revenue : 0; let employee = rating(t), f = financeScores(r, t); let performance = round(r.balanceVersion ? 50 * clamp(t.revenue / (r.duration / 60 * 12), 0, 1) + 50 * clamp(margin / .25, 0, 1) : .5 * t.revenue / max * 100 + .5 * clamp(margin / .3, 0, 1) * 100), health = round(.35 * f.growth + .35 * f.cashScore + .3 * employee); let score = r.economicsVersion === 2 ? (dimension === 'health' ? health : performance) : round(.4 * t.revenue / max * 100 + .4 * clamp(margin / .3, 0, 1) * 100 + .2 * employee); return { id: t.id, name: t.name, revenue: t.revenue, profit, ...settlement, capitalReturn: round(profit / (t.initialCash || 160) * 100), capitalTurnover: round(t.revenue / (t.initialCash || 160)), margin: round(margin * 100), employee, score, performance, health, ...f, cash: t.cash, debt: totalDebt(t), fatigue: round(t.fatigue) }; }).sort((a, b) => b.score - a.score || (dimension === 'health' ? b.cashScore - a.cashScore : b.profit - a.profit) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)); }
function exitCompany(r, t, reason) { endCompany(r, t, reason); exitInstitutions(r, t); freezeSettlement(r, t); t.exitScores = Object.fromEntries(['performance', 'health'].map(d => [d, currentRanking(r, d).find(row => row.id === t.id)])); }
export function rememberPeaks(r) { if (!r.bankruptcyVersion)
    return; for (const dimension of ['performance', 'health'])
    for (const row of currentRanking(r, dimension)) {
        const t = r.teams.find(t => t.id === row.id);
        if (t.bankrupt)
            continue;
        t.peaks ??= {};
        if (!t.peaks[dimension] || row.score > t.peaks[dimension].score)
            t.peaks[dimension] = { ...row, peakAt: r.time };
    } }
export function ranking(r, dimension = 'performance') { return currentRanking(r, dimension).map(row => { const t = r.teams.find(t => t.id === row.id), peak = t.peaks?.[dimension]; return { ...(t.bankrupt && t.exitScores?.[dimension] ? t.exitScores[dimension] : row), peakScore: peak?.score, peakAt: peak?.peakAt, bankrupt: !!t.bankrupt, bankruptAt: t.bankruptAt, bot: !!t.bot, skill: t.bot ? t.skill : undefined, historical: false }; }).sort((a, b) => b.score - a.score || (dimension === 'health' ? b.cashScore - a.cashScore : b.profit - a.profit) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)); }
export function action(r, actor, a, now = Date.now(), source = 'manual') {
    const t = teamForKey(r, actor), before = t?.cash, beforeEvents = t?.review?.decisions.length || 0;
    const member = memberForKey(t, actor);
    if (source === 'manual' && t && !['guide_step', 'lobby_ready'].includes(a.type) && a.teamRevision != null && a.teamRevision !== (t.actionRevision || 0))
        throw Error('队友已更新公司，请查看最新数据后重试 / A teammate updated the company. Review the latest state and retry.');
    if (t?.review && a.type.startsWith('plan_') && t.review.decisions.filter(x => x.type.startsWith('plan_') && x.type !== 'plan_status').length >= 200)
        throw Error('本局战略修改已达200次上限');
    const result = performAction(r, actor, a, now);
    if (t && r.teams.includes(t))
        recordAction(r, t, a, before, source);
    if (a.type === 'end')
        for (const x of r.teams) {
            if (!x.bankrupt) {
                settleInterest(r, x);
                settleManagement(r, x);
                settleInformation(r, x);
                settleInstitutions(r, x);
                ;
            }
            freezeSettlement(r, x);
            finishReview(r, x);
        }
    ;
    if (t && source === 'manual' && a.type !== 'guide_step') {
        t.actionRevision = (t.actionRevision || 0) + 1;
        t.lastTeamAction = { member: member === t ? (t.memberName || '成员1') : member?.name, type: a.type, time: r.time };
        for (const event of (t.review?.decisions || []).slice(beforeEvents)) {
            event.memberId = member === t ? t.id : member?.id;
            event.memberName = t.lastTeamAction.member;
        }
    }
    return result;
}
function performAction(r, actor, a, now = Date.now()) {
    let host = actor === r.host, t = teamForKey(r, actor);
    if (!host && !t)
        throw Error('访问凭证无效，请重新加入');
    if ((a.round ?? 1) !== (r.round || 1))
        throw Error('比赛已进入新一局，请等待页面同步后重试');
    if (onboardingAction(r, t, host, a, actor))
        return;
    if (['add_bot', 'edit_bot', 'remove_bot'].includes(a.type)) {
        if (!host || r.phase !== 'lobby')
            throw Error('仅主持人可在候场时设置机器人');
        if (a.type === 'remove_bot') {
            const bot = r.teams.find(x => x.id === a.id && x.bot);
            if (!bot)
                throw Error('机器人不存在');
            r.teams = r.teams.filter(x => x.id !== bot.id);
            return;
        }
        const skill = Number(a.skill);
        if (!Number.isInteger(skill) || skill < 0 || skill > 10)
            throw Error('决策能力须为0至10的整数');
        if (a.type === 'edit_bot') {
            const bot = r.teams.find(x => x.id === a.id && x.bot);
            if (!bot)
                throw Error('机器人不存在');
            bot.skill = skill;
            return;
        }
        let n = 1;
        while (r.teams.some(x => x.name === 'BOT ' + n))
            n++;
        addTeam(r, crypto.randomUUID(), crypto.randomUUID(), 'BOT ' + n);
        Object.assign(r.teams.at(-1), { bot: true, skill, guideStep: GUIDE_STEPS, lobbyReady: true });
        return;
    }
    if (t?.collaborators?.some(m => m.key === actor && (m.guideStep || 0) < guideSteps(r)))
        throw Error('请先完整阅读新手指引 / Complete the guide first');
    if (t?.bankrupt)
        throw Error('公司已破产，本局仅可观战');
    if (a.type === 'restart') {
        if (!host)
            throw Error('仅主持人可重新开始');
        if (r.phase !== 'finished')
            throw Error('请等待本局结束');
        const fresh = newRoom(r.code, r.host, r.duration / 60, r.gameMode);
        fresh.modules = r.modules;
        ;
        {
            fresh.newsVersion = r.modules?.news === false ? 0 : 1;
            fresh.jointVersion = r.modules?.joint === false ? 0 : 1;
        }
        fresh.round = (r.round || 1) + 1;
        fresh.auto = r.auto;
        fresh.processed = r.processed;
        for (const team of r.teams) {
            addTeam(fresh, team.id, team.key, team.name);
            Object.assign(fresh.teams.at(-1), { memberName: team.memberName || '成员1', collaborators: (team.collaborators || []).map(m => ({ ...m, roles: [], guideStep: 0, memberReady: false })), actionRevision: 0 });
            if (team.bot)
                Object.assign(fresh.teams.at(-1), { bot: true, skill: team.skill, guideStep: GUIDE_STEPS, lobbyReady: true });
        }
        fresh.logs = [];
        log(fresh, `第 ${fresh.round} 局已准备，公司状态已重置，等待主持人开始。`);
        Object.assign(r, fresh);
        return;
    }
    if (a.type === 'start') {
        if (!host || r.phase !== 'lobby')
            throw Error('仅主持人能开始未开始的比赛');
        if (r.teams.length < 2)
            throw Error('至少需要两家公司');
        if (!lobbyCanStart(r))
            throw Error('请先完成指引并等待所有公司准备好');
        ;
        if (!Array.isArray(r.pool)) {
            r.pool = shuffledPool();
            r.catalogVersion = 2;
        }
        r.specialtyVersion = 1;
        r.reviewVersion = 1;
        for (const t of r.teams)
            initReview(r, t, true);
        r.releaseVersion = 1;
        r.procurementVersion = 3;
        r.economicsVersion = 2;
        r.riskVersion = 1;
        r.bankruptcyVersion = 1;
        for (const t of r.teams)
            for (const k of Object.keys(getUpgrades(r)))
                t.levels[k] ??= 0;
        if (r.preparationVersion !== 1) {
            r.preparationVersion = 2;
            startPreparation(r, now);
        }
        else {
            r.phase = 'planning';
            r.planningEndsAt = now + 120000;
            r.last = now;
        }
        return;
    }
    if (['pause', 'resume', 'release', 'auto', 'end'].includes(a.type)) {
        if (!host)
            throw Error('仅主持人可操作');
        if (a.type === 'pause' && r.phase === 'running') {
            r.phase = 'paused';
            return;
        }
        if (a.type === 'resume' && r.phase === 'paused') {
            r.phase = 'running';
            r.last = now;
            return;
        }
        if (a.type === 'release' && r.phase === 'running') {
            if (Array.isArray(r.pool) && !r.pool.length)
                throw Error('项目池已耗尽');
            release(r, a.count === 2 ? 2 : 1);
            return;
        }
        if (a.type === 'auto' && ['running', 'paused', 'lobby', 'setup', 'setup_countdown', 'planning', 'planning_countdown'].includes(r.phase)) {
            if (!r.auto && Array.isArray(r.pool) && !r.pool.length)
                throw Error('项目池已耗尽');
            r.auto = !r.auto;
            if (staggered(r) && !r.auto)
                r.waveDue = [];
            return;
        }
        if (a.type === 'end' && ['running', 'paused'].includes(r.phase)) {
            r.phase = 'finished';
            for (let p of r.projects.filter(p => p.state === 'open')) {
                p.state = 'unsold';
                p.cancelled = true;
                p.reason = '比赛结束，未开标取消；报价不公开';
            }
            log(r, '主持人结束比赛；在建项目不计收入，预计亏损扣减计分利润。');
            return;
        }
        throw Error('当前状态不能执行此操作');
    }
    if (a.type === 'finance_budget') {
        saveOperatingBudget(r, t, a.budget);
        decisionEvent(r, t, 'finance_budget', { budget: t.operatingBudget }, 'manual');
        return;
    }
    ;
    if (a.type === 'company_design') {
        configureCompany(r, t, a);
        return;
    }
    if (['ready', 'setup_upgrade', 'setup_refund'].includes(a.type)) {
        preparationAction(r, t, a, now);
        return;
    }
    if (a.type.startsWith('plan_')) {
        if (!t || !r.riskVersion)
            throw Error('当前不可安排战略计划');
        editPlan(r, t, a);
        return;
    }
    if (a.type === 'information_support') {
        if (r.modules?.news === false)
            throw Error('本局未启用市场新闻 / Market news is disabled');
        changeInformation(r, t, a);
        return;
    }
    if (!t || r.phase !== 'running')
        throw Error('请等待比赛开始或恢复');
    if (institutionAction(r, t, a))
        return;
    if (r.institutionsVersion && ['loan', 'repay', 'guarantee_buy'].includes(a.type))
        throw Error('请使用银行面板的风险报价 / Use the bank risk quote');
    if (a.type === 'guarantee_buy') {
        if (r.modules?.credit === false)
            throw Error('本局未启用项目授信');
        const p = r.projects.find(p => p.id === a.project);
        if (!p)
            throw Error('项目不存在');
        buyGuarantee(r, t, p, estimate(p, t).base, a.provider);
        return;
    }
    if (a.type === 'guarantee_repay') {
        const p = r.projects.find(p => p.id === a.project);
        if (!p)
            throw Error('项目不存在');
        repayGuarantee(r, t, p, t.cash);
        return;
    }
    if (a.type === 'bankrupt') {
        if (!r.bankruptcyVersion)
            throw Error('此局未启用破产规则');
        rememberPeaks(r);
        exitCompany(r, t, '主动宣告破产');
        return;
    }
    if (a.type.startsWith('joint_')) {
        jointAction(r, t, a);
        return;
    }
    if (a.type === 'compliance') {
        checklist(r, t, a);
        return;
    }
    if (a.type === 'bid') {
        let p = r.projects.find(p => p.id === a.project);
        if (!p || p.state !== 'open')
            throw Error('竞标已截止');
        if (bidFor(p, t.id)?.[1]?.joint || p.jointOffers?.some(o => o.lead === t.id || o.partner === t.id))
            throw Error('请先撤回该项目的报价或联合邀请');
        if (!eligible(p, t, r))
            throw Error('未满足项目准入要求');
        if (t.restUntil > r.time)
            throw Error('休息期间不能投标');
        if (crewUse(r, t) + (p.crewSlots || 1) > 1 + t.levels.crew)
            throw Error('施工队伍已满');
        let value = Number(a.amount), e = estimate(p, t);
        if (!Number.isSafeInteger(value) || value < 1 || value > 1000000)
            throw Error('请输入 1–1,000,000 的整数金额（系统输入范围，并非业主限价）');
        if (p.procurementVersion !== 3 && (value < Math.ceil(p.base * .85) || value > p.ceiling))
            throw Error('旧版项目报价超出原有区间');
        ;
        if (!canFund(t, p, e.initial))
            throw Error('现金不足以承担开工成本');
        if (fundingReviewEnabled(r) && !fundingReview(r, t, p, value, e).passes)
            throw Error('全周期履约资金不足，请提高报价或补足现金');
        saveBidBudget(r, p, { id: t.id, amount: value }, e);
        p.bids[t.id] = { amount: value, tie: crypto.getRandomValues(new Uint32Array(1))[0] };
        return;
    }
    if (a.type === 'withdraw') {
        let p = r.projects.find(p => p.id === a.project);
        if (!p || p.state !== 'open')
            throw Error('已截止');
        const entry = bidFor(p, t.id);
        if (entry) {
            for (const m of entry[1].joint?.members || [])
                decisionEvent(r, r.teams.find(t => t.id === m.id), 'joint_withdraw', { project: p.id });
            delete p.bids[entry[0]];
        }
        return;
    }
    if (a.type === 'upgrade') {
        if (isSpecialty(a.kind)) {
            if (!r.specialtyVersion)
                throw Error('下一局启用专业路线');
            const chosen = chosenSpecialties(t);
            if (!chosen.includes(a.kind) && chosen.length >= 2)
                throw Error('每家公司最多发展两个专业方向');
        }
        const specs = getUpgrades(r);
        let u = Object.hasOwn(specs, a.kind) ? specs[a.kind] : null;
        if (!u || (!r.riskVersion && ['safety', 'compliance', 'insurance'].includes(a.kind)) || t.levels[a.kind] >= u.max)
            throw Error('已达到最高等级');
        if (t.training.some(x => x.kind === a.kind))
            throw Error('该升级正在进行');
        let price = u.price * (t.levels[a.kind] + 1);
        if (t.cash < price)
            throw Error('现金不足');
        if (r.time + u.time >= r.duration)
            throw Error('剩余时间不足以完成升级');
        t.cash = round(t.cash - price);
        t.profit = round(t.profit - price);
        t.training.push({ kind: a.kind, end: r.time + u.time });
        log(r, t.name + ' 投资 ' + u.name + '，支出 ' + price);
        return;
    }
    if (a.type === 'welfare') {
        if (t.training.some(x => x.kind === 'welfare'))
            throw Error('福利计划执行中');
        if (t.cash < 12 || r.time + 45 >= r.duration)
            throw Error('资金或剩余时间不足');
        t.cash = round(t.cash - 12);
        t.profit = round(t.profit - 12);
        t.training.push({ kind: 'welfare', end: r.time + 45 });
        return;
    }
    if (a.type === 'rest') {
        if (active(r, t).length || r.projects.some(p => p.state === 'open' && bidFor(p, t.id)))
            throw Error('请先完成施工并撤回报价');
        if (t.restUntil > r.time)
            throw Error('正在休息');
        t.restUntil = r.time + 45;
        return;
    }
    if (a.type === 'mode') {
        if (!['normal', 'overtime'].includes(a.mode))
            throw Error('无效模式');
        t.mode = a.mode;
        return;
    }
    if (a.type === 'loan') {
        if (t.debt >= 80)
            throw Error('借款上限为 80');
        const fee = 4;
        t.cash = round(t.cash + 40 - fee);
        t.debt += 40;
        t.profit = round(t.profit - fee);
        log(r, t.name + ' 借款 40，融资费 / fee ' + fee);
        return;
    }
    if (a.type === 'repay') {
        const amount = 40;
        if (amount <= 0 || t.debt < amount || t.cash < amount)
            throw Error('现金或借款余额不足 / Insufficient cash or debt');
        t.cash = round(t.cash - amount);
        t.debt = round(t.debt - amount);
        return;
    }
    throw Error('未知操作');
}
export function magnitude(value) { if (value < 2.5)
    return '少于 2.5 万'; if (value < 10)
    return '2.5–10 万'; if (value < 25)
    return '10–25 万'; if (value < 50)
    return '25–50 万'; if (value < 100)
    return '50–100 万'; if (value < 500)
    return '100–500 万'; if (value < 1000)
    return '500–1,000 万'; return '超过 1,000 万'; }
export function view(r, key) {
    let host = key === r.host, t = teamForKey(r, key);
    if (!host && !t)
        throw Error('房间凭证无效');
    return { institutions: institutionsView(r, t), ...(host ? { participants: r.teams.map(x => { const v = view(r, x.key); return { company: v.me, projects: v.projects.filter(p => participates(p, x.id) || p.myBid != null || p.myJointOffers?.length), cashEvents: (x.review?.cash || []).slice(-100) }; }) } : {}), ...newsView(r), financeVersion: r.financeVersion || 0, scoringVersion: 2, modules: r.modules, gameMode: r.gameMode || 'full', contextVersion: r.contextVersion || 0, ruleset: r.ruleset || "legacy", marketMixVersion: r.marketMixVersion || 0, code: r.code, round: r.round || 1, phase: r.phase, jointVersion: jointEnabled(r) ? 1 : 0, fundingVersion: fundingReviewEnabled(r) ? 1 : 0, balanceVersion: r.balanceVersion || 0, waveVersion: r.waveVersion || 0, interestVersion: r.interestVersion || 0, modelVersion: r.modelVersion || 1, onboardingVersion: r.onboardingVersion || 0, guideSteps: guideSteps(r), guideStep: host ? (r.hostGuideStep || 0) : (memberForKey(t, key)?.guideStep || 0), canStart: lobbyCanStart(r), preparationVersion: r.preparationVersion || 1, setupEndsAt: r.setupEndsAt, countdownEndsAt: r.countdownEndsAt, debrief: debriefView(r), reviewVersion: r.reviewVersion || 0, specialtyVersion: r.specialtyVersion || 0, releaseVersion: r.releaseVersion || 0, marketStage: r.releaseVersion === 1 ? releaseStage(r) : null, nextUnlockAt: r.releaseVersion === 1 ? nextUnlock(r) : null, releaseAvailable: Array.isArray(r.pool) ? availableIndices(r, catalogFor(r)).length : null, bankruptcyVersion: r.bankruptcyVersion || 0, riskVersion: r.riskVersion || 0, planningEndsAt: r.planningEndsAt, serverNow: Date.now(), economicsVersion: r.economicsVersion || 1, duration: r.duration, time: r.time, auto: r.auto, procurementVersion: r.procurementVersion || 1, catalogVersion: r.catalogVersion || 1, poolRemaining: Array.isArray(r.pool) ? r.pool.length : null, poolTotal: Array.isArray(r.pool) ? (catalogFor(r).length) : null, host, me: t ? { ...t, financials: financialReport(r, t), ...accounting(r, t), ...riskSummary(r, t), ...profitPosition(r, t), totalDebt: totalDebt(t), ...cashPosition(r, t), crewUsed: crewUse(r, t), managementRate: managementRate(t), interestBase: interestBase(r, t), key: undefined, roles: undefined, collaborators: undefined, lobbyReady: allMembersReady(t, guideSteps(r)), memberReady: publicMembers(t, guideSteps(r)).find(m => m.id === (key === t.key ? t.id : memberForKey(t, key)?.id))?.ready, memberRoles: memberForKey(t, key)?.roles || [], memberId: key === t.key ? t.id : memberForKey(t, key)?.id, memberName: key === t.key ? (t.memberName || '成员1') : memberForKey(t, key)?.name, members: publicMembers(t, guideSteps(r)), allMembersGuided: allMembersGuided(t, guideSteps(r)), review: undefined, fatigueSum: undefined, samples: undefined, fatigue: round(t.fatigue), employee: rating(t) } : null, teams: r.teams.map(x => ({ id: x.id, name: x.name, memberCount: 1 + (x.collaborators?.length || 0), readyCount: x.bot ? 1 : publicMembers(x, guideSteps(r)).filter(m => m.ready).length, guideComplete: allMembersGuided(x, guideSteps(r)), lobbyReady: allMembersReady(x, guideSteps(r)), setupReady: !!x.setupReady, planningReady: !!x.planningReady, bot: !!x.bot, skill: x.bot ? x.skill : undefined, bankrupt: !!x.bankrupt })), rank: ranking(r), healthRank: r.economicsVersion === 2 ? ranking(r, 'health') : [], projects: r.projects.map(p => {
            let { selectionScores, materialShock, reworkShock, bids, tieDraw, shock, ceiling, governmentEstimate, fundingLimit, base, cost, review, costPayments, receipts, paidCost, received, extra, compliance, qualityLevel, jointOffers, newsCostDelta, ...safe } = p;
            const opened = !p.cancelled && p.state !== 'open';
            const own = participates(p, t?.id), ownBid = t ? bidFor(p, t.id) : null;
            const offerName = id => { const bid = bids[id]; return (bid?.joint?.members || [{ id }]).map(m => r.teams.find(t => t.id === m.id)?.name).join(' + '); };
            return { ...safe, surety: t && p.state === 'open' ? suretyQuote(r, t, p, p.bids[t.id]?.amount || Math.ceil(p.base * 1.3)) : null, materialShock: p.state === 'done' ? materialShock : undefined, reworkShock: p.state === 'done' ? reworkShock : undefined, jointOnly: false, crossSpecialty: !!(p.crossSpecialty || p.jointOnly), newsImpact: t && (t.informationSupport) && !t.bankrupt ? { cost: newsEffect(r, p, 'cost'), receipt: newsEffect(r, p, 'receipt'), speed: newsEffect(r, p, 'speed') } : undefined, myJointOffers: jointView(r, p, t), myJointBid: ownBid?.[1]?.joint ? { amount: ownBid[1].amount, joint: ownBid[1].joint, estimate: ownBid[1].estimate, lead: ownBid[0] } : null, newsCostDelta: own ? newsCostDelta : undefined, myShare: own ? members(p).find(m => m.id === t.id)?.share : undefined, qualityLevel: own ? qualityLevel : undefined, tieDraw: opened ? tieDraw?.map(g => ({ ...g, entries: g.entries.map(e => ({ name: offerName(e.id), rank: e.rank, awarded: e.id === p.owner })) })) : undefined, compliance: own ? compliance : undefined, eligible: t ? eligible(p, t, r) : true, extra: own && p.shockRevealed ? extra : undefined, paidCost: own ? paidCost : undefined, received: own ? received : undefined, costPayments: own ? costPayments : undefined, receipts: own ? receipts : undefined, plannedCosts: t && p.state === 'open' && p.paymentVersion === 2 ? allocate(estimate(p, t).base, p.costSchedule) : undefined, magnitude: magnitude(governmentEstimate ?? ceiling), base: undefined, cost: own ? cost : undefined, legacyMin: p.procurementVersion === 3 ? undefined : Math.ceil(base * .85), legacyMax: p.procurementVersion === 3 ? undefined : ceiling, shock: p.state === 'done' ? shock : undefined, bidCount: opened ? Object.keys(bids).length : undefined, myBid: ownBid?.[1]?.amount ?? null, estimate: t ? estimate(p, t) : null, offers: opened ? Object.entries(bids).map(([id, b]) => ({ name: offerName(id), amount: b.amount, selectionScore: selectionScores?.[id], result: review?.[id] || '旧版开标记录' })) : undefined };
        }), logs: r.logs };
}
