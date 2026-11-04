'use client';
import { localize } from '../lib/i18n.mjs';
export default function ProjectPayments({ project: p, language, time, expanded = false }: {
    project: any;
    language: 'zh' | 'en' | 'es' | 'fr' | 'hi';
    time: number;
    expanded?: boolean;
}) {
    const en = language !== 'zh', c = (zh: string, english: string) => localize(en ? english : zh, language), n = (v: number) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (p.paymentVersion !== 2)
        return null;
    const costs = p.costPayments || p.plannedCosts || p.costSchedule;
    const receipts = p.receipts || p.receiptSchedule;
    const title = c('付款与回款节点', 'Cost & receipt milestones') + (p.blocked ? ' · ' + c('缺款停工', 'Funding hold') : '');
    const body = <>{localize(!p.newsImpact && <p className="small">{c('未雇佣信息支持：未支付节点为基础预测，未汇总当前新闻调整；已付及已审核款项按实际记录显示。', 'Without information support, unpaid milestones show base projections without combined news adjustments. Paid and certified amounts show actual records.')}</p>, language)}
  {localize(p.state === 'terminated' && <p className="negative">{c('公司游戏退出，项目已终止。以下为冻结记录，后续款项不再收付。', 'Company bankrupt; project terminated. This ledger is frozen. No further costs or receipts are processed.')}</p>, language)}<p className="small">{c('按实际工程进度触发，不按墙钟时间；金额单位：万美元。', 'Triggered by actual work progress, not wall-clock time. Amounts: × $10,000.')}</p>
  {localize(p.paidCost !== undefined && <p className="small">{c('已付成本', 'Costs paid')} {localize(n(p.paidCost), language)} · {c('已收款', 'Cash received')} {localize(n(p.received), language)}</p>, language)}
  <b>{c('成本支出', 'Cost payments')}</b><ol>{localize(costs?.map((s: any, i: number) => <li key={i}><span>{localize(s.at, language)}% · {localize(s.label[en ? 1 : 0], language)}</span><strong>{localize(s.amount !== undefined ? n(s.paidAmount ?? s.lockedAmount ?? Math.round(s.amount * (1 + (p.newsImpact?.cost || 0)) * 100) / 100) : s.share + '%', language)}{localize(s.amount !== undefined ? ' (' + s.share + '%)' : '', language)}</strong><small>{localize(p.costPayments ? (s.paid ? c('已支付', 'Paid') : c('待支付', 'Unpaid')) : c('计划支出', 'Planned payment'), language)}{localize(s.orderedAt != null ? ' · ' + c('锁价于', 'Price locked at') + ' ' + s.orderedAt + 's' : '', language)}{localize(s.paidAt != null ? ' · ' + c('支付于', 'Paid at') + ' ' + s.paidAt + 's' : '', language)}{localize(i === costs.length - 1 ? ' · ' + (p.contextVersion ? c('材料风险＋返工风险', 'material + rework risk') : s.paid ? c('已含材料冲击', 'includes material shock') : c('另加材料冲击', 'plus material shock')) : '', language)}</small></li>), language)}</ol>
  {localize(p.retainageRate > 0 && <p className="small">{c('保留款需95%进度后提交收尾资料；完工验收后开始30秒模拟审核。6级合规自动提交。', 'Submit closeout from 95% progress to release retainage after completion and a 30s simulated review. Compliance Lv.6 submits automatically.')}</p>, language)}<b>{c('业主回款', 'Owner receipts')}</b><ol>{localize(receipts?.map((s: any, i: number) => <li key={i}><span>{localize(s.at, language)}% · {localize(s.label[en ? 1 : 0], language)}</span><strong>{localize(s.amount !== undefined ? n(s.amount) + ' (' + s.share + '%)' : s.share + '% ' + c('合同额', 'of contract'), language)}</strong><small>{localize(s.received ? c('已到账', 'Received') + (s.receivedAt != null ? ' · ' + s.receivedAt + 's' : '') : s.due != null ? c('审核待到账', 'Certified; awaiting payment') + ' · ' + Math.max(0, s.due - time) + 's' : c('达标后等待', 'After trigger, wait') + ' ' + Math.max(0, s.delay + (p.receiptDelay || 0) + (p.newsImpact?.receipt || 0)) + 's', language)}</small></li>), language)}</ol>
  {localize(p.newsCostDelta != null && <p className="small">{c('累计新闻成本调整（已包含在已付成本中）', 'Cumulative news cost adjustment (included in paid costs)')}: {localize(n(p.newsCostDelta), language)}</p>, language)}{localize(p.extra !== undefined && <p className="small">{localize(p.contextVersion ? c('材料与返工追加成本', 'Material & rework risk cost') : c('材料冲击追加成本', 'Material shock surcharge'), language)}: {localize(n(p.extra), language)}</p>, language)}
  {localize(p.blocked && <p className="negative small">{c('现金不足以支付下一节点。项目暂停并占用施工位；等待回款或借款，资金足够后自动继续。', 'Insufficient cash for the next milestone. Work stops and occupies a crew slot. Wait for receipts or borrow; work resumes automatically when funded.')}</p>, language)}
 </>;
    return expanded ? <section className="payment-plan"><h4>{localize(title, language)}</h4>{localize(body, language)}</section> : <details className="payment-plan" open={!!p.blocked}><summary>{localize(title, language)}</summary>{localize(body, language)}</details>;
}
