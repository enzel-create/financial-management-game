// Deterministic game economy. All amounts are USD 10k, all rates per game round.
// Mutations execute inside the room's compare-and-swap transaction (API route).
import { financialReport } from './financial-reporting.mjs';
import { cashEvent, decisionEvent } from './debrief.mjs';
import { members, participates, portion } from './ownership.mjs';
export const money = n => Math.round((Number(n) || 0) * 100) / 100;
const sum = (a, f) => money(a.reduce((n, x) => n + f(x), 0));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const fail = message => { throw Error(message); };
export function initInstitutions(r) {
    if (!r.institutionsVersion || r.institutions)
        return;
    r.institutions = { bank: { cash: 600, initialCapital: 600, profit: 0, loans: [], next: 1 }, surety: { cash: 600, initialCapital: 600, profit: 0, bonds: [] }, equipment: [], nextAsset: 1, lastSupply: -1 };
    supply(r);
}
function supply(r) {
    const s = r.institutions, period = Math.floor(r.time / 180);
    if (period === s.lastSupply)
        return;
    s.lastSupply = period;
    // Unsold dealer stock expires; player property never expires.
    s.equipment = s.equipment.filter(e => e.owner !== 'dealer' || e.listedAt >= r.time - 360);
    for (const [kind, price] of [['excavator', 48], ['crane', 64], ['plant', 40]])
        for (const condition of [1, .65])
            s.equipment.push({ id: 'eq' + s.nextAsset++, kind, owner: 'dealer', condition, price: money(price * condition), replacement: price, book: 0, listedAt: r.time, revision: 0, project: null, lien: null });
}
export function assets(r, t) { return r.institutions?.equipment.filter(e => e.owner === t.id) || []; }
export function debtAccrual(r, t) { return sum(r.institutions?.bank.loans.filter(l => l.company === t.id) || [], l => l.interest || 0); }
export function recourse(t) { return money(t.suretyRecourse || 0); }
function cash(r, t, n, type) { t.cash = money(t.cash + n); cashEvent(r, t, n, type); }
function expense(r, t, n, type) { cash(r, t, -n, type); t.profit = money(t.profit - n); }
function balance(r, t) { const f = financialReport(r, t); return f.available ? f.balance : { equity: t.cash - t.debt, totalAssets: t.cash, totalLiabilities: t.debt, currentAssets: t.cash, currentLiabilities: t.debt }; }
export function riskProfile(r, t) {
    const b = balance(r, t), jobs = r.projects.filter(p => p.state === 'building' && participates(p, t.id)), backlog = sum(jobs, p => portion(p, t.id, (p.costPayments || []).filter(x => !x.paid).reduce((n, x) => n + (x.lockedAmount ?? x.amount), 0))), capacity = 1 + (t.levels.crew || 0), leverage = b.totalAssets > 0 ? b.totalLiabilities / b.totalAssets : 1;
    const risk = clamp(.03 + Math.max(0, leverage) * .12 + jobs.length / capacity * .04 + (t.incidents || 0) * .015 + (t.cash < 15 ? .08 : 0) + (t.bankDefaults || 0) * .2, .03, .8);
    return { risk: Number(risk.toFixed(4)), equity: b.equity, backlog, capacity, leverage: Number(leverage.toFixed(3)), jobs: jobs.length };
}
export function bankQuote(r, t, kind = 'working', assetId = null) {
    if (!r.institutions)
        return { approved: false, reason: 'New room required / 请创建新房间' };
    const bank = r.institutions.bank, p = riskProfile(r, t), asset = r.institutions.equipment.find(e => e.id === assetId), secured = kind === 'equipment';
    const rate = money(.09 + p.risk * .65), feeRate = .015 + p.risk * .03;
    const collateral = secured && asset && asset.owner !== t.id && !asset.lien && asset.price != null ? asset.price * .65 : 0;
    const exposure = sum(bank.loans.filter(l => l.company === t.id), l => l.principal), limit = money(Math.max(0, Math.min(Math.max(0,bank.cash-sum(r.teams,x=>x.interestAccrued||0)), 120 - exposure, secured ? collateral : Math.max(0, p.equity) * .6 - exposure)));
    const reason = t.bankrupt ? 'Company exited / 公司已退出' : t.bankDefaults ? 'Prior default / 已有违约' : p.equity <= 0 ? 'Nonpositive equity / 权益不足' : p.risk > .45 ? 'Risk exceeds policy / 风险超限' : secured && !collateral ? 'No eligible equipment collateral / 无合格设备抵押' : limit < 10 ? 'Capital or credit limit insufficient / 资本或授信额度不足' : r.duration - r.time < 120 ? 'Too near settlement / 距结算不足120秒' : '';
    return { approved: !reason, reason: reason || 'Positive expected margin; equity and cash-flow stress within policy / 预期息差为正，权益与现金流压力通过', limit, rate, feeRate: money(feeRate), term: Math.min(360, r.duration - r.time), ...p };
}
function lend(r, t, amount, kind, asset) { const q = bankQuote(r, t, kind, asset?.id); if (!q.approved)
    fail(q.reason); if (!Number.isFinite(amount) || amount < 10 || amount > q.limit || money(amount) !== amount)
    fail('Loan outside quoted limit / 借款超出报价额度'); const b = r.institutions.bank, fee = money(amount * q.feeRate); b.cash = money(b.cash - amount + fee); b.profit = money(b.profit + fee); const l = { id: 'loan' + b.next++, company: t.id, kind, principal: amount, original: amount, interest: 0, rate: q.rate, issued: r.time, due: r.time + q.term, asset: asset?.id || null, status: 'current' }; b.loans.push(l); t.debt = money(t.debt + amount); cash(r, t, amount, 'bank_loan'); expense(r, t, fee, 'bank_fee'); if (asset)
    asset.lien = l.id; return l; }
