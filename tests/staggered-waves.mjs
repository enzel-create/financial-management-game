import assert from 'node:assert/strict';
import { newRoom as originalRoom, addTeam, action, tick, view } from '../lib/game.mjs';
const setup = (count = 11) => { const r = newRoom('WAVE', 'h', 15); r.onboardingVersion = 0; r.preparationVersion = 1; for (let i = 0; i < count; i++)
    addTeam(r, 't' + i, 'k' + i, 'Team ' + i); action(r, 'h', { type: 'start' }, -120000); tick(r, 0); return r; };
const times = new Set();
let simultaneous = 0;
for (const count of [2, 11, 12])
    for (let sample = 0; sample < 10; sample++) {
        const r = setup(count), opening = r.projects.length;
        assert(opening >= 1 && opening <= 2);
        const batch = r.waveDue.length + opening;
        assert(batch >= 3 && batch <= 5);
        for (const at of r.waveDue)
            times.add(at);
        if (opening === 2 || new Set(r.waveDue).size < r.waveDue.length)
            simultaneous++;
        assert.equal(r.projects[0].closes, r.projects[0].bidWindow);
        tick(r, 89000);
        assert.equal(r.projects.length, batch);
        tick(r, 90000);
        assert(r.projects.length >= batch + 1 && r.projects.length <= batch + 2);
        assert(!('waveDue' in view(r, 'k0')));
    }
assert(times.size > 10);
assert(simultaneous > 0);
let r = setup(), opening = r.projects.length;
action(r, 'h', { type: 'pause' }, 0);
tick(r, 100000);
assert.equal(r.projects.length, opening);
action(r, 'h', { type: 'resume' }, 100000);
action(r, 'h', { type: 'auto' });
assert.equal(r.waveDue.length, 0);
tick(r, 160000);
assert.equal(r.projects.length, opening);
action(r, 'h', { type: 'release', count: 2 });
assert.equal(r.projects.length, opening + 2);
action(r, 'h', { type: 'auto' });
tick(r, 1000000);
assert.equal(r.phase, 'finished');
assert(r.projects.every(p => p.closes - p.bidWindow <= r.duration - 240));
assert.equal(new Set(r.projects.map(p => p.catalogId)).size, r.projects.length);
action(r, 'h', { type: 'restart' });
assert.deepEqual(r.waveDue, []);
assert.equal(r.waveVersion, 2);
console.log('PASS: 3–5 projects per wave, random offsets, simultaneous pairs, cutoff, no repeats, pause and reset.');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
