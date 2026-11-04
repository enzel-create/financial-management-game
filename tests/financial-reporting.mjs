import assert from 'node:assert/strict';
import { newRoom as originalRoom, addTeam, action, tick, view, estimate } from '../lib/game.mjs';
import { openFinancialBooks, financialReport, saveOperatingBudget, saveBidBudget, lockProjectBudget } from '../lib/financial-reporting.mjs';
import { preparePayments, payStage, collectReceipts } from '../lib/cashflow.mjs';
const near = (a, b) => assert(Math.abs(a - b) <= .05, `${a} != ${b}`);
function setup(mode = 'full') { const r = newRoom('FIN', 'h', 10, mode); addTeam(r, 'a', 'a', 'A'); addTeam(r, 'b', 'b', 'B'); r.phase = 'running'; r.auto = false; r.last = 0; for (const t of r.teams)
    openFinancialBooks(r, t); return r; }
const r = setup(), t = r.teams[0];
const start = t.cash;
assert.equal(financialReport(r, t).balance.equity, start);
assert.equal(financialReport(r, t).ratios.current, null);
saveOperatingBudget(r, t, { revenue: 150, directCost: 100, overhead: 5, other: 3 });
assert.equal(financialReport(r, t).budget.profit, 42);
assert.throws(() => saveOperatingBudget(r, t, { revenue: NaN, directCost: 0, overhead: 0, other: 0 }));
assert.throws(() => saveOperatingBudget(r, null, { revenue: 1 }));
const p = { id: 'p', name: 'Test job', owner: 'a', state: 'building', paymentVersion: 2, cost: 100, price: 150, total: 100, remaining: 100, started: 0, shock: 0, costSchedule: [{ at: 0, share: 50 }, { at: 100, share: 50 }], receiptSchedule: [{ at: 0, share: 20, delay: 0 }, { at: 100, share: 75, delay: 0 }, { at: 100, share: 5, delay: 30, retainage: true }], bids: {} };
r.projects = [p];
saveBidBudget(r, p, { id: 'a', amount: 150 }, { base: 100, duration: 100 });
lockProjectBudget(r, p);
preparePayments(p);
assert(payStage(r, p, t, 0));
p.receipts[0].due = 0;
collectReceipts(r);
let f = financialReport(r, t);
near(f.balance.cash, start - 20);
near(f.balance.wip, 50);
near(f.balance.advances, 30);
near(f.balance.equity, start);
near(f.balance.balanceDifference, 0);
near(f.comparison.pocRevenue, 75);
near(f.comparison.pocProfit, 25);
assert(f.ratios.quick < f.ratios.current);
assert.throws(() => saveOperatingBudget(r, t, { revenue: 200, directCost: 100, overhead: 5, other: 3 }), /首次中标/);
action(r, 'a', { type: 'loan' });
f = financialReport(r, t);
near(f.balance.debt, 40);
near(f.income.pretaxProfit, -4);
near(f.balance.balanceDifference, 0);
t.managementAccrued = 1.25;
t.informationAccrued = .5;
t.interestAccrued = .25;
f = financialReport(r, t);
near(f.income.pretaxProfit, -5.5);
near(f.balance.balanceDifference, 0);
t.managementAccrued = 0;
t.informationAccrued = 0;
t.interestAccrued = 0;
assert(payStage(r, p, t, 1));
p.state = 'done';
p.remaining = 0;
p.finished = 100;
t.revenue = 150;
t.profit += 50;
f = financialReport(r, t);
near(f.balance.wip, 0);
near(f.balance.receivables, 120);
near(f.balance.advances, 0);
near(f.balance.balanceDifference, 0);
near(f.variance.profit, 4);
near(f.income.pretaxProfit, 46);
near(f.projects[0].costVariance, 0);
p.receipts[1].due = 0;
collectReceipts(r);
f = financialReport(r, t);
near(f.balance.receivables, 7.5);
near(f.balance.balanceDifference, 0);
// Terminated costs cannot remain indefinitely as a realizable WIP asset.
const q = setup(), u = q.teams[0], j = structuredClone(p);
j.id = 'j';
j.state = 'building';
j.remaining = 50;
j.received = 0;
preparePayments(j);
q.projects = [j];
payStage(q, j, u, 0);
j.state = 'terminated';
f = financialReport(q, u);
near(f.income.writeoff, 50);
near(f.balance.wip, 0);
near(f.balance.balanceDifference, 0);
// Zero / negative denominator handling and no fabricated legacy history.
u.cash = -10;
u.profit = -200;
f = financialReport(q, u);
assert.equal(f.ratios.roe, null);
assert(Number.isFinite(f.balance.overdraft));
delete u.financeOpening;
assert.equal(financialReport(q, u).available, false);
// Round start captures the opening capital, not the lobby default.
for (const mode of ['full']) {
    const sim = newRoom('SIM', 'h', 9, mode);
    for (let i = 0; i < 3; i++)
        action(sim, 'h', { type: 'add_bot', skill: 7 + i }, 0);
    action(sim, 'h', { type: 'start' }, 0);
    for (let now = 0; now < 1300000 && sim.phase !== 'finished'; now += 1000) {
        tick(sim, now);
        for (const x of sim.teams) {
            const a = financialReport(sim, x);
            if (a.available) {
                near(a.balance.balanceDifference, 0);
                assert(Number.isFinite(a.income.pretaxProfit));
            }
        }
    }
    assert.equal(sim.phase, 'finished');
    const host = view(sim, 'h');
    assert.equal(host.debrief.companies.length, 3);
    for (const x of host.debrief.companies) {
        assert(x.financials.available);
        assert(x.financials.history.length > 1);
        near(x.financials.balance.balanceDifference, 0);
        assert.equal(x.financials.balance.capital, x.initial.cash);
    }
    const player = view(sim, sim.teams[0].key);
    assert(!JSON.stringify(player.projects).includes('projectBudgets'));
    action(sim, 'h', { type: 'restart' });
    assert.equal(sim.teams[0].financeOpening, undefined);
    assert.equal(sim.teams[0].operatingBudget, undefined);
    console.log('PASS balanced reports at every second, both modes, settlement, export and restart:', mode);
}
console.log('PASS loan principal/fees, accruals, WIP, retention, completion, cost-to-cost comparison, locked budget, termination and denominator guards');
// JV allocation preserves each partner's cents, own budgets and credit liabilities.
const joint = setup('full'), [a, b] = joint.teams;
const jp = { ...structuredClone(p), id: 'joint', owner: a.id, joint: { members: [{ id: a.id, share: 33 }, { id: b.id, share: 67 }] }, state: 'building', price: 151, cost: 101, remaining: 100 };
joint.projects = [jp];
preparePayments(jp);
saveBidBudget(joint, jp, { id: a.id, amount: 151, joint: jp.joint }, { base: 101, duration: 100 });
lockProjectBudget(joint, jp);
payStage(joint, jp, a, 0);
jp.receipts[0].due = 0;
collectReceipts(joint);
for (const x of [a, b])
    near(financialReport(joint, x).balance.balanceDifference, 0);
near(a.projectBudgets.joint.directCost + b.projectBudgets.joint.directCost, 101);
const { buyGuarantee } = await import('../lib/guarantee.mjs');
const credit = setup('full'), ct = credit.teams[0];
const cp = { ...structuredClone(p), id: 'credit', owner: undefined, state: 'open', closes: 10, bids: {} };
credit.projects = [cp];
buyGuarantee(credit, ct, cp, 100, 'bridge');
near(financialReport(credit, ct).balance.balanceDifference, 0);
// Simulate an already-paid operating expense to require a real project-credit draw.
ct.cash -= 130;
ct.profit -= 130;
cp.owner = ct.id;
cp.state = 'building';
preparePayments(cp);
payStage(credit, cp, ct, 0);
assert(ct.guaranteeDebt > 0);
near(financialReport(credit, ct).balance.balanceDifference, 0);
console.log('PASS joint bid budgets and allocation, credit setup and draw fees');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
