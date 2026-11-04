import assert from 'node:assert/strict';
import { newRoom as originalRoom, addTeam, view, release, action } from '../lib/game.mjs';
const r = newRoom('HOST', 'host-secret', 18);
addTeam(r, 'a', 'a-secret', 'A');
addTeam(r, 'b', 'b-secret', 'B');
r.phase = 'running';
r.auto = false;
r.teams[0].plan = [{ id: 'task', kind: 'cost', at: 30, status: 'pending' }];
r.teams[0].levels.cost = 4;
release(r, 1);
r.projects[0].bids.a = { amount: 80, tie: 123 };
let h = view(r, 'host-secret');
assert.equal(h.participants.length, 2);
assert.equal(h.participants[0].company.levels.cost, 4);
assert.equal(h.participants[0].company.plan[0].at, 30);
assert.equal(h.participants[0].projects[0].myBid, 80);
assert.equal(h.participants[1].projects.length, 0);
const serialized = JSON.stringify(h);
for (const token of ['host-secret', 'a-secret', 'b-secret'])
    assert(!serialized.includes(token));
for (const key of ['a-secret', 'b-secret'])
    assert.equal(view(r, key).participants, undefined);
assert.equal(view(r, 'b-secret').projects[0].myBid, null);
assert.throws(() => view(r, 'bogus'));
r.teams[0].cash = 42;
assert.equal(view(r, 'host-secret').participants[0].company.cash, 42);
r.phase = 'paused';
assert.equal(view(r, 'host-secret').participants[0].company.plan.length, 1);
r.teams[0].bankrupt = true;
r.teams[0].bankruptAt = 50;
assert.equal(view(r, 'host-secret').participants[0].company.bankruptAt, 50);
action(r, 'host-secret', { type: 'end' });
action(r, 'host-secret', { type: 'restart' });
assert.equal(view(r, 'host-secret').participants[0].company.plan.length, 0);
console.log('PASS host-only live details, bid visibility, credential exclusion, player isolation, pause, bankruptcy and restart');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
