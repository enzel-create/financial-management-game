const newRoom = (...args) => { const r = makeRoom(...args); return { ...r, institutionsVersion:0,contextVersion:0,balanceVersion: 0, modelVersion: 1, interestVersion: 0, onboardingVersion: 0, catalogVersion: 2, pool: r.pool.filter(i => i < 50), preparationVersion: 1 }; };
import assert from 'node:assert/strict';
import { CATALOG, newRoom as makeRoom, addTeam, action, tick, view, ranking } from '../lib/game.mjs';
import { allocate, preparePayments, payStage, advanceProject, collectReceipts, financeScores } from '../lib/cashflow.mjs';
const near = (a, b) => assert(Math.abs(a - b) < .011, `${a} != ${b}`);
assert.equal(CATALOG.length, 50);
for (const item of CATALOG) {
    assert.equal(item.costSchedule.length, 5);
    assert.equal(item.receiptSchedule.length, 4);
    for (const schedule of [item.costSchedule, item.receiptSchedule]) {
        assert.equal(schedule.reduce((s, x) => s + x.share, 0), 100);
        assert(schedule.every((x, i) => i === 0 || x.at > schedule[i - 1].at));
        assert(schedule.every(x => x.label.length === 2 && x.label.every(Boolean)));
    }
    assert.equal(item.costSchedule[0].at, 0);
    assert.equal(item.receiptSchedule.at(-1).at, 100);
    for (const shock of [0, .1, .2]) {
        const r = { time: 0, projects: [], teams: [{ id: 'a', cash: 1000 }] }, t = r.teams[0];
        const p = { ...item, owner: 'a', paymentVersion: 2, state: 'building', cost: 73.33, price: 103.71, shock, total: 83, remaining: 83 };
        r.projects = [p];
        preparePayments(p);
        payStage(r, p, t, 0);
        for (let i = 1; i < 160; i++) {
            r.time = i;
            collectReceipts(r);
            advanceProject(r, p, t, .8);
        }
        near(p.paidCost, 73.33 + Math.round(73.33 * shock * 100) / 100);
        near(p.received, 103.71);
        near(t.cash, 1000 - p.paidCost + p.received);
        const before = t.cash;
        collectReceipts(r);
        advanceProject(r, p, t, .8);
        near(t.cash, before);
    }
}
const room = () => { let r = newRoom('TEST', 'host', 15); addTeam(r, 'a', 'ka', 'A'); addTeam(r, 'b', 'kb', 'B'); action(r, 'host', { type: 'start' }, -119000); tick(r, 1000); delete r.riskVersion; for (const p of r.projects)
    delete p.requirements; r.auto = false; return r; };
let r = room(), p = r.projects[0];
p.base = 100;
p.fundingLimit = 200;
p.shock = .1;
r.teams[0].cash = 30;
action(r, 'ka', { type: 'bid', project: p.id, amount: 150 });
tick(r, 41000);
assert.equal(p.owner, 'a');
assert(p.paidCost < 100);
assert.equal(r.teams[0].revenue, 0);
tick(r, 101000);
assert(p.blocked);
const held = p.remaining;
tick(r, 102000);
near(p.remaining, held);
assert(r.teams[0].shortageSeconds > 0);
for (const key of ['host', 'kb']) {
    let v = view(r, key).projects[0];
    assert.equal(v.costPayments, undefined);
    assert.equal(v.receipts, undefined);
    assert.equal(v.extra, undefined);
    assert.equal(v.governmentEstimate, undefined);
}
assert(view(r, 'ka').projects[0].costPayments);
r.teams[0].cash = 200;
tick(r, 103000);
assert(!p.blocked);
assert(p.remaining < held);
tick(r, 401000);
assert.equal(p.state, 'done');
near(r.teams[0].revenue, 150);
near(r.teams[0].profit, 40);
near(p.received, 150);
const cash = r.teams[0].cash;
tick(r, 401000);
near(r.teams[0].cash, cash);
let sample = room();
sample.teams[0].revenue = 200;
sample.teams[0].profit = 60;
sample.teams[0].levels = { cost: 0, speed: 0, crew: 0 };
sample.teams[1].revenue = 80;
sample.teams[1].profit = 20;
sample.teams[1].levels = { cost: 3, speed: 3, crew: 2 };
assert.equal(ranking(sample)[0].id, 'a');
assert.equal(ranking(sample, 'health')[0].id, 'b');
let t = sample.teams[0], score = financeScores(sample, t).cashScore;
t.cash += 36;
t.debt += 40;
assert(financeScores(sample, t).cashScore <= score);
t.training = [{ kind: 'cost', end: 100 }];
assert.equal(financeScores(sample, t).growth, 0);
let paused = room();
action(paused, 'host', { type: 'pause' });
tick(paused, 900000);
assert.equal(paused.time, 0);
let legacy = room();
delete legacy.economicsVersion;
for (const project of legacy.projects)
    project.paymentVersion = 1;
legacy.projects[0].base = 60;
legacy.projects[0].fundingLimit = 200;
action(legacy, 'ka', { type: 'bid', project: legacy.projects[0].id, amount: 100 });
tick(legacy, 41000);
near(legacy.teams[0].cash, 100);
assert.equal(view(legacy, 'host').healthRank.length, 0);
let advances = room(), ap = advances.projects[0];
ap.base = 60;
ap.fundingLimit = 200;
ap.shock = 0;
action(advances, 'ka', { type: 'bid', project: ap.id, amount: 100 });
tick(advances, 41000);
const certAt = 40 + Math.ceil(ap.total * ap.receiptSchedule[0].at / 100) + ap.receiptSchedule[0].delay;
tick(advances, (certAt + 1) * 1000);
assert(ap.received > 0);
assert.equal(ap.state, 'building');
assert.equal(advances.teams[0].revenue, 0);
near(financeScores(advances, advances.teams[0]).netCash, advances.teams[0].cash - ap.received);
action(advances, 'host', { type: 'end' });
const frozenCash = advances.teams[0].cash;
tick(advances, 999999);
near(advances.teams[0].cash, frozenCash);
console.log('PASS: all 50 schedules, penny conservation, delayed receipts, duplicate ticks, funding holds/resume, privacy, distinct ranks, loan resistance, pause and legacy mode.');
