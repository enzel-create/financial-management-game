import { randomInt } from './catalog.mjs';
export const NEWS_TRACKS = { digital: ['数字设施', 'Digital facilities', '服务器冷却与供电设备', 'server cooling and power equipment'], industrial: ['工业能源', 'Industrial & energy', '工业设备与电气组件', 'industrial machinery and electrical components'], medical: ['医疗设施', 'Medical facilities', '洁净系统与医用设备', 'clean-room systems and medical equipment'], infrastructure: ['公共基建', 'Public infrastructure', '道路管网与桥梁材料', 'road, utility and bridge materials'], buildings: ['住宅商业', 'Residential & commercial', '建筑围护与室内装配材料', 'building envelope and interior assemblies'] };
// Twenty authored scenarios in each of five specialist markets. Fictional game events.
const scenarios = [
    ['供应商集中检修', 'Supplier maintenance', 'cost', .04], ['关键组件短缺', 'Critical component shortage', 'cost', .06], ['运输费用上调', 'Freight surcharge', 'cost', .03], ['采购检验加严', 'Tighter procurement inspection', 'cost', .02],
    ['库存释放', 'Inventory release', 'cost', -.04], ['采购联盟折扣', 'Purchasing alliance discount', 'cost', -.05], ['替代供应商投产', 'Alternative supplier online', 'cost', -.03], ['运输通道恢复', 'Freight routes restored', 'cost', -.02],
    ['新一轮建设资金增加', 'New construction funding expands', 'demand', .08], ['业主投资计划扩大', 'Owners expand investment plans', 'demand', .05], ['新建资金计划收缩', 'New construction funding contracts', 'demand', -.06], ['投资审批趋谨慎', 'Investment approvals tighten', 'demand', -.04],
    ['付款审核积压', 'Payment certification backlog', 'receipt', 8], ['付款系统维护', 'Payment system maintenance', 'receipt', 5], ['快速付款通道开启', 'Fast payment channel opens', 'receipt', -6], ['验收资料电子化', 'Digital certification rollout', 'receipt', -4],
    ['作业窗口受限', 'Restricted work windows', 'speed', -.08], ['供应交接拥堵', 'Delivery coordination congestion', 'speed', -.06], ['协同施工试点', 'Coordinated delivery pilot', 'speed', .08], ['作业衔接改善', 'Improved work sequencing', 'speed', .06]
];
export const NEWS_CATALOG = Object.entries(NEWS_TRACKS).flatMap(([track, names]) => scenarios.map(([zh, en, kind, value], i) => ({ id: `${track}-${i + 1}`, track, kind, value, title: [`${names[0]}：${zh}`, `${names[1]}: ${en}`], context: [`${names[2]}相关市场出现变化。`, `Conditions change in the market for ${names[3]}.`], duration: 90 })));
export const newsEnabled = r => r.newsVersion === 1 && r.modelVersion === 2;
export function newsEffect(r, p, kind, at = r.time) { if (!newsEnabled(r))
    return 0; const sum = (r.news || []).filter(n => n.track === p.specialty && n.kind === kind && n.time <= at && at < n.endsAt).reduce((a, n) => a + n.value, 0), cap = kind === 'receipt' ? 10 : kind === 'speed' ? .1 : .08; return Math.max(-cap, Math.min(cap, sum)); }
export function newsCost(r, p, amount, at = r.time) { return Math.round(amount * (1 + newsEffect(r, p, 'cost', at)) * 100) / 100; }
export const newsInterval = () => 25 + randomInt(26);
export function publishNews(r) {
    if (!newsEnabled(r) || r.phase !== 'running' || r.time >= r.duration)
        return;
    const used = new Set((r.news || []).map(n => n.id)), pool = NEWS_CATALOG.filter(n => !used.has(n.id)), count = Math.min(2 + randomInt(4), pool.length), chosen = [];
    for (let i = 0; i < count; i++) {
        let options = pool.filter(n => !chosen.some(x => x.track === n.track));
        if (!options.length)
            options = pool;
        const n = options[randomInt(options.length)], duration = 45 + randomInt(76);
        pool.splice(pool.indexOf(n), 1);
        chosen.push({ ...n, duration, time: r.time, endsAt: Math.min(r.duration, r.time + duration) });
    }
    r.news ??= [];
    r.news.push(...chosen);
    r.newsScheduleVersion = 2;
    r.nextNews = pool.length ? r.time + newsInterval() : null;
}
export function advanceNews(r) {
    if (!newsEnabled(r) || r.phase !== 'running')
        return;
    if (r.newsScheduleVersion !== 2) {
        r.newsScheduleVersion = 2;
        r.nextNews = r.time + newsInterval();
    }
    if (r.nextNews != null && r.time >= r.nextNews)
        publishNews(r);
}
export function newsView(r) { return { newsVersion: newsEnabled(r) ? 1 : 0, newsScheduleVersion: r.newsScheduleVersion || 1, news: newsEnabled(r) ? r.news || [] : [], nextNews: newsEnabled(r) && r.nextNews != null && r.nextNews < r.duration ? r.nextNews : null }; }
