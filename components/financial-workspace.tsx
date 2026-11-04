'use client';
import { useState } from 'react';
import { localize, translate } from '../lib/i18n.mjs';
const fmt = (n: any) => n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export default function FinancialWorkspace({ state, language, busy, act }: any) {
    const c = (z: string, e: string) => localize(language === 'zh' ? z : e, language);
    const [selected, setSelected] = useState(''), [tab, setTab] = useState('statements');
    const companies = state.phase === 'finished' ? (state.debrief?.companies || []) : state.host ? (state.participants || []).map((x: any) => x.company) : state.me ? [state.me] : [];
    const company = companies.find((x: any) => x.id === selected) || companies[0];
    const f = company?.financials;
    return <details className="panel financial-workspace"><summary><strong>{c('财务中心：报表、比率与预算', 'Finance center: statements, ratios & budgets')}</strong></summary>
 <p>{c('查看公司资产、负债、盈利与现金流。金额单位：万美元。', 'Track assets, debt, earnings and cash flow. Amounts: USD 10k.')}</p>
 {companies.length > 1 && <label>{c('选择公司', 'Select company')}<select value={company?.id || ''} onChange={e => setSelected(e.target.value)}>{companies.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
 {!company ? <p>{c('公司加入后即可查看财务游戏。', 'The finance lab becomes available when a company joins.')}</p> : <>
 <h3>{company.name}</h3>
 <nav className="tabs" aria-label={c('财务游戏栏目', 'Finance lab sections')}>{[['statements', c('财务报表', 'Statements')], ['ratios', c('比率分析', 'Ratios')], ['budget', c('预算与实际', 'Budget & actual')], ['review', c('财务趋势', 'Financial trends')], ['ledger', c('现金流水', 'Cash ledger')]].map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)} className={tab === id ? 'active' : ''}>{label}</button>)}</nav>
 {tab === 'budget' ? <Budget key={`${state.round}-${company.id}`} f={f} company={company} state={state} busy={busy} act={act} c={c} language={language}/> : !f?.available ? <p>{c('新局开始经营后生成报表。旧局没有期初记录时不补造数据；可重新开局使用。首次中标前可先设置预算。', 'Statements start when trading begins in a new round. Older rounds without opening records are not reconstructed. Set a budget before your first award.')}</p> : <>
 <p className="small">{c('税前经营口径；报表按完工确认收入，计入已发生未支付费用。升级支出费用化，设备资本化并折旧；未模拟存货、所得税及长期债务。报表不改变比赛排名。', 'Pre-tax simulation basis: completion revenue with accrued expenses. Upgrades are expensed. Equipment is capitalized and depreciated. Inventory, income tax and long-term debt are not modeled. Reports do not change rankings.')}</p>
 {tab === 'statements' && <>
 <h3>{c('资产负债表', 'Balance sheet')}</h3><DataTable headers={[c('项目', 'Item'), c('金额', 'Amount')]} rows={[
                        [c('现金（非负余额）', 'Cash (nonnegative balance)'), f.balance.cash], [c('完工应收款（含未收保留款）', 'Completed receivables (including retainage)'), f.balance.receivables], [c('在建成本资产', 'Work-in-progress cost asset'), f.balance.wip], [c('应收利息', 'Interest receivable'), f.balance.interestReceivable], [c('流动资产', 'Current assets'), f.balance.currentAssets],
                        [c('设备固定资产净值','Equipment net book value'),f.balance.fixedAssets], [c('资产总额','Total assets'),f.balance.totalAssets],
                        [c('借款、应付利息与担保追偿', 'Loans, interest and surety recourse'), f.balance.debt], [c('项目预收款／终止项目待结算款', 'Project advances / unsettled termination receipts'), f.balance.advances], [c('应计未付费用', 'Accrued expenses payable'), f.balance.accruedExpenses], [c('负现金余额对应的资金缺口', 'Funding deficit from negative cash'), f.balance.overdraft], [c('流动负债／负债总额', 'Current liabilities / total liabilities'), f.balance.totalLiabilities],
                        [c('期初投入资本', 'Opening contributed capital'), f.balance.capital], [c('累计税前留存结果', 'Accumulated pre-tax result'), f.balance.retainedEarnings], [c('所有者权益', 'Owners’ equity'), f.balance.equity]
                    ].map(([label, value]) => [label, fmt(value)])}/>
 <p className={Math.abs(f.balance.balanceDifference) <= .05 ? 'positive' : 'error'}>{c('资产 − 负债 − 权益 =', 'Assets − liabilities − equity =')} {fmt(f.balance.balanceDifference)}</p>
 <h3>{c('利润表', 'Income statement')}</h3><DataTable headers={[c('项目', 'Item'), c('金额', 'Amount')]} rows={[
                        [c('已确认营业收入', 'Recognized revenue'), f.income.revenue], [c('已确认直接成本', 'Recognized direct costs'), f.income.directCost], [c('毛利润', 'Gross profit'), f.income.grossProfit], [c('公司管理费用（含应计）', 'Company overhead (including accruals)'), f.income.overhead], [c('其他费用（升级、融资、风险等）', 'Other expenses (upgrades, finance, risk)'), f.income.otherExpenses], [c('利息收入（含应计）', 'Interest income (including accruals)'), f.income.interestIncome], [c('终止项目成本核销', 'Terminated project cost write-off'), f.income.writeoff], [c('税前利润', 'Pre-tax profit'), f.income.pretaxProfit]
                    ].map(([label, value]) => [label, fmt(value)])}/>
 <p className="small">{c('其他费用明细（已包含，不重复扣减）','Details included in other expenses; not deducted twice')}: {c('设备折旧','Depreciation')} {fmt(f.income.depreciation)} · {c('银行利息','Bank interest')} {fmt(f.income.bankInterest)} · {c('担保保费','Surety premium')} {fmt(f.income.suretyPremiums)} · {c('维护费','Upkeep')} {fmt(f.income.equipmentMaintenance)} · {c('设备处置损益','Disposal gain/loss')} {fmt(f.income.disposalGain)}</p><p>{c('尚未发生的施工成本是未来承诺，不是当前应付账款。终止项目已付成本在报表中核销；其已收款暂列待结算负债，不假定已经退还。', 'Future construction costs are commitments, not current payables. Terminated costs are written off; receipts remain unsettled liabilities without assuming a refund.')}</p>
 <p>{c('计分利润另扣在建预计亏损；报表利润与计分利润请分别阅读。', 'Scored profit separately deducts expected WIP losses; distinguish reporting profit from scored profit.')}</p>
 </>}
 {tab === 'ratios' && <>
 <h3>{c('财务比率与公式', 'Financial ratios and formulas')}</h3><DataTable headers={[c('指标', 'Measure'), c('计算方法', 'Formula'), c('结果', 'Result')]} rows={[
                        [c('营运资本', 'Working capital'), c('流动资产 − 流动负债', 'Current assets − current liabilities'), fmt(f.ratios.workingCapital)],
                        [c('流动比率', 'Current ratio'), c('流动资产 ÷ 流动负债', 'Current assets / current liabilities'), fmt(f.ratios.current)],
                        [c('速动比率', 'Quick ratio'), c('（现金＋完工应收款＋应收利息）÷流动负债', '(Cash + completed receivables + interest receivable) / current liabilities'), fmt(f.ratios.quick)],
                        [c('税前资产回报率 ROA', 'Pre-tax return on assets'), c('税前利润 ÷ 期末资产', 'Pre-tax profit / ending assets'), pct(f.ratios.roa)],
                        [c('税前净资产收益率 ROE', 'Pre-tax return on equity'), c('税前利润 ÷ 期末权益', 'Pre-tax profit / ending equity'), pct(f.ratios.roe)],
                        [c('税前销售净利率 ROS', 'Pre-tax return on sales'), c('税前利润 ÷ 已确认收入', 'Pre-tax profit / recognized revenue'), pct(f.ratios.ros)],
                        [c('债务权益比率', 'Debt-to-equity ratio'), c('总负债 ÷ 所有者权益', 'Total liabilities / owners’ equity'), pct(f.ratios.debtEquity)]
                    ]}/>
 <p>{c('分母为零或负数时显示“—”，不是零风险。ROA、ROE使用期末余额。', 'A zero or negative denominator displays “—”, not zero risk. ROA and ROE use ending balances.')}</p>
 <p>{c('在建成本无法快速变现，因此本模型从速动资产中剔除它。', 'WIP costs cannot be quickly converted to cash and are excluded from quick assets. ')}</p>
 </>}
 {tab === 'review' && <>
 <h3>{c('本局财务趋势', 'Financial trends within this round')}</h3><DataTable headers={[c('经营分钟', 'Trading minute'), c('现金', 'Cash'), c('收入', 'Revenue'), c('税前利润', 'Pre-tax profit'), c('营运资本', 'Working capital'), c('流动比率', 'Current ratio')]} rows={f.history.map((x: any) => [fmt(x.time / 60), fmt(x.cash), fmt(x.revenue), fmt(x.profit), fmt(x.workingCapital), fmt(x.current)])}/>
 <p>{c('每经营分钟及结束时记录一次。这是同一局内的期间比较，不是五年历史。', 'Recorded each trading minute and at settlement. These are periods within one round, not a five-year history.')}</p>
</>}
 {tab === 'ledger' && <><h3>{c('现金流水与会计含义', 'Cash ledger and accounting meaning')}</h3><p>{c('借款增加现金和负债，不增加收入；还本金不减少利润；工程付款在完工前形成在建成本资产。此表是现金流水，不是完整复式总账。', 'Borrowing increases cash and liabilities, not revenue. Principal repayment is not an expense. Construction payments create WIP before completion. This is a cash ledger, not a full double-entry general ledger.')}</p><DataTable headers={[c('秒', 'Second'), c('事项', 'Event'), c('项目', 'Project'), c('现金变化', 'Cash change'), c('现金余额', 'Cash balance')]} rows={f.ledger.slice(-100).map((e: any) => [e.time, ledgerLabel(e.type, c), e.project || '—', fmt(e.amount), fmt(e.balance)])}/><p className="small">{c('显示最近100笔；完整财务数据包含在赛后导出文件中。', 'Showing the latest 100 entries; complete financial data is included in the debrief export.')}</p></>}
 </>}
 </>}
 </details>;
}
function pct(n: any) { return n == null ? '—' : fmt(n * 100) + '%'; }
function DataTable({ headers, rows }: any) { return <div className="tablewrap"><table><thead><tr>{headers.map((h: string, i: number) => <th key={i}>{h}</th>)}</tr></thead><tbody>{rows.map((row: any[], i: number) => <tr key={i}>{row.map((cell: any, j: number) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>; }
function ledgerLabel(type: string, c: any) { const labels: any = {bank_loan:['银行放款','Bank loan'],bank_fee:['银行手续费','Bank fee'],bank_interest:['支付银行利息','Bank interest paid'],bank_repay:['偿还银行本金','Bank principal repayment'],equipment_purchase:['购置设备','Equipment purchase'],equipment_sale:['出售设备','Equipment disposal'],equipment_maintenance:['设备维护','Equipment upkeep'],surety_premium:['担保保费','Surety premium'],surety_recourse:['偿还担保追偿','Surety recourse repayment'], project_cost: ['工程付款', 'Construction payment'], project_receipt: ['业主回款', 'Owner receipt'], loan: ['借款本金', 'Loan principal'], repay: ['偿还本金', 'Principal repayment'], management_overhead: ['管理费用', 'Management overhead'], financing_fee: ['融资费用', 'Financing fee'], guarantee_draw: ['项目授信提款', 'Project credit draw'], guarantee_repay: ['项目授信还款', 'Project credit repayment'], guarantee_fee: ['授信开通费用', 'Credit setup fee'], guarantee_finance: ['授信提款费用', 'Credit draw fee'], cash_interest: ['利息收入', 'Interest income'], upgrade: ['能力升级费用', 'Capability upgrade expense'], welfare: ['员工福利', 'Employee wellbeing'], information_fee: ['信息支持费用', 'Information support expense'] }; return labels[type] ? c(...labels[type]) : type; }
function Budget({ f, company, state, busy, act, c, language }: any) {
    const [values, setValues] = useState<any>(() => Object.fromEntries(['revenue', 'directCost', 'overhead', 'other'].map(k => [k, f?.budget?.[k] ?? ''])));
    const editable = f?.budgetEditable && state.me?.id === company.id;
    const complete = Object.values(values).every(v => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0);
    return <>
 <h3>{c('全局经营预算', 'Whole-round operating budget')}</h3>
 <p>{c('在首次中标前填写并保存，首次中标后锁定。预算是整局目标，不是系统替你预测的收入。', 'Save before your first award; the first award locks the budget. It is your whole-round target, not a system revenue forecast.')}</p>
 {editable && <form onSubmit={e => { e.preventDefault(); act('finance_budget', { budget: values }); }}><div className="finance-budget-inputs">{[['revenue', c('预算收入', 'Budget revenue')], ['directCost', c('预算直接成本', 'Budget direct costs')], ['overhead', c('预算管理费用', 'Budget overhead')], ['other', c('其他净费用（费用减利息收入）', 'Other net expenses (expenses less interest)')]].map(([k, label]) => <label key={k}>{label}<input type="number" min="0" max="10000000" step="0.01" required value={values[k]} onChange={e => setValues({ ...values, [k]: e.target.value })}/></label>)}</div><p>{c('目标利润：', 'Target profit:')} {complete ? fmt(Number(values.revenue) - Number(values.directCost) - Number(values.overhead) - Number(values.other)) : '—'}</p><button className="primary" disabled={busy || !complete}>{c('保存预算', 'Save budget')}</button></form>}
 {f?.budget ? <><p>{c('已保存预算，经营秒数：', 'Budget saved at trading second:')} {f.budget.savedAt}</p><DataTable headers={[c('项目', 'Item'), c('整局预算', 'Whole-round budget'), c('累计已确认实际', 'Recognized actual to date'), c('实际减预算', 'Actual minus budget')]} rows={[
                ['revenue', c('收入', 'Revenue'), f.income?.revenue], ['directCost', c('直接成本', 'Direct cost'), f.income?.directCost], ['overhead', c('管理费用', 'Overhead'), f.income?.overhead], ['other', c('其他净费用', 'Other net expenses'), f.actualOther], ['profit', c('税前利润', 'Pre-tax profit'), f.income?.pretaxProfit]
            ].map(([key, label, actual]) => [label, fmt(f.budget[key]), fmt(actual), fmt(f.variance?.[key])])}/><p>{c('收入与利润的正差异通常有利，费用的正差异通常不利。进行中实际值尚未覆盖整局；不要把未发生的预算支出当作节约。', 'Positive revenue/profit variance is usually favorable; positive expense variance is usually unfavorable. During play, actuals cover less than the full round; unspent future budget is not a saving.')}</p></> : <p>{c('尚未保存事前预算。没有预算时不反推或补造预算差异。', 'No original budget saved. Variances are not reconstructed without a budget.')}</p>}
 <h3>{c('投标预算与项目结果', 'Bid budgets and project outcomes')}</h3><DataTable headers={[c('项目', 'Project'), c('基准来源', 'Baseline'), c('预算直接成本', 'Budget direct cost'), c('已付成本', 'Paid cost'), c('实际／预测总成本', 'Actual / forecast total cost'), c('成本差异', 'Cost variance'), c('状态', 'Status')]} rows={(f?.projects || []).map((p: any) => [translate(p.name, language), p.budget ? c(p.budget.source === 'bid' ? '投标时' : '授标时', p.budget.source === 'bid' ? 'At bid' : 'At award') : '—', fmt(p.budget?.directCost), fmt(p.paidCost), p.state === 'terminated' ? '—' : fmt(p.actualCost ?? p.forecastCost), p.state === 'terminated' ? '—' : fmt(p.costVariance), c(p.state === 'done' ? '已完工' : p.state === 'terminated' ? '已终止' : '施工中', p.state === 'done' ? 'Completed' : p.state === 'terminated' ? 'Terminated' : 'In progress')])}/>
 <p>{c('完工项目用实际成本；在建项目用已付成本加剩余已知估算，不包含未来隐藏冲击。项目表只比较直接成本，避免把公司管理费在多个项目中重复计算。', 'Completed jobs use actual costs; active jobs use paid costs plus known remaining estimates, excluding hidden future shocks. Project comparisons cover direct costs only, avoiding duplicate company overhead across jobs.')}</p>
 <h3>{c('报价加成练习', 'Markup exercise')}</h3><p>{c('（预算管理费用＋其他净费用＋目标利润）÷预算直接成本＝所需加成率。加成率以成本为分母，利润率以收入为分母。', '(Budget overhead + other net expenses + target profit) / budget direct costs = required markup. Markup uses cost as denominator; margin uses revenue.')}</p><p>{c('预算对应加成率：', 'Markup implied by budget:')} {f?.budget?.directCost > 0 ? pct((f.budget.overhead + f.budget.other + f.budget.profit) / f.budget.directCost) : '—'}</p>
 </>;
}
