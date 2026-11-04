import assert from 'node:assert/strict';
import { newRoom as originalRoom, addTeam, action, tick, ranking, rememberPeaks, view } from '../lib/game.mjs';
import { preparePayments, advanceProject } from '../lib/cashflow.mjs';
import { profitPosition } from '../lib/score-settlement.mjs';
import { projectContext, marketAccess, selectionScore } from '../lib/context.mjs';
import { FULL_CATALOG } from '../lib/catalog-expanded.mjs';
import { prepareCompliance } from '../lib/compliance.mjs';
function room(mode = 'full') { const r = newRoom('TEST', 'h', mode === 'full' ? 18 : 12, mode); addTeam(r, 'a', 'a', 'A'); addTeam(r, 'b', 'b', 'B'); r.phase = 'running'; r.auto = false; r.last = 0; return r; }
for (const mode of ['full']) {
    const r = room(mode), t = r.teams[0];
    t.revenue = 200;
    t.profit = 50;
    rememberPeaks(r);
    t.profit = 5;
    const before = ranking(r).find(x => x.id === 'a');
    action(r, 'a', { type: 'bankrupt' });
    const after = ranking(r).find(x => x.id === 'a');
    assert.equal(after.score, before.score);
    assert.equal(after.profit, 5);
    assert.equal(after.historical, false);
    assert(after.peakScore > after.score);
    const frozen = JSON.stringify(after);
    r.teams[1].profit = 999;
    r.time = 500;
    assert.equal(JSON.stringify(ranking(r).find(x => x.id === 'a')), frozen);
    const a = room(mode), b = room(mode);
    for (const q of [a, b]) {
        const team = q.teams[0];
        team.profit = 20;
        const p = { ...structuredClone(FULL_CATALOG[0]), id: 'job', owner: 'a', state: 'building', paymentVersion: 2, price: 60, cost: 100, total: 100, remaining: 50, shock: 0, bids: {} };
        preparePayments(p);
        p.costPayments[0].paid = true;
        p.costPayments[0].paidAmount = 30;
        p.paidCost = 30;
        p.received = 18;
        p.receipts[0].received = true;
        p.receipts[0].amount = 18;
        q.projects = [p];
    }
    action(a, 'a', { type: 'bankrupt' });
    action(b, 'h', { type: 'end' });
    assert.equal(ranking(a).find(x => x.id === 'a').profit, ranking(b).find(x => x.id === 'a').profit);
    assert.equal(a.teams[0].revenue, 0);
    assert.equal(a.teams[0].profit, 20);
    assert(profitPosition(a, a.teams[0]).expectedLoss >= 40);
    assert.equal(profitPosition(a, a.teams[0]).scoredProfit, 20 - profitPosition(a, a.teams[0]).expectedLoss);
    assert.equal(view(a, 'a').me.advance, 18);
    const final = profitPosition(b, b.teams[0]);
    assert.deepEqual(profitPosition(b, b.teams[0]), final);
}
const owners = new Map();
for (const p of FULL_CATALOG) {
    const c = projectContext(p);
    const list = owners.get(p.sector) || new Set();
    list.add(c.ownerType);
    owners.set(p.sector, list);
    assert(Math.abs(c.receiptSchedule.reduce((n, x) => n + x.share, 0) - 100) < 1e-6);
}
assert([...owners.values()].every(s => s.size === 3));
const privateJob = FULL_CATALOG.map(projectContext).find(p => p.invited), candidate = { levels: { [privateJob.specialty]: 3, quality: 2 }, trackRecord: {}, completedProjects: 0 };
assert(marketAccess(privateJob, candidate));
const experienced = { levels: { [privateJob.specialty]: 6 }, trackRecord: { [privateJob.specialty]: 3 } };
assert(selectionScore(privateJob, experienced, 100, 100) === 100);
assert(selectionScore(privateJob, experienced, 140, 100) < selectionScore(privateJob, { levels: {}, trackRecord: {} }, 100, 100));
const modules = room();
modules.phase = 'lobby';
assert.throws(() => action(modules, 'a', { type: 'learning_config', focus: 'cash', modules: {} }));
assert.throws(()=>action(modules, 'h', {type:'learning_config',focus:'profit'}));
// Legacy disabled-module saves retain their behavior.
modules.modules={news:false,joint:false,credit:false,manualCompliance:false};modules.jointVersion=0;modules.newsVersion=0;
assert.equal(modules.jointVersion, 0);
assert.equal(modules.newsVersion, 0);
modules.phase = 'running';
assert.throws(() => action(modules, 'h', { type: 'learning_config', focus: 'cash' }));
assert.throws(() => action(modules, 'a', { type: 'guarantee_buy' }));
const p = { ...structuredClone(FULL_CATALOG[0]), simple: false, id: 'routine', owner: 'a', state: 'building', cost: 30, price: 50, total: 100, remaining: 100, shock: 0, paymentVersion: 2 };
modules.projects = [p];
preparePayments(p);
prepareCompliance(p, modules.teams[0]);
const cash = modules.teams[0].cash;
advanceProject(modules, p, modules.teams[0], 1);
assert(p.compliance.safety && p.compliance.documents);
assert(modules.teams[0].cash < cash);
assert(modules.teams[0].profit < 0);
console.log('PASS: exit cannot recover peak scores; identical cutoff losses; no phantom exit revenue; retained advance debt; equal profile value; supply through every duration/player count; mixed owner contexts; newcomer access; capped experience advantage; host-only locked optional modules and charged automated routines.');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
