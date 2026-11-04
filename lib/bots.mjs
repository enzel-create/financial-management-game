import { participates } from './ownership.mjs';
import { fundingReview, fundingReviewEnabled } from './funding-review.mjs';
// Bots receive the same serialized view as a player: never sealed bids, future
// project order, hidden funding limits, or unrevealed material shocks.
import { SPECIALTY_KEYS, chosenSpecialties, getUpgrades, UPGRADES } from './upgrades.mjs';
function hashValue(text) { let n = 2166136261; for (const c of text) {
    n = Math.imul(n ^ c.charCodeAt(0), 16777619);
} n ^= n >>> 16; n = Math.imul(n, 0x85ebca6b); n ^= n >>> 13; return n >>> 0; }
function fundingNeed(p, price) { const events = (p.plannedCosts || []).map((x, i, a) => ({ at: x.at * p.estimate.duration / 100, amount: x.amount + (i === a.length - 1 ? p.estimate.base * .2 : 0), cost: true })); for (const x of p.receiptSchedule || [])
    events.push({ at: x.at * p.estimate.duration / 100 + x.delay, amount: -price * x.share / 100, cost: false }); events.sort((a, b) => a.at - b.at || Number(b.cost) - Number(a.cost)); let used = 4, peak = 4; for (const x of events) {
    used += x.amount;
    peak = Math.max(peak, used);
} return peak; }
export function botDecision(s, skill) {
    skill *= 10;
    const specs = getUpgrades(s), t = s.me, time = s.time, high = skill / 100;
    if (!t || t.bankrupt || s.phase !== 'running')
        return null;
    // Level zero is an explicit simulation failure demonstration, not a forecast.
    if (skill === 0 && time >= 180)
        return { type: 'bankrupt' };
    const cadence = 2 + Math.floor((100 - skill) / 8);
    if (time % cadence)
        return null;
    const own = s.projects.filter(p => participates(p, t.id) && p.state === 'building');
    if (skill >= 30) {
        const p = s.projects.find(p => participates(p, t.id) && p.contextVersion && ['building', 'done'].includes(p.state) && p.retainageRate && !p.compliance?.closeout && 100 * (1 - p.remaining / p.total) >= 95);
        if (p)
            return { type: 'compliance', project: p.id, kind: 'closeout' };
    }
    const cash = t.cash, obligations = own.reduce((n, p) => n + Math.max(0, (p.cost || 0) * 1.2 - (p.paidCost || 0)), 0), reserve = 15 + high * 20 + (t.managementRate || 0) * 2;
    if ((t.distressSeconds > 0 || cash < 0) && t.debt < 80)
        return { type: 'loan' };
    for (const p of own) {
        const c = p.compliance;
        if (!c)
            continue;
        for (const k of ['safety', 'documents'])
            if (!c[k] && cash >= 2 && skill >= 30 && time % Math.max(2, Math.floor((110 - skill) / 2)) < cadence)
                return { type: 'compliance', project: p.id, kind: k };
    }
    for (const p of s.projects.filter(p => p.state === 'open'))
        for (const o of p.myJointOffers || [])
            if (o.partner === t.id) {
                if (o.canAccept && o.amount >= o.estimate.base * (skill >= 50 ? 1.2 : .95))
                    return { type: 'joint_accept', project: p.id, offer: o.id };
                if (!o.canAccept || p.closes - time < 15)
                    return { type: 'joint_cancel', project: p.id, offer: o.id };
            }
    const bids = s.projects.filter(p => p.state === 'open' && p.myBid != null);
    if (bids.length >= (s.balanceVersion ? Math.max(1, 1 + t.levels.crew - own.length) : 1))
        return null;
    let multiplier = s.balanceVersion ? 1.18 + high * .16 : .75 + high * .59;
    if (skill >= 80) {
        const observed = s.projects.flatMap(x => (x.offers || []).filter(o => o.name !== t.name).map(o => o.amount / x.estimate.base)).filter(n => n >= .9 && n <= 2);
        multiplier = observed.length ? Math.max(s.balanceVersion ? 1.30 : 1.16, Math.min(1.38, ...observed.map(n => n - .02))) : 1.34;
    }
    const lastAward = Math.max(0, ...s.projects.filter(p => participates(p, t.id)).map(p => p.started || 0));
    if (s.balanceVersion && skill >= 50 && time - lastAward > 90)
        multiplier = Math.max(1.10, multiplier - Math.min(.23, (time - lastAward) / 900));
    const quote = p => { const hash = hashValue(t.id + ':' + p.id); const error = ((hash % 201) / 1000 - .1) * (s.balanceVersion ? 1 : 1 - high); const floor = s.balanceVersion && skill >= 50 ? p.estimate.base * (1.10 + .08 * (1 - (t.levels.quality || 0) * .08)) + 4 + (t.managementRate || 0) * p.estimate.duration / 60 : 1; return Math.max(Math.ceil(floor), Math.ceil(p.estimate.base * (1 + Math.max(0, p.newsImpact?.cost || 0)) * (multiplier + error))); };
    const choices = s.projects.filter(p => p.state === 'open' && p.myBid == null && !p.myJointOffers?.length && p.eligible && (!fundingReviewEnabled(s) || fundingReview(s, t, p, quote(p), p.estimate).passes) && p.closes > time && p.closes + p.estimate.duration < s.duration && (t.crewUsed ?? own.length) + (p.crewSlots || 1) <= 1 + t.levels.crew && t.restUntil <= time && cash >= p.estimate.initial && (s.balanceVersion ? cash - obligations > reserve : cash - obligations >= (skill >= 80 ? fundingNeed(p, quote(p)) : p.estimate.base * (.2 + high) + 4) + reserve * high));
    const preference = p => hashValue(t.id + p.id) % 1000;
    choices.sort((a, b) => s.balanceVersion ? preference(a) - preference(b) : a.estimate.base - b.estimate.base || a.id.localeCompare(b.id));
    if (choices.length) {
        const p = choices[0];
        return { type: 'bid', project: p.id, amount: quote(p) };
    }
    if (s.jointVersion && skill >= 40 && !s.projects.some(p => p.myJointOffers?.length)) {
        const p = s.projects.find(p => p.state === 'open' && p.myBid == null && (p.crossSpecialty || !p.eligible) && p.closes - time > 25 && p.closes + p.estimate.duration < s.duration);
        const partner = s.teams.filter(x => x.id !== t.id && !x.bankrupt && x.bot)[(time + Math.floor(high * 10)) % Math.max(1, s.teams.filter(x => x.id !== t.id && !x.bankrupt && x.bot).length)];
        if (p && partner && cash > 50)
            return { type: 'joint_propose', project: p.id, partner: partner.id, amount: Math.ceil(p.estimate.base * 1.32), share: 50 };
    }
    if (t.debt >= 40 && cash - obligations > reserve + 40 && skill >= 60)
        return { type: 'repay' };
    if (t.training.length)
        return null;
    if (s.balanceVersion && skill >= 10 && t.profit < -25)
        return null;
    if (s.balanceVersion && skill >= 50 && t.profit < 12)
        return null;
    if (t.fatigue > 55 && cash - obligations > reserve + 12 && time + 45 < s.duration)
        return { type: 'welfare' };
    if (time > s.duration - 100) {
        if (t.welfare < 12 && t.profit - 12 >= t.revenue * .18 && cash - obligations > reserve + 12 && time + 45 < s.duration)
            return { type: 'welfare' };
        return null;
    }
    // Grow without committing the capital needed for existing jobs.
    const tracks = chosenSpecialties(t), preferred = SPECIALTY_KEYS[[...t.id].reduce((n, c) => n + c.charCodeAt(0), 0) % 5];
    if (s.specialtyVersion && t.revenue > 0 && skill >= 30 && time > s.duration * .12) {
        const kind = tracks[0] || preferred, level = t.levels[kind] || 0, u = specs[kind];
        if (level < u.max && time > (level ? s.duration * .35 : 0) && cash - obligations - u.price * (level + 1) >= reserve + 25 && (!s.balanceVersion || t.profit - u.price * (level + 1) >= 10) && time + u.time < s.duration)
            return { type: 'upgrade', kind };
    }
    let order = skill >= 50 ? ['cost', 'safety', 'compliance', 'insurance', 'speed', 'crew'] : ['crew', 'speed', 'insurance', 'cost', 'safety', 'compliance'];
    if (s.modelVersion === 2) {
        const needs = s.projects.filter(p => p.state === 'open' && (!p.specialty || tracks.includes(p.specialty))).flatMap(p => Object.keys(p.requirements || {}));
        order = [...new Set([...needs, 'coordination', 'talent', 'quality', 'procurement', 'technology', ...order])].filter(k => !SPECIALTY_KEYS.includes(k));
    }
    const invested = Object.values(t.levels).reduce((a, b) => a + b, 0);
    if (skill >= 50 && t.revenue === 0 && invested >= 1)
        return null;
    const prices = { cost: 25, safety: 18, compliance: 18, insurance: 22, speed: 25, crew: 40 };
    for (const kind of order) {
        const level = t.levels[kind] || 0, max = specs[kind].max;
        if (level >= max)
            continue;
        // Diversify completed capabilities before purchasing additional levels.
        if (level > Math.min(...order.map(k => t.levels[k] || 0)))
            continue;
        const price = specs[kind].price * (level + 1);
        if (skill >= 70 && t.revenue > 0 && t.profit - price < t.revenue * .18)
            continue;
        if (cash - obligations - price >= reserve * (.2 + high) && time + 100 < s.duration)
            return { type: 'upgrade', kind };
    }
    return null;
}
