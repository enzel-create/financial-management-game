const newRoom = (...args) => { const r = makeRoom(...args); return { ...r, institutionsVersion:0,contextVersion:0,balanceVersion: 0, modelVersion: 1, interestVersion: 0, onboardingVersion: 0, catalogVersion: 2, pool: r.pool.filter(i => i < 50), preparationVersion: 1 }; };
import assert from 'node:assert/strict';
import { newRoom as makeRoom, addTeam, action, tick, view, CATALOG } from '../lib/game.mjs';
import { requirements, eligible } from '../lib/compliance.mjs';
import { financeScores } from '../lib/cashflow.mjs';
import { SPECIALTY_KEYS } from '../lib/upgrades.mjs';
const room = () => { const r = newRoom('T', 'host', 15); addTeam(r, 'a', 'ka', 'A'); addTeam(r, 'b', 'kb', 'B'); return r; };
const start = r => { action(r, 'host', { type: 'start' }, 0); tick(r, 120000); r.auto = false; };
let r = room(), t = r.teams[0];
action(r, 'ka', { type: 'plan_add', kind: 'digital', at: 0 });
const id = t.plan[0].id;
action(r, 'ka', { type: 'plan_edit', id, kind: 'medical', at: 0 });
action(r, 'ka', { type: 'plan_reserve', value: 30 });
start(r);
assert.equal(view(r, 'kb').debrief, null);
assert.equal(JSON.stringify(view(r, 'kb')).includes('decisions'), false);
tick(r, 181000);
assert.equal(t.levels.medical, 1);
action(r, 'ka', { type: 'upgrade', kind: 'digital' });
assert.throws(() => action(r, 'ka', { type: 'upgrade', kind: 'industrial' }), /两个/);
tick(r, 241000);
assert.equal(t.levels.digital, 1);
assert.throws(() => action(r, 'ka', { type: 'upgrade', kind: 'buildings' }), /两个/);
for (const k of ['cost', 'speed', 'crew', 'safety', 'compliance', 'insurance'])
    t.levels[k] = 3;
assert.equal(eligible({ requirements: { industrial: 1 } }, t), false);
t.levels.cost = 0;
t.levels.speed = 0;
t.levels.crew = 0;
t.levels.safety = 0;
t.levels.compliance = 0;
t.levels.insurance = 0;
action(r, 'ka', { type: 'loan' });
action(r, 'ka', { type: 'repay' });
action(r, 'host', { type: 'end' });
let d = view(r, 'kb').debrief, co = d.companies[0];
assert.equal(co.initial.cash + co.cash.reduce((s, e) => s + e.amount, 0), co.finalCash);
assert.equal(co.decisions.filter(x => x.type === 'plan_edit').length, 1);
assert(co.points.some(x => x.levels[8] === 1));
assert(co.cash.some(x => x.type === 'financing_fee'));
assert(!JSON.stringify(d).includes('"key"'));
const history = JSON.stringify(d);
tick(r, 1000000);
assert.equal(JSON.stringify(view(r, 'ka').debrief), history);
action(r, 'host', { type: 'restart' });
assert.equal(view(r, 'ka').debrief, null);
assert.equal(r.teams[0].review.cash.length, 0);
const counts = {};
for (const p of CATALOG) {
    const req = requirements(p, true);
    for (const k of SPECIALTY_KEYS)
        if (req[k])
            counts[k] = (counts[k] || 0) + 1;
}
for (const k of SPECIALTY_KEYS)
    assert(counts[k] > 0);
assert.equal(CATALOG.length, 50);
r = room();
start(r);
t = r.teams[0];
const p = r.projects[0];
p.fundingLimit = 10000;
action(r, 'ka', { type: 'bid', project: p.id, amount: Math.ceil(p.base * 1.4) });
tick(r, 160000);
action(r, 'ka', { type: 'compliance', project: p.id, kind: 'safety' });
action(r, 'ka', { type: 'compliance', project: p.id, kind: 'documents' });
tick(r, 500000);
action(r, 'host', { type: 'end' });
co = view(r, 'ka').debrief.companies[0];
assert.equal(Math.round((co.initial.cash + co.cash.reduce((s, e) => s + e.amount, 0)) * 100), Math.round(co.finalCash * 100));
assert(co.cash.some(x => x.type === 'project_cost'));
assert(co.cash.some(x => x.type === 'project_receipt'));
// Equal-price draws are independent of insertion/name order; audit ranks match actual awards.
let wins = 0;
for (let i = 0; i < 600; i++) {
    const q = room();
    start(q);
    const p = q.projects[0];
    p.fundingLimit = 10000;
    for (const key of ['ka', 'kb'])
        action(q, key, { type: 'bid', project: p.id, amount: 100 });
    assert(!view(q, 'ka').projects[0].tieDraw);
    tick(q, 160000);
    wins += p.owner === 'a';
    assert.equal(p.tieDraw[0].entries[0].id, p.owner);
    assert.equal(view(q, 'ka').projects[0].tieDraw[0].entries.filter(e => e.awarded).length, 1);
}
assert(wins > 230 && wins < 370, wins);
console.log('PASS: two specialization slots including training; distinct project paths; review privacy/restart/freeze, plan history, exact cash ledger, 600 equal-price draws. First company wins:', wins, counts);
