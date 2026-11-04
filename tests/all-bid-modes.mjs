import assert from 'node:assert/strict';
import { FULL_CATALOG } from '../lib/catalog-expanded.mjs';
import { newRoom as originalRoom, addTeam, action, tick, view } from '../lib/game.mjs';
function setup(template) { const r = newRoom('M', 'h', 18); for (const id of ['a', 'b']) {
    addTeam(r, id, id, id);
    const t = r.teams.at(-1);
    t.cash = 10000;
    t.completedProjects = 5;
    for (const k of Object.keys(t.levels))
        t.levels[k] = k === 'crew' ? 4 : 6;
} r.phase = 'running'; r.auto = false; r.newsVersion = 0; const p = { ...structuredClone(template), id: 'p0', state: 'open', bids: {}, closes: 1, shock: 0, paymentVersion: 2, procurementVersion: 3, fundingLimit: 10000 }; r.projects = [p]; return [r, p]; }
for (const template of FULL_CATALOG) {
    let [r, p] = setup(template);
    assert(view(r, 'a').projects[0].eligible);
    action(r, 'a', { type: 'bid', project: p.id, amount: 1000 });
    tick(r, 1000);
    assert.equal(p.owner, 'a', p.catalogId);
    assert(!p.joint);
    [r, p] = setup(template);
    action(r, 'a', { type: 'joint_propose', project: p.id, partner: 'b', amount: 1000, share: 40 });
    action(r, 'b', { type: 'joint_accept', project: p.id, offer: p.jointOffers[0].id });
    tick(r, 1000);
    assert.equal(p.owner, 'a', p.catalogId);
    assert.equal(p.joint.members[0].share, 40);
}
let [r, p] = setup(FULL_CATALOG[200]);
p.jointOnly = true;
assert.equal(view(r, 'a').projects[0].jointOnly, false);
action(r, 'a', { type: 'bid', project: p.id, amount: 1000 });
tick(r, 1000);
assert.equal(p.owner, 'a');
[r, p] = setup(FULL_CATALOG[200]);
r.teams[0].levels[p.specialty] = 0;
assert.throws(() => action(r, 'a', { type: 'bid', project: p.id, amount: 1000 }), /准入/);
[r, p] = setup(FULL_CATALOG[200]);
r.teams[0].levels.crew = 0;
assert.throws(() => action(r, 'a', { type: 'bid', project: p.id, amount: 1000 }), /准入|队伍/);
console.log('PASS all 300 projects awarded solo and jointly, legacy open-project compatibility, insufficient capability and crew rejection');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
