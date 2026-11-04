import assert from 'node:assert/strict';
import { NEWS_CATALOG, publishNews, newsEffect } from '../lib/market-news.mjs';
import { newRoom as originalRoom, addTeam, action, tick, release, view } from '../lib/game.mjs';
import { preparePayments, payStage, certify, collectReceipts, advanceProject } from '../lib/cashflow.mjs';
import { MARKET_MIX, drawTier } from '../lib/market-mix.mjs';
import { FULL_CATALOG } from '../lib/catalog-expanded.mjs';
assert.equal(NEWS_CATALOG.length, 100);
assert.equal(new Set(NEWS_CATALOG.map(n => n.id)).size, 100);
for (const track of new Set(NEWS_CATALOG.map(n => n.track)))
    assert.equal(NEWS_CATALOG.filter(n => n.track === track).length, 20);
for (let stage = 0; stage < 4; stage++) {
    const count = [0, 0, 0, 0];
    for (let roll = 0; roll < 100; roll++)
        count[drawTier(stage, roll)]++;
    assert.deepEqual(count, MARKET_MIX[stage]);
}
const room = () => { const r = newRoom('NEWS', 'h', 18); addTeam(r, 'a', 'a', 'A'); addTeam(r, 'b', 'b', 'B'); r.phase = 'running'; r.auto = false; return r; };
let r = room();
const due = r.nextNews;
assert(due >= 25 && due <= 50);
tick(r, (due - 1) * 1000);
assert.equal(r.news.length, 0);
tick(r, due * 1000);
assert(r.news.length >= 2 && r.news.length <= 5);
assert.equal(new Set(r.news.map(n => n.track)).size, r.news.length);
const first = JSON.stringify(r.news);
tick(r, due * 1000);
assert.equal(JSON.stringify(r.news), first);
action(r, 'h', { type: 'pause' }, 120000);
tick(r, 999000);
assert.equal(JSON.stringify(r.news), first);
action(r, 'h', { type: 'resume' }, 999000);
tick(r, 1119000);
assert(r.news.length >= 4);
assert.deepEqual(view(r, 'a').news, view(r, 'b').news);
assert.deepEqual(view(r, 'h').news, view(r, 'a').news);
assert.equal(new Set(r.news.map(n => n.id)).size, r.news.length);
r = room();
const p = { id: 'p', owner: 'a', specialty: 'digital', state: 'building', paymentVersion: 2, price: 150, cost: 100, shock: 0, total: 100, remaining: 100, costSchedule: [{ at: 0, share: 50, label: ['开始', 'Start'] }, { at: 100, share: 50, label: ['完工', 'Finish'] }], receiptSchedule: [{ at: 50, share: 100, delay: 10, label: ['回款', 'Payment'] }] };
preparePayments(p);
r.projects = [p];
const n = { ...NEWS_CATALOG[0], time: 0, endsAt: 90, value: .06 };
r.news = [n];
assert.equal(payStage(r, p, r.teams[0], 0), true);
assert.equal(p.costPayments[0].paidAmount, 53);
assert.equal(p.newsCostDelta, 3);
r.time = 90;
payStage(r, p, r.teams[0], 1);
assert.equal(p.costPayments[1].paidAmount, 50);
assert.equal(p.paidCost, 103);
assert.equal(newsEffect(r, { specialty: 'medical' }, 'cost'), 0);
r.time = 10;
r.news = [{ ...n, kind: 'receipt', value: 8 }];
p.remaining = 50;
certify(r, p);
assert.equal(p.receipts[0].due, 28);
r.news = [{ ...n, kind: 'receipt', value: -6 }];
certify(r, p);
assert.equal(p.receipts[0].due, 28);
r.time = 28;
collectReceipts(r);
assert.equal(p.received, 150);
collectReceipts(r);
assert.equal(p.received, 150);
r.time = 30;
r.news = [{ ...n, kind: 'speed', value: -.08 }];
p.remaining = 50;
advanceProject(r, p, r.teams[0], 1);
assert(Math.abs(p.remaining - 49.08) < 1e-8);
// Budget events never rewrite signed or already listed prices. Published ranges remain confidential internally.
r = room();
r.time = 400;
r.news = [{ ...n, kind: 'demand', value: .08, time: 400, endsAt: 490 }];
release(r, 2);
const saved = JSON.stringify(r.projects);
publishNews(r);
assert.equal(JSON.stringify(r.projects), saved);
assert(view(r, 'a').projects.every(p => p.fundingLimit === undefined));
// Host manual supply is independent of automatic wave size and open-project count.
r = room();
for (let i = 0; i < 8; i++)
    action(r, 'h', { type: 'release', count: 2 });
assert.equal(r.projects.length, 16);
assert.equal(new Set(r.projects.map(p => p.catalogId)).size, 16);
assert.throws(() => action(r, 'a', { type: 'release', count: 2 }));
r.time = r.duration - 239;
assert.throws(() => action(r, 'h', { type: 'release' }));
action(r, 'h', { type: 'end' });
assert.deepEqual(view(r, 'h').debrief.news, r.news);
action(r, 'h', { type: 'restart' });
assert.equal(r.news.length, 0);
assert(r.nextNews >= 25 && r.nextNews <= 50);
console.log('PASS: 100 bilingual specialist events, random clock, 2–5 unique-track batches, randomized expiry, pause/idempotency, real milestone cost, receipt delay locking, work speed, confidentiality, exact stage weights, unrestricted manual counts, cutoff and restart.');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
