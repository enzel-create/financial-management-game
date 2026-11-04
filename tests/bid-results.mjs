import assert from 'node:assert/strict';
import { newRoom as originalRoom, addTeam, view, action } from '../lib/game.mjs';
import { bidResults } from '../lib/bid-results.mjs';
const r = newRoom('R', 'host', 18);
for (const id of ['a', 'b', 'c'])
    addTeam(r, id, id, id.toUpperCase());
r.phase = 'running';
r.projects = [{ id: 'p', name: 'Test', state: 'open', bids: { a: { amount: 90 }, b: { amount: 100 } }, base: 50, ceiling: 100, duration: 60, costSchedule: [], receiptSchedule: [] }];
assert.deepEqual(bidResults(view(r, 'a')), []);
Object.assign(r.projects[0], { state: 'building', owner: 'a', price: 90 });
assert.equal(bidResults(view(r, 'a'))[0].status, 'won');
const loss = bidResults(view(r, 'b'))[0];
assert.equal(loss.status, 'lost');
assert.deepEqual(loss.winners, ['A']);
assert.equal(loss.amount, 90);
assert.deepEqual(bidResults(view(r, 'c')), []);
assert.deepEqual(bidResults(view(r, 'host')), []);
r.projects[0].joint = { members: [{ id: 'a', share: 40 }, { id: 'b', share: 60 }] };
r.projects[0].bids = { a: { amount: 90, joint: r.projects[0].joint }, c: { amount: 100 } };
assert.equal(bidResults(view(r, 'b'))[0].status, 'won');
assert.deepEqual(bidResults(view(r, 'c'))[0].winners, ['A', 'B']);
delete r.projects[0].owner;
delete r.projects[0].joint;
delete r.projects[0].price;
r.projects[0].state = 'unsold';
r.projects[0].bids = { a: { amount: 90 } };
assert.equal(bidResults(view(r, 'a'))[0].amount, null);
assert.deepEqual(bidResults(view(r, 'a'))[0].winners, []);
r.projects[0].cancelled = true;
assert.equal(bidResults(view(r, 'a'))[0].status, 'cancelled');
r.phase = 'finished';
action(r, 'host', { type: 'restart' });
assert.deepEqual(bidResults(view(r, 'a')), []);
console.log('PASS open-bid privacy, success/failure amounts, nonbidders, joint partners, no award, cancellation and restart');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
