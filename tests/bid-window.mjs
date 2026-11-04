import assert from 'node:assert/strict';
import { bidWindow, bidComplexity } from '../lib/bid-window.mjs';
import { FULL_CATALOG } from '../lib/catalog-expanded.mjs';
import { newRoom as originalRoom, release, tick, action, view } from '../lib/game.mjs';
assert.equal(bidWindow({}), 30);
assert.deepEqual([...new Set(FULL_CATALOG.map(bidWindow))].sort((a, b) => a - b), [30, 45, 60, 75, 90, 120]);
for (const p of FULL_CATALOG) {
    const stronger = { ...p, requirements: { ...p.requirements, compliance: (p.requirements?.compliance || 0) + 1 } };
    assert(bidComplexity(stronger) >= bidComplexity(p));
    assert(bidWindow(stronger) >= bidWindow(p));
}
for (const seconds of [30, 45, 60, 75, 90, 120]) {
    const r = newRoom('W', 'h', 18);
    r.phase = 'running';
    r.auto = false;
    r.newsVersion = 0;
    r.time = 648;
    r.last = 648000;
    r.pool = [FULL_CATALOG.findIndex(p => bidWindow(p) === seconds)];
    release(r, 1);
    const p = r.projects[0];
    assert.equal(p.bidWindow, seconds);
    assert.equal(p.closes, 648 + seconds);
    assert.equal(view(r, 'h').projects[0].bidWindow, seconds);
    tick(r, (p.closes - 1) * 1000);
    assert.equal(p.state, 'open');
    action(r, 'h', { type: 'pause' });
    tick(r, 3000000);
    assert.equal(p.state, 'open');
    action(r, 'h', { type: 'resume' }, 3000000);
    tick(r, 3001000);
    assert.equal(p.state, 'unsold');
}
console.log('PASS all 300 windows, monotonic requirements, six tiers, exact close times and pause/resume');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