function payLoan(r, t, l, requested) { let available = money(Math.min(Math.max(0, t.cash), requested)), interest = money(Math.min(available, l.interest)); if (interest) {
    cash(r, t, -interest, 'bank_interest');
    l.interest = money(l.interest - interest); t.bankAccrued=money((t.bankAccrued||0)-interest);
    r.institutions.bank.cash = money(r.institutions.bank.cash + interest);
    available = money(available - interest);
} const principal = money(Math.min(available, l.principal)); if (principal) {
    cash(r, t, -principal, 'bank_repay');
    l.principal = money(l.principal - principal);
    t.debt = money(t.debt - principal);
    r.institutions.bank.cash = money(r.institutions.bank.cash + principal);
} if (l.principal === 0 && l.interest === 0) {
    l.status = 'repaid';
    const e = r.institutions.equipment.find(e => e.id === l.asset);
    if (e?.lien === l.id)
        e.lien = null;
} return money(interest + principal); }
function availableAsset(r, t, id, revision) { const e = r.institutions.equipment.find(x => x.id === id); if (!e || e.revision !== revision)
    fail('Equipment changed; refresh / 设备状态已更新，请刷新'); return e; }
function dispose(r, t, e, price, buyer) { cash(r, t, price, 'equipment_sale'); t.profit = money(t.profit + price - e.book); t.disposalGain = money((t.disposalGain || 0) + price - e.book); e.owner = buyer; e.book = price; e.basis = price; e.depreciated = 0; e.age = 0; e.price = null; e.project = null; e.revision++; }
export function institutionAction(r, t, a) {
    if (!r.institutionsVersion)
        return false;
    initInstitutions(r);
    if (!['bank_borrow', 'bank_repay', 'equipment_buy', 'equipment_list', 'equipment_unlist', 'equipment_sell', 'surety_repay'].includes(a.type))
        return false;
    if (!t || t.bankrupt || r.phase !== 'running')
        fail('Market is closed / 市场未开放');
    if (a.type === 'bank_borrow')
        lend(r, t, Number(a.amount), 'working', null);
    if (a.type === 'bank_repay') {
        const l = r.institutions.bank.loans.find(l => l.id === a.loan && l.company === t.id);
        if (!l || (!l.principal && !l.interest))
            fail('Loan unavailable / 借款不存在');
        payLoan(r, t, l, Math.max(0, t.cash));
    }
    if (a.type === 'surety_repay') {
        const n = Math.min(Math.max(t.cash, 0), recourse(t));
        if (!n)
            fail('Nothing to repay / 无可偿还金额');
        cash(r, t, -n, 'surety_recourse');
        t.suretyRecourse = money(t.suretyRecourse - n);
        r.institutions.surety.cash = money(r.institutions.surety.cash + n);
    }
    if (a.type.startsWith('equipment_')) {
        const e = availableAsset(r, t, a.asset, a.assetRevision);
        if (a.type === 'equipment_buy') {
            const seller = r.teams.find(x => x.id === e.owner);
            if (e.owner === t.id || e.price == null || e.project || e.lien || (e.owner !== 'dealer' && (!seller || seller.bankrupt)))
                fail('Equipment is not for sale / 设备不可购买');
            const price = e.price, loan = Number(a.finance || 0);
            if (!Number.isFinite(loan) || loan < 0)
                fail('Invalid finance amount / 融资金额无效');
            if (loan) {
                const q = bankQuote(r, t, 'equipment', e.id);
                if (!q.approved || loan < 10 || loan > q.limit || money(loan) !== loan || t.cash + loan - money(loan * q.feeRate) < price)
                    fail('Equipment financing declined / 设备融资未通过');
            }
            else if (t.cash < price)
                fail('Insufficient purchase cash / 购置现金不足');
            // Every validation precedes mutations; the API CAS commits seller/buyer/lender together.
            if (loan)
                lend(r, t, loan, 'equipment', e);
            cash(r, t, -price, 'equipment_purchase');
            if (seller)
                dispose(r, seller, e, price, t.id);
            else {
                e.owner = t.id;
                e.book = price;
                e.basis = price;
                e.depreciated = 0;
                e.age = 0;
                e.price = null;
                e.revision++;
            }
            e.acquiredAt = r.time;
        }
        else {
            if (e.owner !== t.id)
                fail('Not equipment owner / 非设备所有人');
            if (e.project || e.lien)
                fail('In-use or pledged equipment cannot be sold / 在用或抵押设备不可出售');
            if (a.type === 'equipment_list') {
                const price = Number(a.price), fair = e.replacement * e.condition;
                if (!Number.isFinite(price) || price < money(fair * .5) || price > money(fair * 1.2))
                    fail('List price must be 50–120% of condition value / 挂牌价须为成色价值的50%至120%');
                e.price = money(price);
                e.revision++;
            }
            if (a.type === 'equipment_unlist') {
                e.price = null;
                e.revision++;
            }
            if (a.type === 'equipment_sell') {
                dispose(r, t, e, money(e.replacement * e.condition * .45), 'retired');
            }
        }
    }
    decisionEvent(r, t, a.type, { asset: a.asset, loan: a.loan, amount: a.amount }, 'manual');
    return true;
}
export function suretyQuote(r, t, p, amount) {
    if (!r.institutionsVersion || !p.publicWork)
        return { required: false, approved: true, premium: 0, exposure: 0 };
    initInstitutions(r);
    const s = r.institutions.surety, profile = riskProfile(r, t), exposure = money(amount * .3), used = sum(s.bonds.filter(b => b.status === 'active'), b => b.exposure), own = sum(s.bonds.filter(b => b.company === t.id && b.status === 'active'), b => b.exposure), limit = money(Math.max(0, profile.equity * 1.1 - own)), premium = money(exposure * (.015 + profile.risk * .08));
    const reason = t.bankrupt || recourse(t) > 0 ? 'Unresolved recourse / 有未清追偿债务' : profile.equity <= 0 ? 'Nonpositive equity / 权益不足' : profile.risk > .4 ? 'Delivery risk exceeds policy / 履约风险超限' : exposure > limit ? 'Company bond capacity exhausted / 公司担保额度不足' : used + exposure > s.cash ? 'Surety capital fully committed / 担保机构资本已占满' : t.cash < premium ? 'Insufficient premium cash / 保费现金不足' : '';
    return { required: true, approved: !reason, reason: reason || 'Equity, backlog, crew capacity and capital reserve pass / 权益、在手工程、施工能力及资本储备通过', premium, exposure, limit, risk: profile.risk };
}
export function bindBonds(r, p) { if (!r.institutionsVersion)
    return; for (const m of members(p)) {
    const t = r.teams.find(t => t.id === m.id), q = suretyQuote(r, t, p, portion(p, t.id, p.price));
    if (!q.required)
        continue;
    if (!q.approved)
        fail(q.reason);
    expense(r, t, q.premium, 'surety_premium');
    t.suretyPremiums = money((t.suretyPremiums || 0) + q.premium);
    const s = r.institutions.surety;
    s.cash = money(s.cash + q.premium);
    s.profit = money(s.profit + q.premium);
    s.bonds.push({ project: p.id, company: t.id, exposure: q.exposure, premium: q.premium, status: 'active', issued: r.time });
} }
export function assignEquipment(r, p) { if (!r.institutions)
    return; for (const m of members(p)) {
    const e = assets(r, { id: m.id }).find(e => !e.project && e.price == null && e.condition > .2);
    if (e) {
        e.project = p.id;
        e.revision++;
    }
} }
export function equipmentSpeed(r, p) { const eq = r.institutions?.equipment.filter(e => e.project === p.id) || []; return 1 + Math.min(.18, eq.reduce((n, e) => n + ({excavator:.12,crane:.16,plant:.10}[e.kind]||.10) * e.condition, 0)); }
export function closeInstitutionsProject(r, p) {
    if (!r.institutions)
        return;
    for (const e of r.institutions.equipment.filter(e => e.project === p.id)) {
        e.project = null;
        e.revision++;
    }
    for (const b of r.institutions.surety.bonds.filter(b => b.project === p.id && b.status === 'active')) {
        if (p.state === 'done') {
            b.status = 'released';
            b.closed = r.time;
            continue;
        }
        if (p.state !== 'terminated')
            continue;
        // Bond pays the owner, never the contractor. Limited completion-cost compensation;
        // the contractor owes the surety the same amount under indemnity.
        const t = r.teams.find(t => t.id === b.company), remaining = sum((p.costPayments || []).filter(x => !x.paid), x => portion(p, t.id, x.lockedAmount ?? x.amount)), claim = money(Math.min(b.exposure, remaining * .25 + portion(p, t.id, p.price) * .05));
        b.status = 'claimed';
        b.claim = claim;
        b.closed = r.time;
        r.institutions.surety.cash = money(r.institutions.surety.cash - claim);
        t.suretyRecourse = money(recourse(t) + claim);
        t.profit = money(t.profit - claim);
        decisionEvent(r, t, 'surety_claim', { project: p.id, claim, beneficiary: 'owner' }, 'system');
    }
}
export function tickInstitutions(r) {
    if (!r.institutionsVersion)
        return;
    initInstitutions(r);
    supply(r);
    for (const e of r.institutions.equipment) {
        const t = r.teams.find(t => t.id === e.owner);
        if (!t || t.bankrupt)
            continue;
        e.age = (e.age || 0) + 1;
        const depreciation = money(Math.min(e.basis * .8, e.basis * .8 * e.age / (r.duration * 2))), delta = money(depreciation - (e.depreciated || 0));
        e.book = money(e.book - delta);
        e.depreciated = depreciation;
        t.profit = money(t.profit - delta);
        t.depreciation = money((t.depreciation || 0) + delta);
        if (e.project) {
            e.use = (e.use || 0) + 1;
            e.condition = Math.max(.2, e.condition - .1 / r.duration);
            const total = money(e.replacement * .06 * e.use / r.duration), maintenance = money(total - (e.maintenance || 0));
            e.maintenance = total;
            if (maintenance) {
                expense(r, t, maintenance, 'equipment_maintenance');
                t.equipmentMaintenance = money((t.equipmentMaintenance || 0) + maintenance);
            }
        }
    }
    for (const l of r.institutions.bank.loans) {
        const t = r.teams.find(t => t.id === l.company);
        if (!t || t.bankrupt || l.status === 'repaid' || l.status === 'defaulted')
            continue;
        l.rawInterest = (l.rawInterest || 0) + l.principal * l.rate / r.duration;
        const total = money(l.rawInterest), delta = money(total - (l.charged || 0));
        l.charged = total;
        l.interest = money(l.interest + delta); t.bankAccrued=money((t.bankAccrued||0)+delta);
        t.profit = money(t.profit - delta);
        t.bankInterest = money((t.bankInterest || 0) + delta);
        r.institutions.bank.profit = money(r.institutions.bank.profit + delta);
        if (r.time >= l.due) {
            payLoan(r, t, l, Math.max(0, t.cash - 10));
            if (l.principal || l.interest) {
                l.status = 'overdue';
                if (r.time >= l.due + 30)
                    defaultLoan(r, t, l);
            }
        }
    }
}
function defaultLoan(r, t, l) { if (l.status === 'defaulted' || l.status === 'repaid')
    return; const e = r.institutions.equipment.find(e => e.id === l.asset && e.owner === t.id); if (e) {
    e.project = null;
    const proceeds = money(e.replacement * e.condition * .4);
    dispose(r, t, e, proceeds, 'retired');
    e.lien = null;
    payLoan(r, t, l, proceeds);
} l.status = l.principal || l.interest ? 'defaulted' : 'repaid'; if (l.status === 'defaulted') {
    t.bankDefaults = (t.bankDefaults || 0) + 1;
    decisionEvent(r, t, 'bank_default', { loan: l.id, debt: money(l.principal + l.interest) }, 'system');
} }
export function exitInstitutions(r, t) { if (!r.institutions)
    return; for (const p of r.projects.filter(p => p.state === 'terminated' && participates(p, t.id)))
    closeInstitutionsProject(r, p); for (const l of r.institutions.bank.loans.filter(l => l.company === t.id))
    defaultLoan(r, t, l); }
export function settleInstitutions(r, t) { if (!r.institutions)
    return; for (const l of r.institutions.bank.loans.filter(l => l.company === t.id && l.status !== 'defaulted'))
    payLoan(r, t, l, Math.max(0, t.cash)); }
export function institutionsView(r, t) { if (!r.institutionsVersion)
    return null; initInstitutions(r); return { bank: { cash: r.institutions.bank.cash, quote: t ? bankQuote(r, t) : null, loans: t ? r.institutions.bank.loans.filter(l => l.company === t.id) : [] }, surety: { cash: r.institutions.surety.cash, exposure: sum(r.institutions.surety.bonds.filter(b => b.status === 'active'), b => b.exposure), bonds: t ? r.institutions.surety.bonds.filter(b => b.company === t.id) : [] }, equipment: r.institutions.equipment.filter(e => e.owner !== 'retired').map(e => ({ ...e, finance: t && e.price != null && e.owner !== t.id ? bankQuote(r, t, 'equipment', e.id) : null })), recourse: t ? recourse(t) : 0 }; }
