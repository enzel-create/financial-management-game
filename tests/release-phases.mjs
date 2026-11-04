const newRoom = (...args) => { const r = makeRoom(...args); return { ...r, institutionsVersion:0,contextVersion:0,balanceVersion: 0, modelVersion: 1, interestVersion: 0, onboardingVersion: 0, catalogVersion: 2, pool: r.pool.filter(i => i < 50), preparationVersion: 1 }; };
import assert from 'node:assert/strict';
import { newRoom as makeRoom, addTeam, action, tick, release, view, CATALOG } from '../lib/game.mjs';
import { projectTier as rawTier, releaseStage } from '../lib/release-phases.mjs';
const projectTier = p => rawTier(p, true);
const counts = [0, 0, 0];
for (const p of CATALOG)
    counts[projectTier(p)]++;
for (const minutes of [15, 18, 20]) {
    const r = newRoom('TEST', 'host', minutes);
    addTeam(r, 'a', 'ka', 'A');
    addTeam(r, 'b', 'kb', 'B');
    // Put high-entry projects first to prove filtering, not an accidentally favorable shuffle.
    r.pool.sort((a, b) => projectTier(CATALOG[b]) - projectTier(CATALOG[a]));
    action(r, 'host', { type: 'start' }, 0);
    tick(r, 120000);
    r.auto = false;
    assert(r.projects.every(p => Object.keys(p.requirements).length === 0));
    assert(view(r, 'ka').projects.every(p => p.eligible));
    release(r, 50);
    assert.equal(r.projects.length, counts[0]);
    assert.equal(release(r, 2), 0);
    assert.equal(r.counter, counts[0]);
    assert.equal(r.pool.length, 50 - counts[0]);
    assert.equal(view(r, 'ka').releaseAvailable, 0);
    const initial = JSON.stringify(r.projects.map(p => p.requirements));
    const a = Math.ceil(r.duration * .25), b = Math.ceil(r.duration * .5);
    r.time = a - 1;
    assert.equal(releaseStage(r), 0);
    assert.equal(release(r, 1), 0);
    r.time = a;
    assert.equal(releaseStage(r), 1);
    release(r, 50);
    assert.equal(r.projects.length, counts[0] + counts[1]);
    assert(r.projects.every(p => projectTier(p) <= 1));
    assert.equal(release(r, 1), 0);
    r.time = b - 1;
    assert.equal(releaseStage(r), 1);
    assert.equal(release(r, 1), 0);
    r.time = b;
    assert.equal(releaseStage(r), 2);
    release(r, 50);
    assert.equal(r.projects.length, 50);
    assert.equal(new Set(r.projects.map(p => p.catalogId)).size, 50);
    assert.equal(r.pool.length, 0);
    assert.equal(JSON.stringify(r.projects.slice(0, counts[0]).map(p => p.requirements)), initial);
    r.time = r.duration - 239;
    assert.throws(() => release(r, 1), /4/);
}
// Automatic waves cannot bypass locks and resume at the unlock time when depleted.
let r = newRoom('T', 'h', 15);
for (let i = 0; i < 12; i++)
    addTeam(r, String(i), 'k' + i, 'Team ' + i);
action(r, 'h', { type: 'start' }, 0);
tick(r, 344000);
assert.equal(r.time, 224);
assert.equal(r.projects.length, counts[0]);
assert(r.projects.every(p => projectTier(p) === 0));
assert.equal(r.nextWave, 225);
tick(r, 345000);
assert.equal(r.projects.length, counts[0] + Math.min(9, counts[1]));
assert(r.projects.every(p => projectTier(p) <= 1));
// Legacy active rooms keep their release behavior; no future identities leak in views.
let old = newRoom('O', 'h');
delete old.releaseVersion;
addTeam(old, 'a', 'ka', 'A');
old.pool.sort((a, b) => projectTier(CATALOG[b]) - projectTier(CATALOG[a]));
release(old, 1);
assert.equal(projectTier(old.projects[0]), 2);
const v = view(old, 'ka');
assert(!('pool' in v));
assert.equal(v.releaseVersion, 0);
console.log('PASS: 15/18/20-minute stage boundaries, no early locked projects, automatic/manual exhaustion, unlock resumption, unchanged requirements, 50 unique projects and legacy behavior.', counts);
