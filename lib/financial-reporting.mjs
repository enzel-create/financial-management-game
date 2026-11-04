import { assets, debtAccrual, recourse } from './institutions.mjs';
import { participates, portion, paidFor, receivedFor, members } from './ownership.mjs';
const money = n => (Math.round((Number(n) || 0) * 100) / 100 || 0);
const sum = (rows, fn) => money(rows.reduce((n, x) => n + fn(x), 0));
const ratio = (n, d) => d > 0 ? Number((n / d).toFixed(4)) : null;
export function openFinancialBooks(r, t) {
    if (!r.financeVersion || t.financeOpening)
        return;
    t.financeOpening = { capital: money(t.cash), time: r.time };
}
export function saveOperatingBudget(r, t, input) {
    if (!r.financeVersion || !t || t.bankrupt || r.phase === 'finished' || r.projects.some(p => participates(p, t.id) && p.owner))
        throw Error('请在首次中标前设置预算 / Set the budget before your first award');
    const values = {};
    for (const key of ['revenue', 'directCost', 'overhead', 'other']) {
        const v = input?.[key];
        if (v === '' || v == null || !Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 10000000)
            throw Error('预算须为0至10,000,000的金额 / Enter budget amounts from 0 to 10,000,000');
        values[key] = money(v);
    }
    t.operatingBudget = { ...values, profit: money(values.revenue - values.directCost - values.overhead - values.other), savedAt: r.time };
}
// Capture only submitted estimates, never hidden future cost shocks.
export function saveBidBudget(r, p, b, estimate) {
    if (!r.financeVersion)
        return;
    const candidate = { ...p, owner: b.id, joint: b.joint };
    for (const m of members(candidate)) {
        const t = r.teams.find(x => x.id === m.id);
        if (!t)
            continue;
        t.bidBudgets ??= {};
        t.bidBudgets[p.id] = { revenue: money(portion(candidate, t.id, b.amount)), directCost: money(portion(candidate, t.id, estimate.base)), duration: estimate.duration, savedAt: r.time };
    }
}
export function lockProjectBudget(r, p) {
    if (!r.financeVersion)
        return;
    for (const m of members(p)) {
        const t = r.teams.find(x => x.id === m.id);
        t.projectBudgets ??= {};
        t.projectBudgets[p.id] = t.bidBudgets?.[p.id] ? { ...t.bidBudgets[p.id], source: 'bid' } : { revenue: money(portion(p, t.id, p.price)), directCost: money(portion(p, t.id, p.cost)), duration: p.total, savedAt: r.time, source: 'award' };
    }
}
export function financialReport(r, t) {
    if (!t.financeOpening)
        return { available: false, budget: t.operatingBudget || null, budgetEditable: !!r.financeVersion && !t.bankrupt && r.phase !== 'finished' && !r.projects.some(p => p.owner && participates(p, t.id)) };
    const jobs = r.projects.filter(p => p.owner && participates(p, t.id));
    const completed = jobs.filter(p => p.state === 'done'), active = jobs.filter(p => p.state === 'building'), terminated = jobs.filter(p => p.state === 'terminated');
    const cost = p => p.paymentVersion === 2 ? money(paidFor(p, t.id)) : money(portion(p, t.id, p.cost || 0));
    const received = p => p.paymentVersion === 2 ? money(receivedFor(p, t.id)) : money(p.state === 'done' ? portion(p, t.id, p.price) : 0);
    const revenue = money(t.revenue), directCost = sum(completed, cost), wip = sum(active, cost), writeoff = sum(terminated, cost);
    const receivables = sum(completed, p => Math.max(0, (p.paymentVersion===2?sum(p.receipts||[],x=>portion(p,t.id,x.amount)):money(portion(p,t.id,p.price))) - received(p)));
    const advances = sum([...active, ...terminated], received);
    const accruedOverhead = money(t.managementAccrued), accruedInformation = money(t.informationAccrued), interestReceivable = money(t.interestAccrued);
    const accruedExpenses = money(accruedOverhead + accruedInformation), interestIncome = money((t.interestEarned || 0) + interestReceivable);
    const overhead = money((t.managementPaid || 0) + accruedOverhead);
    // Reconcile operating expenses to the game's booked result, not to a balancing equity plug.
    const otherExpenses = money(revenue - directCost + (t.interestEarned || 0) - (t.profit || 0) - (t.managementPaid || 0) + accruedInformation);
    const pretaxProfit = money((t.profit || 0) - accruedExpenses + interestReceivable - writeoff);
    const cash = money(Math.max(0, t.cash)), overdraft = money(Math.max(0, -t.cash)), debt = money((t.debt || 0) + (t.guaranteeDebt || 0) + debtAccrual(r, t) + recourse(t));
    const fixedAssets = sum(assets(r, t), e => e.book);
    const currentAssets = money(cash + receivables + wip + interestReceivable), currentLiabilities = money(debt + advances + accruedExpenses + overdraft);
    const capital = t.financeOpening.capital, equity = money(capital + pretaxProfit), balanceDifference = money(currentAssets + fixedAssets - currentLiabilities - equity);
    const workingCapital = money(currentAssets - currentLiabilities), quickAssets = money(cash + receivables + interestReceivable);
    const income = { depreciation: money(t.depreciation), bankInterest: money(t.bankInterest), suretyPremiums: money(t.suretyPremiums), equipmentMaintenance: money(t.equipmentMaintenance), disposalGain: money(t.disposalGain), revenue, directCost, grossProfit: money(revenue - directCost), overhead, otherExpenses, interestIncome, writeoff, pretaxProfit };
    const projects = jobs.map(p => { const budget = t.projectBudgets?.[p.id] || null, paid = cost(p), remaining = sum((p.costPayments || []).filter(x => !x.paid), x => portion(p, t.id, x.lockedAmount ?? x.amount)); const forecast = money(paid + remaining); return { id: p.id, name: p.name, state: p.state, budget, contract: money(portion(p, t.id, p.price)), paidCost: paid, remainingCost: remaining, forecastCost: forecast, actualCost: p.state === 'done' ? paid : null, costVariance: budget ? money((p.state === 'done' ? paid : forecast) - budget.directCost) : null, elapsed: (p.finished ?? p.terminatedAt ?? r.time) - (p.started || 0), actualDuration: p.state === 'done' ? (p.finished - p.started) : null, newsCostDelta: money(portion(p, t.id, p.newsCostDelta || 0)) }; });
    // Cost-to-cost comparison uses costs incurred and the current disclosed estimate.
    // Game stages pay costs as incurred; not a general claim that payments measure progress.
    const poc = active.map(p => { const paid = cost(p), remaining = sum((p.costPayments || []).filter(x => !x.paid), x => portion(p, t.id, x.lockedAmount ?? x.amount)), estimate = money(paid + remaining), progress = estimate > 0 ? Math.min(1, paid / estimate) : 0; return { id: p.id, name: p.name, incurred: paid, estimatedTotal: estimate, progress, revenue: money(portion(p, t.id, p.price) * progress), cost: paid }; });
    const pocRevenue = money(revenue + sum(poc, x => x.revenue)), pocCost = money(directCost + wip);
    const budget = t.operatingBudget || null, actualOther = money(otherExpenses + writeoff - interestIncome);
    const variance = budget ? { revenue: money(revenue - budget.revenue), directCost: money(directCost - budget.directCost), overhead: money(overhead - budget.overhead), other: money(actualOther - budget.other), profit: money(pretaxProfit - budget.profit) } : null;
    return { available: true, asOf: t.review?.endTime ?? r.time, budget, budgetEditable: !t.bankrupt && r.phase !== 'finished' && !jobs.length,
        balance: { cash, receivables, wip, inventory: 0, fixedAssets, interestReceivable, currentAssets, totalAssets: money(currentAssets + fixedAssets), debt, advances, accruedExpenses, overdraft, currentLiabilities, totalLiabilities: currentLiabilities, capital, retainedEarnings: pretaxProfit, equity, balanceDifference }, income,
        ratios: { workingCapital, current: ratio(currentAssets, currentLiabilities), quick: ratio(quickAssets, currentLiabilities), roa: ratio(pretaxProfit, currentAssets + fixedAssets), roe: ratio(pretaxProfit, equity), ros: ratio(pretaxProfit, revenue), debtEquity: ratio(currentLiabilities, equity) },
        comparison: { pocRevenue, pocCost, pocProfit: money(pretaxProfit + sum(poc, x => x.revenue) - wip), projects: poc }, projects, variance, actualOther,
        ledger: (t.review?.cash || []).map(e => ({ time: e.time, amount: e.amount, balance: e.balance, type: e.type, project: e.project })),
        history: t.financeHistory || [] };
}
export function sampleFinancials(r, t, force = false) {
    if (!t.financeOpening || (!force && r.time % 60 !== 0))
        return;
    const f = financialReport(r, t);
    t.financeHistory ??= [];
    const row = { time: r.time, revenue: f.income.revenue, profit: f.income.pretaxProfit, cash: t.cash, workingCapital: f.ratios.workingCapital, current: f.ratios.current, equity: f.balance.equity };
    const last = t.financeHistory.at(-1);
    if (last?.time === r.time)
        t.financeHistory[t.financeHistory.length - 1] = row;
    else
        t.financeHistory.push(row);
}
