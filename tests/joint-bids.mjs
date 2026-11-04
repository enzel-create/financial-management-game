import assert from 'node:assert/strict';
import { newRoom as originalRoom, addTeam, action, tick, view, release, ranking, rememberPeaks } from '../lib/game.mjs';
import { FULL_CATALOG, JOINT_CATALOG } from '../lib/catalog-expanded.mjs';
import { translate } from '../lib/i18n.mjs';
import { portion, paidFor, receivedFor } from '../lib/ownership.mjs';
import { fundingReview } from '../lib/funding-review.mjs';
import { capabilityScore } from '../lib/cashflow.mjs';
import { botDecision } from '../lib/bots.mjs';
assert.equal(FULL_CATALOG.length, 300);
assert.equal(JOINT_CATALOG.length, 100);
assert.equal(new Set(FULL_CATALOG.map(p => p.catalogId)).size, 300);
for (const p of FULL_CATALOG) {
    assert(!/[\u4e00-\u9fff]/.test(translate(p.name, 'en')), p.name);
    for (const schedule of [p.costSchedule, p.receiptSchedule])
        assert.equal(schedule.reduce((n, x) => n + x.share, 0), 100);
}
function setup() {
    const r = newRoom('JV', 'h', 18);
    r.newsVersion = 0; // Isolate joint accounting from separately tested random market events.
    for (const id of ['a', 'b', 'c'])
        addTeam(r, id, id, id);
    r.phase = 'running';
    r.auto = false;
    for (const t of r.teams) {
        t.cash = 500;
        t.levels.safety = 6;
        t.levels.compliance = 6;
        t.levels.coordination = 2;
    }
    const p = { ...structuredClone(JOINT_CATALOG[0]), id: 'p0', state: 'open', closes: 70, paymentVersion: 2, procurementVersion: 3, fundingLimit: 1000, bids: {}, shock: .04 };
    p.requirements = { digital: 2, industrial: 2 };
    p.entryRules = {};
    r.teams[0].levels.digital = 2;
    r.teams[1].levels.industrial = 2;
    r.projects = [p];
    return [r, p];
}
let [r, p] = setup();
assert.throws(() => action(r, 'a', { type: 'bid', project: 'p0', amount: 200 }), /准入/);
assert.throws(() => action(r, 'a', { type: 'joint_propose', project: 'p0', partner: 'a', amount: 200, share: 50 }));
action(r, 'a', { type: 'joint_propose', project: 'p0', partner: 'b', amount: 200, share: 37 });
const o = p.jointOffers[0];
assert.equal(Object.keys(p.bids).length, 0);
assert.equal(view(r, 'c').projects[0].myJointOffers.length, 0);
assert.equal(view(r, 'h').projects[0].myJointOffers.length, 0);
assert.throws(() => action(r, 'a', { type: 'joint_accept', project: 'p0', offer: o.id }));
assert.throws(() => action(r, 'c', { type: 'joint_accept', project: 'p0', offer: o.id }));
assert.equal(botDecision({ ...view(r, 'b'), time: 2 }, 10)?.type, 'joint_accept');
action(r, 'b', { type: 'joint_accept', project: 'p0', offer: o.id });
assert.equal(view(r, 'b').projects[0].myBid, 200);
assert.equal(view(r, 'c').projects[0].myBid, null);
assert.equal(view(r, 'b').projects[0].myJointBid.tie, undefined);
assert.throws(() => action(r, 'b', { type: 'joint_accept', project: 'p0', offer: o.id }));
action(r, 'b', { type: 'withdraw', project: 'p0' });
assert.equal(Object.keys(p.bids).length, 0);
action(r, 'a', { type: 'joint_propose', project: 'p0', partner: 'b', amount: 200, share: 37 });
action(r, 'b', { type: 'joint_accept', project: 'p0', offer: p.jointOffers[0].id });
tick(r, 70000);
assert.equal(p.owner, 'a');
assert.equal(p.joint.members[0].share, 37);
assert.equal(view(r, 'b').me.crewUsed, 1);
assert.equal(view(r, 'a').me.crewUsed, 1);
let remaining = p.remaining;
tick(r, 71000);
assert.equal(remaining - p.remaining, 1);
assert(Math.abs(p.paidCost - paidFor(p, 'a') - paidFor(p, 'b')) < .001);
const va = view(r, 'a');
assert(va.projects[0].costPayments);
assert.equal(view(r, 'c').projects[0].costPayments, undefined);
tick(r, 600000);
assert.equal(p.state, 'done');
assert.equal(r.teams[0].revenue + r.teams[1].revenue, 200);
assert.equal(receivedFor(p, 'a') + receivedFor(p, 'b'), 200);
assert(Math.abs(p.paidCost - paidFor(p, 'a') - paidFor(p, 'b')) < .001);
assert.equal(r.teams[0].completedProjects, 1);
assert.equal(r.teams[1].completedProjects, 1);
for (const t of r.teams)
    assert(Math.abs(500 + t.review.cash.reduce((n, e) => n + e.amount, 0) - t.cash) < .01);
// A partner cannot use the other's cash to cover their own agreed obligations.
[r, p] = setup();
r.teams[1].cash = 1;
action(r, 'a', { type: 'joint_propose', project: 'p0', partner: 'b', amount: 200, share: 1 });
assert.throws(() => action(r, 'b', { type: 'joint_accept', project: 'p0', offer: p.jointOffers[0].id }));
// Recheck at opening; cancellation and termination settle only once.
[r, p] = setup();
action(r, 'a', { type: 'joint_propose', project: 'p0', partner: 'b', amount: 200, share: 50 });
action(r, 'b', { type: 'joint_accept', project: 'p0', offer: p.jointOffers[0].id });
r.teams[1].cash = 1;
tick(r, 70000);
assert.equal(p.state, 'unsold');
[r, p] = setup();
action(r, 'a', { type: 'joint_propose', project: 'p0', partner: 'b', amount: 200, share: 50 });
action(r, 'b', { type: 'joint_accept', project: 'p0', offer: p.jointOffers[0].id });
tick(r, 90000);
action(r, 'a', { type: 'bankrupt' });
assert.equal(p.state, 'terminated');
assert(!r.teams[1].bankrupt);
assert.equal(r.teams[1].revenue, receivedFor(p, 'b'));
const paid = p.paidCost, received = p.received;
tick(r, 300000);
assert.equal(p.paidCost, paid);
assert.equal(p.received, received);
// Fixed scoring avoids first-contract dominance and rewards a focused company.
[r, p] = setup();
r.projects = [];
r.teams[0].revenue = 1;
r.teams[0].profit = -76.5;
rememberPeaks(r);
assert(ranking(r)[0].performance < 1);
r.teams[1].revenue = 200;
r.teams[1].profit = 30;
assert.equal(ranking(r)[0].id, 'b');
const t = r.teams[0];
t.initialConfiguration = { levels: { ...t.levels } };
const initial = capabilityScore(r, t);
t.levels.digital = 6;
t.levels.cost = 6;
t.levels.speed = 6;
t.levels.procurement = 6;
t.levels.quality = 6;
assert(capabilityScore(r, t) > initial + 20);
console.log('PASS: 300 bilingual projects, 100 cross-specialty, consent/privacy, partner funding, split penny conservation, one progress clock, termination, focused growth and absolute peak scores.');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
