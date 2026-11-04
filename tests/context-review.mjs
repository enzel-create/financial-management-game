import assert from 'node:assert/strict';
import { newRoom as originalRoom, addTeam, release, view, action, tick } from '../lib/game.mjs';
import { projectContext, marketAccess, selectionScore, accounting, riskSummary } from '../lib/context.mjs';
import { FULL_CATALOG } from '../lib/catalog-expanded.mjs';
import { preparePayments, lockOrders, payStage, certify, collectReceipts } from '../lib/cashflow.mjs';
import { prepareCompliance, checklist, triggerRisk, eligible } from '../lib/compliance.mjs';
import { guaranteeApproval } from '../lib/guarantee.mjs';
import { updateTeamContinuity } from '../lib/team-continuity.mjs';
import { jointTeam } from '../lib/joint-bids.mjs';
import { fundingReview } from '../lib/funding-review.mjs';
const r = newRoom('TEST', 'host');
addTeam(r, 'a', 'a', 'A');
addTeam(r, 'b', 'b', 'B');
r.phase = 'running';
r.auto = false;
r.last = 0;
const [t, u] = r.teams;
t.cash = 10000;
for (const raw of FULL_CATALOG) {
    const p = projectContext(raw);
    assert(Math.abs(p.receiptSchedule.reduce((n, x) => n + x.share, 0) - 100) < 1e-8);
    assert(p.costSchedule.every(x => x.orderAt <= x.at));
    assert(['federal', 'wa-public', 'private'].includes(p.ownerType));
    assert(p.selection);
}
const raw = FULL_CATALOG.find(p => p.catalogId.startsWith('sector-11-') && p.releaseTier === 0);
let p = { ...projectContext(raw), id: 'x', paymentVersion: 2, state: 'building', owner: t.id, cost: 100, price: 150, total: 100, remaining: 100, shock: 0, bids: {} };
r.projects = [p];
prepareCompliance(p, t);
preparePayments(p);
assert(eligible(p, t));
t.qualifications.registration = false;
assert(!eligible(p, t));
t.qualifications.registration = true;
// price locked at order, subsequent cost news cannot reprice it
r.news = [{ kind: 'cost', track: p.specialty, value: .06, time: 0, endsAt: 10 }];
lockOrders(r, p, 100);
const locked = p.costPayments[1].lockedAmount;
assert(locked > p.costPayments[1].amount);
r.time = 20;
r.news = [{ kind: 'cost', track: p.specialty, value: -.04, time: 10, endsAt: 100 }];
assert(payStage(r, p, t, 1));
assert.equal(p.costPayments[1].paidAmount, locked);
// retainage is a separate sum; acceptance/closeout and delay are required
p.remaining = 0;
p.state = 'done';
certify(r, p);
const ret = p.receipts.at(-1);
assert(ret.retainage);
assert.equal(ret.due, null);
checklist(r, t, { project: 'x', kind: 'closeout' });
certify(r, p);
assert.equal(ret.due, 50);
r.time = 49;
collectReceipts(r);
assert(!ret.received);
r.time = 50;
collectReceipts(r);
assert(ret.received);
assert.equal(p.received, 150);
assert.equal(accounting(r, t).actualReceipts, 150);
// automatic routines never exempt stressed sites from a safety review
prepareCompliance(p, t);
p.compliance.safety = true;
p.remaining = 60;
triggerRisk(r, p, t);
assert.equal(p.compliance.safety, false);
p.compliance.safetyLevel = 6;
p.compliance.safety = true;
t.fatigue = 80;
p.remaining = 35;
triggerRisk(r, p, t);
assert.equal(p.holdUntil, r.time + 6);
// private market entry needs demonstrated delivery, not purchasable levels
let priv = projectContext(FULL_CATALOG.find(x => x.releaseTier === 2 && x.specialty === 'digital' && projectContext(x).ownerType === 'private'));
assert(priv.invited);
t.completedProjects = 0;
t.trackRecord = {};
assert(!marketAccess(priv, t));
t.trackRecord.digital = 1;
assert(marketAccess(priv, t));
t.levels.digital = 6;
assert(selectionScore(priv, t, 110, 100) > selectionScore(priv, u, 100, 100));
// credit approval is separate from cash alone
assert(!guaranteeApproval(r, t, 'summit'));
t.completedProjects = 2;
assert(guaranteeApproval(r, t, 'summit'));
t.incidents = 3;
assert(!guaranteeApproval(r, t, 'summit'));
// losing one partner's prerequisite invalidates combined eligibility
u.qualifications.liability = false;
assert.equal(jointTeam(r, { members: [{ id: 'a' }, { id: 'b' }] }).qualifications.liability, false);
// continued pressure has persistent cost and productivity effects
const before = t.cash;
t.fatigue = 90;
for (let i = 0; i < 60; i++) {
    r.time++;
    updateTeamContinuity(r, t, 1);
}
assert.equal(t.cash, before - 3);
assert(t.teamStability < 100);
assert(t.staffGapUntil > r.time);
const stability = t.teamStability;
t.fatigue = 10;
updateTeamContinuity(r, t, 0);
assert(t.teamStability < stability + 1);
// WIP loss cannot be concealed by completion-only revenue; reserve is diagnostic
p.state = 'building';
p.price = 1;
p.remaining = 50;
p.costPayments.forEach(x => x.paid = false);
const cash = t.cash;
assert(riskSummary(r, t).expectedLoss > 0);
assert.equal(t.cash, cash);
assert(accounting(r, t).earnedWork > 0);
// serialized view and server funding assessment agree
p.state = 'open';
p.closes = r.time + 30;
p.base = 100;
p.duration = 100;
p.requirements = {};
p.entryRules = {};
p.selection = 'lowest-price';
p.invited = false;
t.cash = 10000;
const v = view(r, 'a'), vp = v.projects[0];
assert.deepEqual(fundingReview(r, t, p, 150, vp.estimate), fundingReview(v, v.me, vp, 150, vp.estimate));
// Preserve legacy room mechanics; a restart explicitly selects the new rules
const legacy = newRoom('OLD', 'h');
delete legacy.contextVersion;
delete legacy.ruleset;
addTeam(legacy, 'l', 'l', 'L');
assert(!legacy.teams[0].qualifications);
release(legacy, 1);
assert(!legacy.projects[0].contextVersion);
legacy.phase = 'finished';
action(legacy, 'h', { type: 'restart' });
assert.equal(legacy.contextVersion, 1);
assert(legacy.teams[0].qualifications.registration);
console.log('PASS all 300 contexts, independent eligibility, order locks, retainage closeout/delay, recurring safety, private selection, credit approval, JV qualifications, persistent workforce effects, WIP risk, funding parity and legacy restart');
// End-to-end private selection: a stronger recorded supplier can beat a lower price.
const q = newRoom('BEST', 'h');
addTeam(q, 'a', 'a', 'Experienced');
addTeam(q, 'b', 'b', 'Low price');
q.phase = 'running';
q.auto = false;
q.last = 0;
q.newsVersion = 0;
q.bankruptcyVersion = 0;
for (const x of q.teams) {
    x.cash = 1000;
    x.levels.safety = 6;
    x.levels.compliance = 6;
}
q.teams[0].levels.digital = 6;
q.teams[0].trackRecord = { digital: 3 };
const work = { ...projectContext(FULL_CATALOG.find(x => x.specialty === 'digital' && x.releaseTier === 0)), id: 'p0', state: 'open', bids: {}, paymentVersion: 2, procurementVersion: 3, governmentEstimate: 200, fundingLimit: 500, closes: 1, shock: 0 };
q.projects = [work];
action(q, 'a', { type: 'bid', project: 'p0', amount: 110 });
action(q, 'b', { type: 'bid', project: 'p0', amount: 100 });
assert(!JSON.stringify(view(q, 'b').projects).includes('selectionScores'));
tick(q, 1000);
assert.equal(work.owner, 'a');
assert(view(q, 'a').projects[0].offers.find(x => x.name === 'Experienced').selectionScore > view(q, 'a').projects[0].offers.find(x => x.name === 'Low price').selectionScore);
console.log('PASS end-to-end private best-value award and sealed score confidentiality');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
