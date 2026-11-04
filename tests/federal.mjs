const newRoom = (...args) => { const r = makeRoom(...args); return { ...r, institutionsVersion:0,contextVersion:0,balanceVersion: 0, modelVersion: 1, interestVersion: 0, onboardingVersion: 0, catalogVersion: 2, pool: r.pool.filter(i => i < 50), preparationVersion: 1 }; };
import assert from 'node:assert/strict';
import { newRoom as makeRoom, addTeam, action, tick, view, release } from '../lib/game.mjs';
function room() { let r = newRoom('TEST', 'host'); addTeam(r, 'a', 'ka', 'A'); addTeam(r, 'b', 'kb', 'B'); action(r, 'host', { type: 'start' }, -119000); tick(r, 1000); delete r.riskVersion; for (const p of r.projects)
    delete p.requirements; r.auto = false; return r; }
let r = room(), p = r.projects[0];
p.base = 60;
p.governmentEstimate = 80;
p.fundingLimit = 120;
action(r, 'ka', { type: 'bid', project: p.id, amount: 100 });
action(r, 'kb', { type: 'bid', project: p.id, amount: 150 });
for (let key of ['ka', 'kb', 'host']) {
    let v = view(r, key).projects[0];
    for (let k of ['ceiling', 'governmentEstimate', 'fundingLimit', 'base', 'bidCount', 'offers', 'bids'])
        assert.equal(v[k], undefined, k);
    assert(v.magnitude);
    if (key !== 'host')
        assert(v.estimate);
}
assert.equal(view(r, 'ka').projects[0].myBid, 100);
tick(r, 41000);
assert.equal(p.owner, 'a', 'Above IGE but within funds must be eligible');
assert.equal(view(r, 'kb').projects[0].offers.length, 2);
assert.match(p.review.b, /资金不足/);
assert.equal(view(r, 'host').projects[0].fundingLimit, undefined);
let q = room(), x = q.projects[0];
x.base = 60;
x.fundingLimit = 70;
x.governmentEstimate = 90;
action(q, 'ka', { type: 'bid', project: x.id, amount: 1000000 });
action(q, 'kb', { type: 'bid', project: x.id, amount: 80 });
tick(q, 41000);
assert.equal(x.state, 'unsold');
assert.match(x.reason, /资金/);
let c = room(), z = c.projects[0];
z.base = 60;
action(c, 'ka', { type: 'bid', project: z.id, amount: 1 });
action(c, 'host', { type: 'end' });
assert.equal(view(c, 'kb').projects[0].offers, undefined, 'Cancelled unopened bids stay sealed');
let l = room();
l.projects[0].base = 60;
l.time = l.duration - 1;
action(l, 'ka', { type: 'bid', project: l.projects[0].id, amount: 100 });
l.projects[0].closes = l.duration + 1;
tick(l, 2000);
assert.equal(view(l, 'host').projects[0].offers, undefined);
let exhausted = room();
exhausted.time = Math.ceil(exhausted.duration * .5);
while (exhausted.pool.length)
    release(exhausted, 7);
assert.equal(exhausted.projects.length, 50);
assert.equal(new Set(exhausted.projects.map(p => p.catalogId)).size, 50);
console.log('PASS: confidential estimates/funds/counts, own estimate only, above-IGE bid accepted, funding review at opening, no budget probing, cancellation secrecy, 50 unique projects');
