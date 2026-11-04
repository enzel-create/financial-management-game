import assert from 'node:assert/strict';
import { newRoom as originalRoom, addTeam, action, tick, view, release, estimate } from '../lib/game.mjs';
import { DESIGN_GROUPS, designBonus, configureCompany, designComplete } from '../lib/company-design.mjs';
import { EXPANDED_CATALOG } from '../lib/catalog-expanded.mjs';
import { ADVANCED_UPGRADES } from '../lib/upgrades.mjs';
import { eligible } from '../lib/compliance.mjs';
import { availableIndices } from '../lib/release-phases.mjs';
import { managementRate, accrueManagement, settleManagement } from '../lib/management.mjs';
import { interestBase, accrueInterest, settleInterest } from '../lib/interest.mjs';
import { translate } from '../lib/i18n.mjs';
const room = () => { let r = newRoom('TEST', 'h', 15); r.balanceVersion = 0; r.catalogVersion = 3; r.pool = r.pool.filter(i => i < 200); addTeam(r, 'a', 'ka', 'A'); addTeam(r, 'b', 'kb', 'B'); return r; };
const guide = (r, key) => { for (let step = 1; step <= 10; step++)
    action(r, key, { type: 'guide_step', step, round: r.round }); };
const ready = (r) => { guide(r, 'h'); for (const t of r.teams) {
    guide(r, t.key);
    action(r, t.key, { type: 'lobby_ready', round: r.round });
} };
let r = room();
assert.throws(() => action(r, 'ka', { type: 'lobby_ready' }));
assert.throws(() => action(r, 'h', { type: 'start' }));
assert.throws(() => action(r, 'ka', { type: 'guide_step', step: 10 }));
guide(r, 'ka');
assert.equal(view(JSON.parse(JSON.stringify(r)), 'ka').guideStep, 10);
action(r, 'ka', { type: 'lobby_ready' });
guide(r, 'h');
assert(!view(r, 'h').canStart);
guide(r, 'kb');
action(r, 'kb', { type: 'lobby_ready' });
assert(view(r, 'h').canStart);
addTeam(r, 'c', 'kc', 'C');
assert(!view(r, 'h').canStart);
guide(r, 'kc');
action(r, 'kc', { type: 'lobby_ready' });
action(r, 'h', { type: 'start' }, 0);
assert.equal(r.phase, 'setup');
assert.throws(() => action(r, 'ka', { type: 'ready' }));
const t = r.teams[0];
for (const group of Object.keys(DESIGN_GROUPS))
    configureCompany(r, t, { group, choice: Object.keys(DESIGN_GROUPS[group].options)[0] });
assert(designComplete(t));
assert.equal(Object.values(designBonus(t.companyDesign)).reduce((a, b) => a + b, 0), 16);
action(r, 'ka', { type: 'setup_upgrade', kind: 'technology' });
const points = t.setupPoints;
configureCompany(r, t, { group: 'structure', choice: 'matrix' });
assert.equal(t.setupPoints, points);
assert.equal(t.levels.technology, 2);
action(r, 'ka', { type: 'setup_refund', kind: 'technology' });
assert.throws(() => action(r, 'ka', { type: 'setup_refund', kind: 'technology' }));
assert.equal(t.cash, 160);
// Every foundation combination is feasible, even before allocating free points.
for (const a of Object.keys(DESIGN_GROUPS.structure.options))
    for (const b of Object.keys(DESIGN_GROUPS.philosophy.options))
        for (const c of Object.keys(DESIGN_GROUPS.resources.options))
            for (const d of Object.keys(DESIGN_GROUPS.delivery.options)) {
                const bonus = designBonus({ structure: a, philosophy: b, resources: c, delivery: d });
                for (const [k, n] of Object.entries(bonus))
                    assert(n <= ADVANCED_UPGRADES[k].max);
            }
// Timeouts fill missing profiles without spending cash, then retain both 5s transitions.
tick(r, 300000);
assert.equal(r.phase, 'setup_countdown');
assert(r.teams.every(designComplete));
assert(r.teams.every(t => t.cash === 160));
tick(r, 610000);
assert.equal(r.phase, 'running');
assert.equal(r.time, 0);
assert.equal(EXPANDED_CATALOG.length, 200);
assert.equal(new Set(EXPANDED_CATALOG.map(p => p.catalogId)).size, 200);
assert.equal(new Set(EXPANDED_CATALOG.map(p => p.name)).size, 200);
for (const p of EXPANDED_CATALOG) {
    assert(!/[\u4e00-\u9fff]/.test(translate(p.name, 'en')), p.name);
    for (const list of [p.costSchedule, p.receiptSchedule]) {
        assert.equal(list.reduce((n, x) => n + x.share, 0), 100);
        assert(list.every((x, i) => i === 0 || x.at > list[i - 1].at));
    }
    assert.equal(p.costSchedule[0].at, 0);
    assert.equal(p.costSchedule.at(-1).at, 100);
}
for (const [time, count] of [[0, 50], [180, 100], [360, 150], [540, 200]]) {
    const q = room();
    q.time = time;
    assert.equal(availableIndices(q, EXPANDED_CATALOG).length, count);
}
const q = room(), u = q.teams[0], p = structuredClone(EXPANDED_CATALOG.find(p => p.entryRules.completed && p.crewSlots === 2));
p.state = 'open';
p.id = 'test';
u.levels = Object.fromEntries(Object.keys(ADVANCED_UPGRADES).map(k => [k, 6]));
u.levels.crew = 4;
assert(!eligible(p, u, q));
u.completedProjects = 1;
assert(eligible(p, u, q));
u.debt = 160;
assert(!eligible(p, u, q));
u.debt = 0;
for (const path of p.entryRules.anyOf)
    for (const k of Object.keys(path))
        u.levels[k] = 0;
