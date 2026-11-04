import { localize } from '../lib/i18n.mjs';
import { participates } from '../lib/ownership.mjs';
import ProjectPayments from './project-payments';
import ProjectCompliance from './project-compliance';
import { translate } from '../lib/i18n.mjs';
export default function CompanyProjects({ state, language, busy, act }: any) {
    const c = (z: string, e: string) => localize(language !== 'zh' ? e : z, language), me = state.me;
    if (!me)
        return null;
    const projects = state.projects.filter((p: any) => participates(p, me.id) && (p.state === 'building' || p.state === 'done' && p.received < p.price || p.state === 'terminated')).sort((a: any, b: any) => Number(b.state === 'building') - Number(a.state === 'building') || a.started - b.started);
    const n = (x: number) => Number(x || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    return <section className="company-projects"><div className="sectionhead"><h2>{c('我的在建与待回款项目', 'My ongoing projects & pending receipts')}</h2><span>{localize(projects.length, language)} {c('个项目', 'projects')}</span></div><p className="small">{c('每个项目的全部成本和回款节点直接展开。已完工但未收齐款项的项目继续保留；游戏退出终止的项目显示冻结记录。金额：万美元；时间为正式开市后的游戏秒数。', 'All cost and receipt milestones are expanded for each project. Completed projects remain here until fully paid; terminated projects show frozen records. Money: USD 10k; times are game seconds since trading opened.')}</p>
 {localize(!projects.length && <section className="panel"><p>{c('暂无在建或待回款项目。中标后，项目及全部节点会自动出现在这里。', 'No ongoing projects or pending receipts. After an award, the project and all milestones appear here automatically.')}</p></section>, language)}
 {projects.map((p: any) => <article className="panel company-project" key={p.id}><div className="sectionhead"><h3>{translate(p.name, language)}</h3><span className="badge">{localize(p.state === 'building' ? c('在建', 'In progress') : p.state === 'done' ? c('完工待收款', 'Completed · awaiting receipts') : c('终止 · 冻结', 'Terminated · frozen'), language)}</span></div>
 <div className="projectfacts"><div><small>{c('合同金额', 'Contract amount')}</small><b>{localize(n(p.price), language)}</b></div><div><small>{c('基础成本', 'Base cost')}</small><b>{localize(n(p.cost), language)}</b></div><div><small>{c('已付成本 / 已收回款', 'Costs paid / receipts collected')}</small><b>{localize(n(p.paidCost), language)} / {localize(n(p.received), language)}</b></div><div><small>{c('工程进度', 'Work progress')}</small><b>{localize(n(100 * (1 - p.remaining / p.total)), language)}%</b></div></div>
 {localize(p.state === 'building' && <><div className="progress"><i style={{ width: Math.max(0, Math.min(100, 100 * (1 - p.remaining / p.total))) + '%' }}/></div><p className="small">{c('占用施工位', 'Crew slots used')} {localize(p.crewSlots || 1, language)} · {c('剩余工作量', 'Remaining work')} {localize(Math.ceil(p.remaining), language)}{localize("s · ", language)}{localize(p.blocked ? c('缺款停工', 'Funding hold') : p.holdUntil > state.time ? c('整改停工', 'Compliance hold') : c('按实际施工速度推进', 'Advances at the actual work rate'), language)}</p></>, language)}
 {localize(p.paymentVersion !== 2 ? <p>{c('此旧版项目采用开工一次扣款、完工一次回款。', 'This legacy project pays costs at award and receives payment at completion.')}</p> : <ProjectPayments project={p} language={language} time={state.time} expanded/>, language)}
 {localize(p.joint && <p>{c('联合项目总额；本公司分摊比例：', 'Joint project totals; your share: ')}{localize(p.myShare, language)}%</p>, language)}<ProjectCompliance p={p} state={state} language={language} busy={busy} act={act}/></article>)}
 </section>;
}
