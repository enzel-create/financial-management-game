const newRoom = (...args) => { const r = makeRoom(...args); return { ...r, institutionsVersion:0,contextVersion:0,balanceVersion: 0, modelVersion: 1, interestVersion: 0, onboardingVersion: 0, catalogVersion: 2, pool: r.pool.filter(i => i < 50), preparationVersion: 1 }; };
import assert from 'node:assert/strict';
import { newRoom as makeRoom, addTeam, action, tick, view, release, CATALOG } from '../lib/game.mjs';
import { preparePayments, advanceProject, financeScores } from '../lib/cashflow.mjs';
import { requirements, prepareCompliance, checklist } from '../lib/compliance.mjs';
function room() { const r = newRoom('TEST', 'host', 15); addTeam(r, 'a', 'ka', 'A'); addTeam(r, 'b', 'kb', 'B'); return r; }
let r = room();
action(r, 'ka', { type: 'plan_add', kind: 'cost', at: 0 });
action(r, 'ka', { type: 'plan_add', kind: 'welfare', at: 30 });
const first = r.teams[0].plan[0].id;
action(r, 'host', { type: 'start' }, 1000);
assert.equal(r.phase, 'planning');
assert.equal(r.planningEndsAt, 121000);
assert.throws(() => action(r, 'ka', { type: 'upgrade', kind: 'cost' }));
assert.throws(() => action(r, 'host', { type: 'release' }));
tick(r, 120999);
assert.equal(r.time, 0);
assert.equal(r.projects.length, 0);
assert.equal(r.teams[0].cash, 160);
assert.equal(r.teams[0].training.length, 0);
action(r, 'ka', { type: 'plan_edit', id: first, kind: 'safety', at: 0 });
tick(r, 121000);
assert.equal(r.phase, 'running');
assert.equal(r.time, 0);
assert.equal(r.projects.length, 2);
assert.equal(r.projects[0].eligible, undefined);
assert.deepEqual(r.projects[0].requirements, {});
tick(r, 122000);
assert.equal(r.teams[0].cash, 142);
assert.equal(r.teams[0].plan[0].status, 'running');
assert.throws(() => action(r, 'ka', { type: 'plan_cancel', id: first }));
const before = JSON.stringify(r);
tick(r, 122000);
assert.equal(JSON.stringify(r), before);
action(r, 'host', { type: 'pause' });
tick(r, 200000);
assert.equal(r.time, 1);
action(r, 'ka', { type: 'plan_reserve', value: 150 });
action(r, 'host', { type: 'resume' }, 200000);
tick(r, 245000);
assert.equal(r.teams[0].levels.safety, 1);
assert.equal(r.teams[0].plan[1].status, 'pending');
assert.match(r.teams[0].plan[1].reason, /储备/);
action(r, 'ka', { type: 'plan_reserve', value: 20 });
tick(r, 246000);
assert.equal(r.teams[0].plan[1].status, 'running');
assert.equal(view(r, 'kb').me.plan.length, 0);
assert(!('plan' in view(r, 'kb').teams[0]));
let q = room();
action(q, 'host', { type: 'start' }, 0);
tick(q, 120000);
q.auto = false;
const p = q.projects[0];
p.requirements = { safety: 1 };
assert.throws(() => action(q, 'ka', { type: 'bid', project: p.id, amount: 50 }), /准入/);
q.teams[0].levels.safety = 1;
action(q, 'ka', { type: 'bid', project: p.id, amount: 50 });
q.teams[0].levels.safety = 0;
tick(q, 160000);
assert.equal(p.state, 'unsold');
assert.match(p.review.a, /准入/);
for (const insurance of [0, 1, 2]) {
    const x = room(), t = x.teams[0];
    t.cash = 1000;
    t.levels.insurance = insurance;
    const p = { ...CATALOG[0], owner: 'a', state: 'building', paymentVersion: 2, cost: 100, price: 140, shock: 0, total: 100, remaining: 100 };
    preparePayments(p);
    prepareCompliance(p, t);
    x.projects = [p];
    for (let i = 1; i <= 25; i++) {
        x.time = i;
        advanceProject(x, p, t, 1);
    }
    assert.equal(p.compliance.events.length, 1);
    assert.equal(p.compliance.events[0].cost, Math.round((2 + 6 * (1 - insurance * .3)) * 100) / 100);
    assert.equal(p.holdUntil, 37);
    for (let i = 37; i <= 80; i++) {
        x.time = i;
        advanceProject(x, p, t, 1);
    }
    assert.equal(p.compliance.events.length, 2);
    assert.equal(p.receiptDelay, 18);
    const costs = t.riskCosts;
    advanceProject(x, p, t, 1);
    assert.equal(t.riskCosts, costs);
}
let x = room(), t = x.teams[0];
t.cash = 1000;
t.levels.safety = 2;
t.levels.compliance = 2;
const z = { ...CATALOG[0], owner: 'a', state: 'building', paymentVersion: 2, cost: 100, price: 140, shock: 0, total: 100, remaining: 100 };
preparePayments(z);
prepareCompliance(z, t);
x.projects = [z];
for (let i = 0; i < 105; i++) {
    x.time = i;
    advanceProject(x, z, t, 1);
}
assert.equal(z.compliance.events.length, 0);
assert.throws(() => checklist(x, x.teams[1], { project: z.id, kind: 'safety' }));
assert.equal(requirements(CATALOG.find(p => p.catalogId === 'sector-9-0')).compliance, 2);
for (const k of Object.keys(t.levels))
    t.levels[k] = ['cost', 'speed'].includes(k) ? 3 : 2;
assert.equal(financeScores(x, t).growth, 100);
// Late polling catches up only trading time after the fixed preparation deadline.
let late = room();
action(late, 'host', { type: 'start' }, 0);
tick(late, 130000);
assert.equal(late.time, 10);
assert.equal(late.projects[0].closes, late.projects[0].bidWindow);
console.log('PASS: shared 120-second phase, no early spending, automatic transition, scheduling/editing/reserves/pause, privacy, entry checks at bid and award, preventable risks, insurance and six-dimension growth.');