assert(!eligible(p, u, q));
Object.assign(u.levels, p.requirements, p.entryRules.anyOf[0]);
assert(eligible(p, u, q));
u.levels.crew = 0;
assert(!eligible(p, u, q));
// Exact overhead accumulation, idle included; higher coordination saves cost.
const m = room(), mt = m.teams[0];
mt.levels.crew = 2;
assert.equal(managementRate(mt), 5);
for (m.time = 1; m.time <= 60; m.time++)
    accrueManagement(m, mt);
assert.equal(mt.cash, 155);
assert.equal(mt.profit, -5);
mt.levels.coordination = 6;
assert.equal(managementRate(mt), 3.8);
// Interest: one round = one year, no interest on debt/advances; ledger and income classification.
const ir = room(), it = ir.teams[0];
it.debt = 40;
ir.projects = [{ owner: it.id, state: 'building', received: 20 }];
assert.equal(interestBase(ir, it), 100);
for (ir.time = 1; ir.time < 60; ir.time++)
    accrueInterest(ir, it);
assert.equal(it.cash, 160);
settleInterest(ir, it);
assert.equal(it.interestEarned, .26);
assert.equal(it.revenue, 0);
assert.equal(it.profit, .26);
it.cash = 10;
assert.equal(interestBase(ir, it), 0);
// Pause freezes both clocks, manual end settles fractional minute, no duplicate ledger.
r.auto = false;
const before = t.cash;
tick(r, 620000);
assert(t.interestAccrued > 0);
action(r, 'h', { type: 'pause' }, 620000);
const paused = JSON.stringify([t.cash, t.interestAccrued, t.managementAccrued]);
tick(r, 900000);
assert.equal(JSON.stringify([t.cash, t.interestAccrued, t.managementAccrued]), paused);
action(r, 'h', { type: 'end' });
const co = view(r, 'ka').debrief.companies[0];
assert(co.cash.some(e => e.type === 'cash_interest'));
assert(co.cash.some(e => e.type === 'management_overhead'));
assert(Math.abs(160 + co.cash.reduce((n, e) => n + e.amount, 0) - t.cash) < .001);
action(r, 'h', { type: 'restart' });
assert.equal(r.hostGuideStep, 0);
assert.equal(r.teams[0].guideStep, 0);
assert(!r.teams[0].lobbyReady);
assert.equal(r.teams[0].interestEarned, undefined);
// Full new-model games across skills exercise bot configuration, economy and review size.
for (let seed = 0; seed < 3; seed++) {
    const b = newRoom('B', 'h', 15);
    for (let skill = 0; skill <= 10; skill++)
        action(b, 'h', { type: 'add_bot', skill });
    guide(b, 'h');
    action(b, 'h', { type: 'start' }, 0);
    tick(b, 910000);
    assert.equal(b.phase, 'finished');
    assert(b.teams.find(t => t.skill === 0).bankrupt);
    for (const bt of b.teams) {
        assert(Number.isFinite(bt.cash));
        assert(Math.abs(160 + bt.review.cash.reduce((n, e) => n + e.amount, 0) - bt.cash) < .01, bt.name);
        assert(bt.review.points.every(p => p.levels.length === 16));
    }
    assert(JSON.stringify(b).length < 2e6);
    console.log('New model simulation', seed, 'projects', b.projects.length, 'revenue', b.teams.reduce((n, t) => n + t.revenue, 0), 'bytes', JSON.stringify(b).length);
}
console.log('PASS: sequential onboarding, all-ready gate, refresh/restart, all company profiles, 200 bilingual milestone projects, staged gates, OR paths/experience/net cash/capacity, overhead, interest, pause/end and 3 full bot games.');
// The host is exempt from guide completion; player readiness still gates start.
{
    const x = room();
    for (const t of x.teams) {
        guide(x, t.key);
        action(x, t.key, { type: 'lobby_ready' });
    }
    assert.equal(x.hostGuideStep, 0);
    assert(view(x, 'h').canStart);
    action(x, 'h', { type: 'start' }, 0);
    assert.equal(x.phase, 'setup');
}

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
