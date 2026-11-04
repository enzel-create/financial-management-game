import assert from 'node:assert/strict';
import { newRoom as originalRoom, addTeam, action, tick, view, estimate } from '../lib/game.mjs';
import { fundingReview } from '../lib/funding-review.mjs';
import { botDecision } from '../lib/bots.mjs';
const schedule = [{ at: 0, share: 10, label: ['开工', 'Start'] }, { at: 50, share: 90, label: ['施工', 'Work'] }];
const receipts = [{ at: 100, share: 100, delay: 10, label: ['回款', 'Receipt'] }];
const setup = () => { const r = newRoom('FUND', 'h', 15); r.balanceVersion = 0; addTeam(r, 'a', 'ka', 'A'); addTeam(r, 'b', 'kb', 'B'); r.phase = 'running'; r.last = 0; r.auto = false; for (const t of r.teams) {
    t.levels.safety = 6;
    t.levels.compliance = 6;
} const p = { id: 'p0', name: 'Funding test', modelVersion: 2, paymentVersion: 2, procurementVersion: 3, state: 'open', base: 100, duration: 100, closes: 40, requirements: {}, costSchedule: schedule, receiptSchedule: receipts, bids: {}, fundingLimit: 500, governmentEstimate: 150, shock: .2 }; r.projects = [p]; return [r, p, r.teams[0]]; };
let [r, p, t] = setup(), e = estimate(p, t);
t.cash = 30;
let f = fundingReview(r, t, p, 1, e);
assert.equal(f.required, 122.5);
assert(f.shortfall > 0);
assert.throws(() => action(r, 'ka', { type: 'bid', project: p.id, amount: 1 }), /全周期/);
assert.equal(p.bids.a, undefined);
// Below-cost work is permitted with independently sufficient capital.
t.cash = 160;
assert(fundingReview(r, t, p, 90, e).passes);
action(r, 'ka', { type: 'bid', project: p.id, amount: 90 });
tick(r, 40000);
assert.equal(p.owner, 'a');
assert.equal(p.price, 90);
// A genuinely self-funded nominal bid can pass; this is not an arbitrary price floor.
[r, p, t] = setup();
action(r, 'ka', { type: 'bid', project: p.id, amount: 1 });
tick(r, 40000);
assert.equal(p.owner, 'a');
// Recheck at opening after cash changes, and exclude the failing offer from tie audit.
[r, p, t] = setup();
action(r, 'ka', { type: 'bid', project: p.id, amount: 90 });
action(r, 'kb', { type: 'bid', project: p.id, amount: 90 });
t.cash = 30;
tick(r, 40000);
assert.equal(p.owner, 'b');
assert.match(p.review.a, /全周期/);
assert.equal(p.tieDraw.length, 0);
// Two affordable individual bids must not reuse the same cash for both commitments.
[r, p, t] = setup();
t.levels.crew = 1;
const q = { ...structuredClone(p), id: 'p1' };
r.projects.push(q);
action(r, 'ka', { type: 'bid', project: p.id, amount: 90 });
action(r, 'ka', { type: 'bid', project: q.id, amount: 90 });
tick(r, 40000);
assert.equal(p.owner, 'a');
assert.equal(q.owner, undefined);
assert.match(q.review.a, /全周期/);
// Never use hidden shocks or owner funding in the projection; browser/server match.
[r, p, t] = setup();
const expected = fundingReview(r, t, p, 90, estimate(p, t));
p.shock = 0;
p.fundingLimit = 1;
p.governmentEstimate = 99999;
assert.deepEqual(fundingReview(r, t, p, 90, estimate(p, t)), expected);
let v = view(r, 'ka');
assert.deepEqual(fundingReview(v, v.me, v.projects[0], 90, v.projects[0].estimate), expected);
assert.equal(v.projects[0].fundingLimit, undefined);
// Delayed receipts raise the cash requirement; paid costs/collected receipts aren't counted twice.
const delayed = structuredClone(p);
delayed.receiptSchedule = [{ ...receipts[0], at: 10, delay: 0 }];
assert(fundingReview(r, t, delayed, 150, estimate(delayed, t)).required < expected.required);
// Low-skill quotes are a plausible cost underestimate, not a fixed 1% dump.
[r, p, t] = setup();
r.time = 14;
v = view(r, 'ka');
const decision = botDecision(v, 0);
assert.equal(decision.type, 'bid');
assert(decision.amount >= 65 && decision.amount <= 85);
assert(decision.amount > 1);
r.time = 180;
assert.equal(botDecision(view(r, 'ka'), 0).type, 'bankrupt');
// Older rounds retain their known first-payment rule.
[r, p, t] = setup();
delete r.fundingVersion;
t.cash = 30;
action(r, 'ka', { type: 'bid', project: p.id, amount: 1 });
assert.equal(p.bids.a.amount, 1);
console.log('PASS: insufficient nominal bids blocked, funded losses allowed, latest cash checked at award, concurrent commitments combined, tie eligibility, public projection parity, receipt timing, low-skill quotes and legacy compatibility.');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
