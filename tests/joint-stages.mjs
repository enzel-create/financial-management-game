import { bidWindow } from '../lib/bid-window.mjs';
import assert from 'node:assert/strict';
import { JOINT_CATALOG, FULL_CATALOG } from '../lib/catalog-expanded.mjs';
import { newRoom as originalRoom, release, addTeam, action, tick } from '../lib/game.mjs';
import { availableIndices } from '../lib/release-phases.mjs';
assert.deepEqual([0, 1, 2, 3].map(t => JOINT_CATALOG.filter(p => p.releaseTier === t).length), [0, 30, 35, 35]);
for (const tier of [1, 2, 3])
    assert.equal(new Set(JOINT_CATALOG.filter(p => p.releaseTier === tier).map(p => p.specialty)).size, 5);
for (const minutes of [15, 18, 20]) {
    const r = newRoom('JV', 'h', minutes);
    r.phase = 'running';
    r.auto = false;
    for (const [fraction, count] of [[0, 0], [.2, 30], [.4, 65], [.6, 100]]) {
        r.time = Math.ceil(r.duration * fraction);
        assert.equal(availableIndices(r, FULL_CATALOG).filter(i => FULL_CATALOG[i].crossSpecialty).length, count);
    }
    r.time = Math.ceil(r.duration * .2);
    r.pool = r.pool.filter(i => FULL_CATALOG[i].crossSpecialty);
    release(r, 30);
    assert.equal(r.projects.length, 30);
    assert(r.projects.every(p => p.releaseTier === 1 && p.closes - r.time === bidWindow(p)));
    assert.equal(new Set(r.projects.map(p => p.catalogId)).size, 30);
}
const r = newRoom('JV', 'h', 18);
addTeam(r, 'a', 'a', 'A');
addTeam(r, 'b', 'b', 'B');
r.newsVersion = 0;
r.auto = false;
r.phase = 'running';
r.time = 216;
r.last = 216000;
const entry = JOINT_CATALOG.find(p => p.releaseTier === 1);
r.pool = [FULL_CATALOG.indexOf(entry)];
release(r, 1);
const p = r.projects[0];
p.fundingLimit = 500;
const specialtyKeys = Object.keys(p.requirements).filter(k => k !== 'coordination');
r.teams[0].levels[specialtyKeys[0]] = p.requirements[specialtyKeys[0]];
r.teams[1].levels[specialtyKeys[1]] = p.requirements[specialtyKeys[1]];
r.teams[0].levels.coordination = 1;
action(r, 'a', { type: 'joint_propose', project: p.id, partner: 'b', amount: 200, share: 50 });
action(r, 'b', { type: 'joint_accept', project: p.id, offer: p.jointOffers[0].id });
tick(r, 286000);
assert.equal(p.owner, 'a');
assert.equal(p.joint.members.length, 2);
console.log('PASS 30/35/35 across all five sectors, stage boundaries, complexity-based windows, no repeats and stage-2 award with entry-level partners');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
