'use client';
import RoomLobby from '../components/room-lobby';
import { ActionControl } from '../components/company-access';

import { localize } from '../lib/i18n.mjs';
import LanguagePicker from '../components/language-picker';
import { CompanyAccessContext } from '../components/company-access';
import TeamMembers from '../components/team-members';
import FinancialWorkspace from '../components/financial-workspace';
import ProjectContext from '../components/project-context';
import ContextRules from '../components/context-rules';
import CompanyFinancialSummary from '../components/company-financial-summary';
import ProjectGuarantee from '../components/project-guarantee';
import InformationSupport from '../components/information-support';
import CashSounds from '../components/cash-sounds';
import ThemePicker from '../components/theme-picker';
import BidNotifications from '../components/bid-notifications';
import HostParticipants from '../components/host-participants';
import MarketNews from '../components/market-news';
import JointBid from '../components/joint-bid';
import { participates } from '../lib/ownership.mjs';
import BidFunding from '../components/bid-funding';
import { useState, useEffect, useRef } from 'react';
import InitialPreparation from '../components/initial-preparation';
import Specializations from '../components/specializations';
import Debrief from '../components/debrief';
import { isSpecialty, getUpgrades } from '../lib/upgrades.mjs';
import { MARKET } from '../lib/market.mjs';
import { translate } from '../lib/i18n.mjs';
import ModernRules from '../components/modern-rules';
import QuickGuide from '../components/quick-guide';
import CompanyProjects from '../components/company-projects';
import ProjectPayments from '../components/project-payments';
import DualRankings from '../components/dual-rankings';
import { BotControls, CompanyStatus, BankruptcyRules } from '../components/bots-bankruptcy';
import StrategicPlan, { Preparation } from '../components/strategic-plan';
import Institutions from '../components/institutions';
import ProjectCompliance from '../components/project-compliance';
import EconomicsRules from '../components/economics-rules';
type State = any;
const num = (x: number) => Number(x || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });
const clock = (x: number) => `${Math.floor(Math.max(0, x) / 60).toString().padStart(2, '0')}:${Math.floor(Math.max(0, x) % 60).toString().padStart(2, '0')}`;
export default function Page() {
    const [language, setLanguage] = useState<'zh' | 'en' | 'es' | 'fr' | 'hi'>('zh');
    const tr = (value: string) => translate(value, language);
    useEffect(() => {
        try {
            const saved = localStorage.getItem('fmg-language');
            if (['zh', 'en', 'es', 'fr', 'hi'].includes(saved || ''))
                setLanguage(saved as any);
        }
        catch { }
    }, []);
    useEffect(() => { document.documentElement.lang = language === 'zh' ? 'zh-CN' : language; document.title = localize(language === 'zh' ? '财务经营游戏' : 'Financial Management Game', language); }, [language]);
    function chooseLanguage(value: 'zh' | 'en' | 'es' | 'fr' | 'hi') {
        setLanguage(value);
        try {
            localStorage.setItem('fmg-language', value);
        }
        catch { }
    }
    const [guideOpen, setGuideOpen] = useState(false), [dismissedGuides, setDismissedGuides] = useState<Record<string, boolean>>({});
    const [state, setState] = useState<State>(null), [session, setSession] = useState<{
        code: string;
        token: string;
    } | null>(null), [code, setCode] = useState(''), [name, setName] = useState(''), [memberName, setMemberName] = useState(''), [minutes, setMinutes] = useState(18), [lobbyPublic,setLobbyPublic]=useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false), [rules, setRules] = useState(false), [tab, setTab] = useState('market'), [bids, setBids] = useState<Record<string, string>>({}), [connected, setConnected] = useState(true), [copied, setCopied] = useState(false);
    const inflight = useRef(false), seq = useRef(0);
    useEffect(() => {
        const c = new URLSearchParams(location.search).get('room');
        if (c)
            setCode(c.toUpperCase());
        try {
            const saved = localStorage.getItem('fmg-session');
            if (saved) {
                const s = JSON.parse(saved);
                if (!c || s.code === c.toUpperCase())
                    setSession(s);
            }
        }
        catch { }
    }, []);
    async function api(payload: any, s = session) {
        const r = await fetch('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(s ? { Authorization: 'Bearer ' + s.token } : {}) }, body: JSON.stringify({ round: state?.round ?? 1, teamRevision: state?.me?.actionRevision ?? 0, ...payload, code: payload.code || s?.code, requestId: crypto.randomUUID() }) });
        let data: any;
        try {
            data = await r.json();
        }
        catch {
            throw Error('服务暂时未响应，请稍后重试');
        }
        if (!r.ok)
            throw Error(data.error || '请求失败');
        return data;
    }
    async function enter(type: string) {
        setBusy(true);
        setError('');
        try {
            const d = await api({ type, code, name, memberName, minutes, lobbyPublic, gameMode: "full" }, null);
            const s = { code: d.code, token: d.token };
            localStorage.setItem('fmg-session', JSON.stringify(s));
            setSession(s);
            setState(d);
            history.replaceState(null, '', '?room=' + d.code);
        }
        catch (e: any) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    }
    async function act(type: string, extra: any = {}) {
        if (inflight.current)
            return;
        if (state?.me && !['guide_step', 'lobby_ready', 'approval_decide', 'approval_cancel'].includes(type) && !state.me.permissions?.includes(type)) {
            setError('当前职位无此操作权限 / Your role cannot perform this action');
            return false;
        }
        inflight.current = true;
        seq.current++;
        setBusy(true);
        setError('');
        try {
            setState(await api({ type, ...extra }));
            setConnected(true);
            return true;
        }
        catch (e: any) {
            setError(e.message);
            if (e.message.includes('队友已更新')) {
                try {
                    setState(await api({ type: 'state' }));
                }
                catch { }
            }
            return false;
        }
        finally {
            inflight.current = false;
            setBusy(false);
        }
    }
    useEffect(() => {
        if (!session)
            return;
        let cancelled = false;
        async function poll() {
            if (inflight.current)
                return;
            let n = seq.current;
            try {
                const d = await api({ type: 'state' }, session);
                if (!cancelled && n === seq.current) {
                    setState(d);
                    setConnected(true);
                }
            }
            catch (e: any) {
                if (!cancelled) {
                    setConnected(false);
                    setError(e.message);
                }
            }
        }
        poll();
        const id = setInterval(poll, 2500);
        return () => { cancelled = true; clearInterval(id); };
    }, [session]);
    useEffect(() => { setBids({}); setTab('market'); setError(''); }, [state?.round]);
    function leave() {
        if (!confirm(tr('退出本设备后将清除本机公司的访问凭证。确认退出？')))
            return;
        localStorage.removeItem('fmg-session');
        setSession(null);
        setState(null);
        setError('');
        history.replaceState(null, '', '/');
    }
    function download() {
        const c = (z: string, e: string) => localize(language !== 'zh' ? e : z, language);
        const rows: any[][] = [[c('评价体系', 'Ranking system'), c('排名', 'Rank'), c('公司', 'Company'), c('得分', 'Score'), c('营业额(万)', 'Revenue (USD 10k)'), c('净利润(万)', 'Net profit (USD 10k)'), c('利润率%', 'Margin %'), c('成长分', 'Growth'), c('现金流分', 'Cash-flow score'), c('员工评价', 'Employee rating'), c('现金(万)', 'Cash (USD 10k)'), c('借款(万)', 'Debt (USD 10k)'), c('未完工预收(万)', 'Unfinished advances (USD 10k)'), c('完工应收(万)', 'Completed receivables (USD 10k)'), c('缺款秒数', 'Shortage seconds'), c('公司状态', 'Company status'), c('评分时点（秒）', 'Score snapshot (seconds)'), c('机器人能力', 'Bot skill')]];
        for (const [kind, list] of [[c('经营成果', 'Performance'), state.rank], [c('健康与成长', 'Health & growth'), state.healthRank || []]] as any) {
            list.forEach((r: any, i: number) => rows.push([kind, i + 1, r.name, r.score, r.revenue, r.profit, r.margin, r.growth, r.cashScore, r.employee, r.cash, r.debt, r.advance, r.receivable, r.shortageSeconds, r.bankrupt ? c('退出结算', 'Exit settlement') : c('当前分数', 'Current score'), r.bankrupt ? r.bankruptAt : state.time, r.bot ? r.skill : '']));
        }
        const csv = '\uFEFF' + rows.map(r => r.map((x: any) => '"' + String(x ?? '').replace(/"/g, '""').replace(/^[=+@-]/, "'$&") + '"').join(',')).join('\n');
        const a = document.createElement('a'), url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.href = url;
        a.download = 'financial-game-' + state.code + '-round-' + state.round + '-rankings.csv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    async function copy() {
        try {
            await navigator.clipboard.writeText(location.origin + '/?room=' + state.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
        catch {
            setError('复制失败，请手动分享地址栏链接。');
        }
    }
    const guideKey = !session ? 'welcome' : state?.phase === 'lobby' ? state.code + ':' + (state.round || 1) : null;
    const mandatoryGuide = !!state?.me && !state?.host && state?.onboardingVersion === 1 && state.guideStep < 10;
    const showGuide = mandatoryGuide || guideOpen || !!(guideKey && !dismissedGuides[guideKey]);
    function openGuide() { setGuideOpen(true); requestAnimationFrame(() => document.getElementById('quick-guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
    function closeGuide() {
        setGuideOpen(false);
        if (guideKey)
            setDismissedGuides(x => ({ ...x, [guideKey]: true }));
    }
    const UPGRADES = getUpgrades(state), me = state?.me;
    const running = state?.phase === 'running' && !me?.bankrupt;
    let mine = state?.projects.filter((p: any) => p.owner === me?.id && p.state === 'building') || [];
    ;
    return <CompanyAccessContext.Provider value={state?.me}><><BidNotifications state={state} language={language}/><header><a className="brand" href="/">{localize("财务经营游戏", language)}<span>{localize("FINANCIAL MANAGEMENT GAME", language)}</span></a><div className="headerRight"><CashSounds state={state} language={language}/><ThemePicker language={language}/><LanguagePicker language={language} onChange={chooseLanguage}/><span className="live"><i className={connected ? '' : 'offline'}/>{localize(session ? (connected ? tr('联机同步') : tr('连接中断')) : tr('财务经营游戏'), language)}</span><button onClick={openGuide}>{localize(language !== 'zh' ? 'Quick guide' : '新手指引', language)}</button><button onClick={() => setRules(true)}>{tr("规则手册 ↗")}</button>{localize(session && <button onClick={leave}>{tr("退出")}</button>, language)}</div></header><main>{localize(error && <div className="error" role="alert">{tr(error)}<button onClick={() => setError('')}>×</button></div>, language)}
    {showGuide && (!!session || guideOpen) && <QuickGuide key={(state?.code || 'welcome') + ':' + (state?.round || 1)} mandatory={mandatoryGuide} progress={state?.guideStep || 0} busy={busy} onAdvance={(step: number) => act('guide_step', { step })} language={language} onClose={closeGuide} onRules={() => setRules(true)}/>}
    {localize(false, language)}{!session ? <><section className="landing"><div className="eyebrow">{tr("多人联机 / 财务决策 / 公司成长")}</div><h1>{tr("财务经营游戏")}<br /><em>{tr("谁来支撑你的公司？")}</em></h1><p>{tr("投下报价，投资优势，照顾团队。")}<br />{localize(tr("在一场 18 分钟的竞争中，平衡规模、利润与人的代价。"), language)}</p><div className="pillrow"><span>{localize(language !== 'zh' ? 'Construction finance · multiplayer simulation' : '建筑财务 · 多人经营', language)}</span><span>{tr("分批发布项目")}</span><span>{tr("实时员工疲劳")}</span></div></section><RoomLobby language={language} selectedCode={code} onSelect={(room:string,company:string)=>{setCode(room);setName(company);document.getElementById("join-company")?.scrollIntoView({behavior:"smooth",block:"start"});}}/><div className="entrygrid"><section className="panel" id="join-company"><div className="eyebrow">{tr("01 / 参与公司")}</div><h2>{tr("进入市场")}</h2><p>{localize(language !== 'zh' ? 'Each member can use their own device. Enter the same room code and company name to operate one company together.' : '每位组员可以使用自己的设备。输入相同房间码和公司名，即可共同经营同一家公司。', language)}</p><label>{tr("房间码")}<input maxLength={8} placeholder={tr("例如 A1B2C3D4")} value={code} onChange={e => setCode(e.target.value.toUpperCase())}/></label><label>{tr("公司名称")}<input maxLength={16} placeholder={tr("给你的公司起个名字")} value={name} onChange={e => setName(e.target.value)}/></label><label>{localize(language !== 'zh' ? 'Your nickname (optional)' : '你的昵称（选填）', language)}<input maxLength={16} value={memberName} onChange={e => setMemberName(e.target.value)} placeholder={localize(language !== 'zh' ? 'e.g. Alex · Finance' : '例如：小李 · 财务', language)}/></label><p className="small">{localize(language !== 'zh' ? 'A new name creates a company before the round starts; an existing name joins that company, including during play. Each company has 1–4 members with role-based controls.' : '开局前，新公司名会创建公司；已有公司名会加入该公司，开局后也可加入。每家公司1–4人，按职位分工操作。', language)}</p><button className="primary wide" disabled={busy || code.length !== 8 || !name.trim()} onClick={() => enter('join')}>{localize(busy ? tr('正在连接…') : tr('加入经营赛 →'), language)}</button></section><section className="panel hostentry"><div className="eyebrow">{tr("02 / 主持人")}</div><h2>{tr("开启一场竞争")}</h2><p>{tr("创建房间、分享链接，让玩家用自己的手机或电脑加入。主持人拥有独立的市场控制台。")}</p>{localize(<><label>{tr("经营时长")}<select value={minutes} onChange={e => setMinutes(Number(e.target.value))}><option value={15}>{tr("15 分钟 · 紧凑经营")}</option><option value={18}>{tr("18 分钟 · 推荐")}</option><option value={20}>{tr("20 分钟 · 深度经营")}</option></select></label><div className="miniRules">{localize(language !== 'zh' ? 'Initial ability points: ' : '初始能力点：', language)}<b>8</b><br />{tr("起始现金 ")}<b>160</b>{tr(" 万美元")}<br />{tr("建议 ")}<b>2–12</b>{tr(" 家公司")}<br />{localize(language !== 'zh' ? 'Two rankings: Performance / Health & growth' : '双排名：经营成果 / 公司健康与成长', language)}</div></>, language)}<label>{localize(language==='zh'?'房间可见性':'Room visibility',language)}<select value={lobbyPublic?'public':'private'} onChange={e=>setLobbyPublic(e.target.value==='public')}><option value="public">{localize(language==='zh'?'公开大厅：其他玩家可以发现':'Public lobby: discoverable by other players',language)}</option><option value="private">{localize(language==='zh'?'仅凭房间码加入':'Unlisted: join by room code only',language)}</option></select></label><button className="outline wide" disabled={busy} onClick={() => enter('create')}>{localize((language !== 'zh' ? 'Create full-version room +' : '创建完整经营版房间 +'), language)}</button></section></div></> : !state ? <div className="panel"><h2>{tr("正在连接房间…")}</h2><p>{tr("若持续无法连接，可退出后重新输入房间码。")}</p></div> : <><p className="small">{localize(language !== 'zh' ? 'Full simulation · Round rules: ' : '完整经营版 · 本局规则：', language)}{localize(state.ruleset || 'legacy', language)} · {localize(language !== 'zh' ? 'Pre-tax simulation model' : '税前经营模型', language)}</p><section className="roomheading"><div><div className="eyebrow">{localize("ROOM ", language)}{state.code}{tr(" · 第 ")}{localize(state.round || 1, language)}{tr(" 局 / ")}{state.host ? tr('主持控制台') : me.name}</div><h1>{localize(state.phase === 'setup' ? (language !== 'zh' ? 'Shape your company' : '配置公司的初始能力') : state.phase === 'planning' ? (language !== 'zh' ? 'Plan your company strategy' : '制定公司战略') : state.phase === 'lobby' ? tr('市场即将开启') : state.phase === 'finished' ? tr('经营落幕，答案揭晓。') : tr('财务经营游戏'), language)}</h1><p>{localize(state.phase === 'lobby' ? tr('邀请玩家加入，然后开始经营。') : state.phase === 'paused' ? tr('主持人已暂停。施工、竞标和升级计时均已冻结。') : state.phase === 'finished' ? tr('比较营业额与利润，也看看每家公司留下了怎样的团队。') : tr('每一次扩张，都有资金与人的代价。'), language)}</p></div><div className="timer"><span>{localize(['lobby', 'setup', 'setup_countdown', 'planning', 'planning_countdown'].includes(state.phase) ? tr('预设经营时长') : tr('剩余经营时间'), language)}</span><strong>{localize(clock(state.duration - state.time), language)}</strong><small>{localize(({ lobby: tr('等待开局'), running: tr('市场开放'), paused: tr('已暂停'), setup: language !== 'zh' ? 'Capability setup' : '能力配置中', setup_countdown: language !== 'zh' ? 'Planning countdown' : '规划倒计时', planning_countdown: language !== 'zh' ? 'Trading countdown' : '开市倒计时', planning: language !== 'zh' ? 'Preparing' : '战略准备中', finished: tr('已结算') } as any)[state.phase], language)}</small></div></section>
        {state.host && <section className="control panel"><div><b>{tr("房间码 ")}<span className="roomcode">{state.code}</span></b><small>{tr("分享加入链接，不包含主持人凭证")}</small></div><button onClick={copy}>{localize(copied ? tr('已复制 ✓') : tr('复制加入链接'), language)}</button>{localize(state.phase === 'lobby' && <ActionControl className="primary" disabled={busy || !state.canStart} onClick={() => act('start')} tag="button" actionType="start">{localize(language !== 'zh' ? 'Start capability setup (' : '开始能力配置 (', language)}{localize(state.teams.length, language)}/12)</ActionControl>, language)}{localize(running && <><ActionControl onClick={() => act('pause')} disabled={busy} tag="button" actionType="pause">{tr("暂停计时")}</ActionControl><ActionControl className="primary" disabled={busy || state.time > state.duration - 240 || state.poolRemaining === 0 || state.releaseAvailable === 0} onClick={() => act('release', { count: 1 })} tag="button" actionType="release">{tr("发布 1 个项目")}</ActionControl><ActionControl disabled={busy || state.time > state.duration - 240 || state.poolRemaining === 0 || state.releaseAvailable === 0} onClick={() => act('release', { count: 2 })} tag="button" actionType="release">{tr("同时发布 2 个")}</ActionControl></>, language)}{localize(state.phase === 'finished' && <><button onClick={download}>{tr("导出本局成绩")}</button><ActionControl className="primary" disabled={busy} onClick={() => {
                        if (confirm(tr('开始新一局将清除本局成绩与经营记录，重置所有公司。房间码和公司名单保留。需要留存成绩请先导出。继续？')))
                            act('restart');
                    }} tag="button" actionType="restart">{tr("再来一局 ↻")}</ActionControl></>, language)}{localize(state.phase === 'paused' && <ActionControl className="primary" onClick={() => act('resume')} disabled={busy} tag="button" actionType="resume">{tr("恢复比赛")}</ActionControl>, language)}{localize(state.phase !== 'finished' && <ActionControl disabled={busy} onClick={() => act('auto')} tag="button" actionType="auto">{tr("自动波次：")}{localize(state.auto ? tr('开启') : tr('关闭'), language)}</ActionControl>, language)}{localize(['running', 'paused'].includes(state.phase) && <ActionControl className="danger" disabled={busy} onClick={() => {
                        if (confirm(tr('提前结束将停止所有竞标；在建项目不计收入。确认结束？')))
                            act('end');
                    }} tag="button" actionType="end">{tr("提前结束")}</ActionControl>, language)}</section>}
        {localize(state.host && <HostParticipants state={state} language={language}/>, language)}
        {state.host&&state.phase==='lobby'&&<section className="panel"><label>{localize(language==='zh'?'大厅展示':'Lobby visibility',language)}<select disabled={busy} value={state.lobbyPublic?'public':'private'} onChange={e=>act('lobby_visibility',{public:e.target.value==='public'})}><option value="public">{localize(language==='zh'?'公开大厅':'Public lobby',language)}</option><option value="private">{localize(language==='zh'?'仅凭房间码加入':'Unlisted: room code only',language)}</option></select></label><p className="small">{localize(language==='zh'?'开局后自动从大厅移除。主持人超过10分钟未在线，房间暂时隐藏。':'Rooms leave the lobby when started, or temporarily when the host is inactive for 10 minutes.',language)}</p></section>}<TeamMembers state={state} language={language} act={act} busy={busy}/><Institutions state={state} language={language} busy={busy} act={act}/><FinancialWorkspace state={state} language={language} busy={busy} act={act}/><BotControls state={state} language={language} busy={busy} act={act}/><CompanyStatus state={state} language={language} busy={busy} act={act}/><InitialPreparation state={state} language={language} busy={busy} act={act}/>{localize(state.phase === 'planning' && state.preparationVersion !== 2 && <Preparation state={state} language={language}/>, language)}
        {localize(me && state.riskVersion === 1 && (state.preparationVersion === 2 ? state.phase === 'planning' : ['lobby', 'planning'].includes(state.phase)) && <StrategicPlan state={state} language={language} busy={busy} act={act}/>, language)}
            {['lobby', 'setup', 'setup_countdown', 'planning', 'planning_countdown'].includes(state.phase) ? <section className="panel lobby"><h2>{tr("候场公司 ")}<span className="badge">{localize(state.teams.length, language)} / 12</span></h2><div className="companylist">{state.teams.map((t: any, i: number) => <div key={t.id}><span>0{localize(i + 1, language)}</span><b>{t.name}{localize(t.bot ? ' · BOT Lv.' + t.skill : '', language)}</b><small>{localize(state.phase === 'lobby' && !t.bot && <>{localize(t.readyCount || 0, language)}/{localize(t.memberCount || 1, language)} {localize(language !== 'zh' ? 'members ready · ' : '人已准备 · ', language)}</>, language)}{localize(state.onboardingVersion === 1 && state.phase === 'lobby' ? (t.lobbyReady ? (language !== 'zh' ? 'Ready ✓' : '已准备 ✓') : t.guideComplete ? (language !== 'zh' ? 'Guide completed · waiting for ready' : '已读完 · 等待准备') : (language !== 'zh' ? 'Reading guide' : '阅读指引中')) : tr("起始现金 160 · 员工评价起点 83.5"), language)}</small></div>)}</div>{localize(!state.teams.length && <p>{tr("还没有公司加入。将房间码或加入链接发给玩家。")}</p>, language)}<p>{tr("每人可用自己的设备；相同房间码与公司名加入同一家公司。刷新保留本机成员身份。")}</p>{localize(state.phase === 'lobby' && state.onboardingVersion === 1 && <><p>{localize(language !== 'zh' ? 'Players must complete the guide and ready up before the host starts. The host may skip the guide; bots are automatically ready.' : '玩家读完指引并准备后，主持人才能开局；主持人可跳过指引，机器人自动准备。', language)}</p>{localize(me && <ActionControl className="primary" disabled={busy || state.guideStep < 10} onClick={() => act('lobby_ready', { ready: !me.memberReady })} tag="button" actionType="lobby_ready">{localize(me.memberReady ? (language !== 'zh' ? 'Unready' : '取消准备') : (language !== 'zh' ? 'Ready to play ✓' : '准备好了 ✓'), language)}</ActionControl>, language)}</>, language)}</section> : <>{localize(me && <div className="stats"><Stat label={tr("可用现金")} value={num(me.cash)} suffix={tr("万")}/><Stat label={tr("营业额 / 已完工")} value={num(me.revenue)} suffix={tr("万")}/><Stat label={tr("累计净利润")} value={num(me.profit)} suffix={tr("万")}/><Stat label={tr("员工疲劳")} value={num(me.fatigue)} suffix="/100" warn={me.fatigue >= 70}/><Stat label={tr("员工评价")} value={num(me.employee)} suffix="/100"/></div>, language)}
            <p className="small procurementnote">{localize(language !== 'zh' ? 'Owner-specific simulation procurement · Published range is not a price cap · Sealed bids' : '按业主区分采购场景 · 公开金额区间非限价 · 密封报价', language)}</p>{localize(state.economicsVersion !== 2 && <p className="poolnotice">{localize(language !== 'zh' ? 'This existing round keeps its original payment and scoring rules. Play again or create a new room for milestone cash flows and two rankings.' : '此局保留原付款与评分规则；再来一局或新建房间即可使用节点现金流与双排名。', language)}</p>, language)}<nav className="tabs">{localize([['market', tr('项目市场')], ['company', tr('我的公司')], ['rank', tr('实时排行榜')], ['log', tr('市场动态')], ...(state.newsVersion ? [['news', language !== 'zh' ? 'Market news' : '市场新闻']] : []), ...(state.phase === 'finished' ? [['review', language !== 'zh' ? 'Round debrief' : '赛后复盘']] : [])].filter(x => !state.host || x[0] !== 'company').map(([k, v]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{localize(v, language)}{localize(k === 'market' && <span>{localize(state.projects.filter((p: any) => p.state === 'open').length, language)}</span>, language)}</button>), language)}</nav>
            {localize(tab === 'news' && <MarketNews state={state} language={language}/>, language)}
            {tab === 'market' && <><MarketNews state={state} language={language} compact/><div className="sectionhead"><h2>{localize(state.phase === 'finished' ? tr('本局项目档案') : tr('机会正在倒计时'), language)}</h2><span>{localize(state.poolTotal ? (language !== 'zh' ? `${state.poolTotal} projects · ${state.poolRemaining} remaining · Random without repeats` : `${state.poolTotal} 个项目 · 剩余 ${state.poolRemaining} 个 · 随机不重复`) : tr('旧版房间 · 原项目规则'), language)}</span></div>{localize(state.poolRemaining === 0 && <p className="poolnotice">{localize((language !== 'zh' ? 'All projects have been released. Existing work continues.' : '项目池已全部发布，已发布项目继续竞标和施工。'), language)}</p>, language)}<div className="projectgrid">{[...state.projects].reverse().map((p: any) => <article className={'project ' + p.state} key={p.id}><div className="projecttop"><span className="badge">{localize(({ open: tr('竞标中'), building: tr('施工中'), done: tr('已完工'), terminated: language !== 'zh' ? 'Terminated' : '已终止', unsold: tr('已流标') } as any)[p.state], language)}</span><span>{localize(p.state === 'open' ? tr('开标 ') + clock(p.closes - state.time) : p.state === 'building' ? tr('剩余工作量 ') + Math.ceil(p.remaining) + 's' : p.state === 'done' ? tr('材料冲击 +') + Math.round(p.shock * 100) + '%' : (p.cancelled ? tr('未开标取消') : tr('未授标')), language)}</span></div><h3>{tr(p.name)}</h3>{localize(p.bidWindow && <p className="small">{localize(language !== 'zh' ? 'Bidding window: ' : '竞标时长：', language)}{localize(p.bidWindow, language)}{localize(language !== 'zh' ? ' seconds' : ' 秒', language)}</p>, language)}{localize(p.sector && <p className="small sectorlabel">{localize(p.sector === '联邦项目' ? (language !== 'zh' ? 'Government service facilities' : '政府服务设施') : tr(p.sector), language)}</p>, language)}<div className="projectfacts"><div><small>{tr("公开项目金额区间")}</small><b className="rangevalue">{tr(p.magnitude)}</b></div><div><small>{localize(me ? tr('本公司成本估算') : tr('内部估算与资金'), language)}</small><b>{localize(me ? p.estimate?.base : tr('保密'), language)}{localize(me && <i>{tr("万")}</i>, language)}</b></div></div><p className="small">{tr("基础工期 ")}{localize(p.duration, language)}{localize(state.balanceVersion ? (language !== 'zh' ? 's · Cost shock 0 / 4 / 8%' : ' 秒 · 成本冲击 0 / 4 / 8%') : tr(" 秒 · 成本冲击 0 / 10 / 20%"), language)}<br />{p.state === 'open' ? tr('密封收标 · 数量和身份保密') : (p.joint ? p.joint.members.map((m: any) => state.teams.find((t: any) => t.id === m.id)?.name).join(' + ') : state.teams.find((t: any) => t.id === p.owner)?.name) || '—'}{localize(p.owner ? tr(' · 合同额 ') + p.price : '', language)}</p>{localize(p.state === 'building' && <><div className="progress"><i style={{ width: Math.max(0, 100 - p.remaining / p.total * 100) + '%' }}/></div><p className="small">{localize(p.overtime ? tr('加班施工') : tr('标准施工'), language)}{tr(" · 疲劳 ≥70 时推进速度降至 80%")}</p></>, language)}{localize(p.state === 'done' && <p className={p.earned >= 0 ? 'positive' : 'negative'}>{tr("项目利润 ")}{localize(num(p.earned), language)}{tr(" 万")}</p>, language)}<ProjectGuarantee state={state} p={p} language={language} busy={busy} act={act}/>{localize(p.state === 'open' && me && !p.myJointBid && !p.myJointOffers?.length && <><p className="small">{localize(language !== 'zh' ? 'First payment / base total: ' : '首笔支出 / 基础成本总额：', language)}<b>{localize(p.estimate.initial ?? p.estimate.base, language)} / {localize(p.estimate.base, language)}</b>{tr(" · 工期 ")}{localize(p.estimate.duration, language)}{localize("s", language)}<br />{tr("以开标时的能力和疲劳重新计算")}</p><label className="bidlabel">{tr("报价（万美元；金额区间不是报价上限）")}<input type="number" min={p.legacyMin || 1} max={p.legacyMax || 1000000} step={1} value={bids[p.id] ?? p.myBid ?? ''} placeholder={tr("输入整数报价")} onChange={e => setBids({ ...bids, [p.id]: e.target.value })}/></label><BidFunding state={state} project={p} language={language} amount={bids[p.id] ?? p.myBid}/><div className="row"><ActionControl className="primary" disabled={busy || !running || p.eligible === false || me.restUntil > state.time || (me.crewUsed ?? mine.length) + (p.crewSlots || 1) > 1 + me.levels.crew} onClick={() => act('bid', { project: p.id, amount: bids[p.id] ?? p.myBid })} tag="button" actionType="bid">{localize(p.myBid ? tr('修改报价') : tr('秘密投标'), language)}</ActionControl>{localize(p.myBid && <ActionControl disabled={busy || !running} onClick={() => act('withdraw', { project: p.id })} tag="button" actionType="withdraw">{tr("撤回")}</ActionControl>, language)}</div>{localize(p.myBid && <p className="positive small">{tr("你的报价 ")}{localize(p.myBid, language)}{tr(" 已提交，其他公司不可见。")}</p>, language)}</>, language)}<JointBid p={p} state={state} language={language} busy={busy} act={act}/>{localize(p.newsImpact && <p className="small">{localize(language !== 'zh' ? 'Active sector news: cost / work speed / receipt delay: ' : '当前专业新闻影响：成本 / 推进速度 / 回款等待：', language)}{localize(Math.round(p.newsImpact.cost * 100), language)}% / {localize(Math.round(p.newsImpact.speed * 100), language)}% / {localize(p.newsImpact.receipt, language)}{localize("s", language)}</p>, language)}<ProjectContext p={p} language={language}/><ProjectCompliance p={p} state={state} language={language} busy={busy} act={act}/><ProjectPayments project={p} language={language} time={state.time}/>{localize(p.reason && <p className="small">{tr(p.reason)}</p>, language)}{p.tieDraw?.map((g: any, i: number) => <p className="small" key={'draw' + i}>{localize(g.basis === 'score' ? (language !== 'zh' ? 'Equal-score draw: ' : '同分抽签：') : (language !== 'zh' ? 'Equal-price draw at ' : '同价抽签 · 报价 '), language)}{localize(g.amount, language)}：{g.entries.map((e: any) => e.name + ' #' + e.rank + (e.awarded ? (language !== 'zh' ? ' (awarded)' : '（中标）') : '')).join(' / ')}<br />{localize(g.basis === 'score' ? (language !== 'zh' ? 'Random order among equally scored eligible offers; a higher score takes priority.' : '同分合格公司按随机序号排序；综合分更高的公司仍优先。') : (language !== 'zh' ? 'Random order among eligible offers at this price; a lower eligible price still takes priority.' : '仅列出该报价下通过审核的公司；随机序号较小优先，合格的更低报价仍优先。'), language)}</p>)}{p.offers?.length > 0 && <details><summary>{tr("查看开标报价")}</summary>{p.offers.map((o: any, i: number) => <p className="small" key={i}>{o.name}：{localize(o.amount, language)}<br />{tr(o.result)}{localize(o.selectionScore != null && o.selectionScore >= 0 ? ' · ' + (language !== 'zh' ? 'Best-value score: ' : '综合分：') + o.selectionScore : '', language)}</p>)}</details>}</article>)}</div></>}
            {tab === 'company' && me && <><section className="panel"><h2>{localize(language !== 'zh' ? 'Project credit liabilities' : '项目授信欠款', language)}</h2><p>{localize(language !== 'zh' ? 'Bank loan / project credit debt / total liabilities: ' : '普通借款 / 项目授信欠款 / 总负债：', language)}{localize(num(me.debt), language)} / {localize(num(me.guaranteeDebt || 0), language)} / {localize(num(me.totalDebt ?? me.debt), language)}</p>{state.projects.filter((p: any) => me.guarantees?.[p.id]).map((p: any) => <div key={p.id}><h3>{tr(p.name)}</h3><ProjectGuarantee state={state} p={p} language={language} busy={busy} act={act}/></div>)}</section><InformationSupport state={state} language={language} act={act} busy={busy}/>{localize(state.modelVersion === 2 && <section className="panel"><h2>{localize(language !== 'zh' ? 'Recurring management costs' : '持续管理成本', language)}</h2><p>{localize(language !== 'zh' ? 'Per game minute / paid / accrued: ' : '每经营分钟 / 已扣 / 待结算：', language)}{localize(me.managementRate, language)} / {localize(num(me.managementPaid || 0), language)} / {localize(num(me.managementAccrued || 0), language)}</p><p>{localize(language !== 'zh' ? 'Interest base / earned / accrued (4% annual; one round = one year): ' : '计息余额 / 已收利息 / 待入账（年化4%，每局一年）：', language)}{localize(num(me.interestBase || 0), language)} / {localize(num(me.interestEarned || 0), language)} / {localize(num(me.interestAccrued || 0), language)}</p><p>{localize(language !== 'zh' ? 'Accrues every trading second, settles every minute and at round end. Idle crews also incur overhead. More crews increase cost; coordination reduces it. No charges during preparation or pauses.' : '按经营秒累积，每分钟及结束时结算。闲置队伍也产生管理费；队伍越多费用越高，组织协调能力可降低费用。准备及暂停阶段不收费。', language)}</p></section>, language)}<CompanyFinancialSummary company={me} language={language}/><Specializations state={state} language={language} busy={busy} act={act}/><CompanyProjects state={state} language={language} busy={busy} act={act}/>{localize(state.riskVersion === 1 && !me.bankrupt && <StrategicPlan state={state} language={language} busy={busy} act={act}/>, language)}<div className="sectionhead"><h2>{tr("构建你的竞争优势")}</h2><span>{tr("升级仅对完成后新中标的项目生效")}</span></div><div className="upgradegrid">{Object.entries(UPGRADES).filter(([k]) => !isSpecialty(k) && (state.riskVersion || !['safety', 'compliance', 'insurance'].includes(k))).map(([kind, u]: [
                        string,
                        any
                    ]) => { let training = me.training.find((x: any) => x.kind === kind), level = me.levels[kind] || 0; return <section className="panel upgrade" key={kind}><div className="eyebrow">{localize(kind.toUpperCase(), language)}</div><h3 data-ability={kind}>{tr(u.name)}<span>{localize("Lv.", language)}{localize(level, language)}</span></h3><p>{tr(u.detail)}</p><p className="small">{tr("施工队伍容量 ")}{localize(kind === 'crew' ? 1 + level : '—', language)}{tr(" · 最高 Lv.")}{localize(u.max, language)}</p><ActionControl className="outline wide" disabled={busy || !running || !!training || level >= u.max || me.cash < u.price * (level + 1)} onClick={() => act('upgrade', { kind })} tag="button" actionType="upgrade">{localize(training ? tr('升级中 · ') + clock(training.end - state.time) : level >= u.max ? tr('已满级') : tr(`${u.price * (level + 1)} 万 · ${u.time} 秒升级`), language)}</ActionControl></section>; })}</div><div className="entrygrid"><section className="panel"><h2>{tr("团队不是无限资源")}</h2><div className="fatigue"><span>{tr("当前疲劳 ")}{localize(num(me.fatigue), language)} / 100</span><div className="progress"><i style={{ width: me.fatigue + '%', background: me.fatigue >= 70 ? '#ef9978' : undefined }}/></div></div><p>{tr("疲劳达到 70：施工推进速度降至 80%，新项目开工成本增加 10%。闲置自动恢复；全员休息更快。")}</p><div className="row"><ActionControl disabled={busy || !running || mine.length > 0 || me.restUntil > state.time} onClick={() => act('rest')} tag="button" actionType="rest">{localize(me.restUntil > state.time ? tr('休息中 ') + clock(me.restUntil - state.time) : tr('全员休息 · 45 秒'), language)}</ActionControl><ActionControl disabled={busy || !running || me.cash < 12 || me.training.some((u: any) => u.kind === 'welfare')} onClick={() => act('welfare')} tag="button" actionType="welfare">{localize(me.training.some((u: any) => u.kind === 'welfare') ? tr('福利执行中 ') + clock(me.training.find((u: any) => u.kind === 'welfare').end - state.time) : tr('福利计划 · 12 万 / 45 秒'), language)}</ActionControl></div><p className="small">{tr("休息需无施工、无待开标报价。福利：疲劳 −25、员工评价 +4（累计加分上限 12）。")}</p><label>{tr("新中标项目的施工模式")}<ActionControl disabled={busy || !running} value={me.mode} onChange={e => act('mode', { mode: e.target.value })} tag="select" actionType="mode"><option value="normal">{tr("标准 · 更可持续")}</option><option value="overtime">{tr("加班 · 工期缩短 25%，疲劳增长更快")}</option></ActionControl></label><p className="small">{tr("模式在中标时锁定。每个加班项目另扣员工评价 2 分。")}</p></section><section className="panel"><h2>{tr("现金与承诺")}</h2><div className="cashsplit"><div><span>{tr("可用现金")}</span><strong>{localize(num(me.cash), language)}</strong></div><div><span>{tr("借款余额")}</span><strong>{localize(num(me.totalDebt ?? me.debt), language)}</strong></div></div><p>{localize(language !== 'zh' ? 'New rounds pay costs and receive owner payments in stages. Open a project’s payment plan to check upcoming cash movements. Funding holds occupy crew slots; borrowing may bridge a gap.' : '新局按工程节点分段付款与回款。展开项目的付款计划，查看每笔现金流。缺款停工仍占施工位，可借款缓解缺口。', language)}</p>{localize(state.economicsVersion === 2 && <p className="small">{localize(language !== 'zh' ? 'Certified pending receipts / remaining base costs / completed receivables: ' : '已审核待到账 / 后续基础成本 / 完工应收：', language)}{localize(num(me.pending), language)} / {localize(num(me.outstanding), language)} / {localize(num(me.receivable), language)}</p>, language)}<p>{localize(language !== 'zh' ? 'Use the bank panel above for risk-priced loans and repayments.' : '请在上方银行面板查看风险报价、申请贷款及还款。', language)}</p><p className="small">{tr("当前施工：")}{localize(me.crewUsed ?? mine.length, language)} / {localize(1 + me.levels.crew, language)}{tr(" · 整局加班项目：")}{localize(me.overtimeCount, language)}</p></section></div></>}
            {localize(tab === 'review' && state.phase === 'finished' && <Debrief state={state} language={language}/>, language)}
            {localize(tab === 'rank' && <DualRankings state={state} language={language} me={me} onExport={download}/>, language)}
            {tab === 'log' && <section className="panel"><h2>{tr("市场动态")}</h2><div className="log">{state.logs.map((l: any, i: number) => <div key={i}><time>{localize(clock(l.time), language)}</time><span>{translate(l.text, language, state.teams.map((t: any) => t.name))}</span></div>)}</div></section>}
            {localize(state.phase === 'finished' && tab !== 'review' && <div className="endbanner"><b>{tr("比赛已结束 · 等待主持人开启下一局")}</b><button onClick={() => setTab('review')}>{localize(language !== 'zh' ? 'Review strategy & cash flows' : '复盘战略与现金流', language)}</button><button className="primary" onClick={() => setTab('rank')}>{tr("查看最终排名 →")}</button></div>, language)}</>}</>}
    <footer>{tr("财务经营游戏 · 模拟数据 · 金额：万美元")}</footer></main>
    {localize(rules && <div className="modalback" role="presentation" onClick={() => setRules(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="rulesTitle" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setRules(false)}>{tr("关闭 ×")}</button><div className="eyebrow">{tr("PLAYBOOK / 公开规则")}</div><h2 id="rulesTitle">{tr("把公司经营到最后")}</h2>{localize((!state || state.modelVersion === 2) ? (!state || state.contextVersion ? <ContextRules language={language}/> : <><p>{localize(language !== 'zh' ? 'Legacy round: its original mechanics remain active. Start a new round for the revised simulation rules.' : '旧规则局：继续使用原有机制。重新开局后使用新版游戏规则。', language)}</p><ModernRules language={language}/></>) : <><p>{tr("每队一家公司、可使用多台设备。初始现金 160，无负债；标准施工队 1 支。主持人开始后，所有设备约每 2.5 秒同步一次。比赛可暂停，刷新保留本机身份。不要在共享设备上留下主持人会话。")}</p><h3>{tr("适用范围 · 美国联邦密封投标经营模式")}</h3><p>{tr("参考 FAR 的联邦施工密封投标程序，不声称适用于所有美国州、地方或私人合同。50 个行业标签用于模拟市场，私人办公楼等标签不意味着这些现实项目受 FAR 约束。本文所列为参考基线；实际采购需看招标文件、机构补充规定及 RFO 偏离条款。")}</p><p>{tr("本游戏选择公开项目金额区间，隐藏政府内部估算及可用资金；金额区间不是硬性报价上限。旧 FAR 36.204 规定项目金额区间；RFO Part 36 已调整结构，因此不将其表述为所有机构目前一致适用的要求。")}</p><p><b>{tr("政府估算不是废标线。")}</b>{tr("报价高于内部估算仍可提交并中标；本游戏仅以另行模拟的可用资金检查能否授标。资金不足会记录为未授标，不等同于法律上的自动废标。现实中价格合理性、可用资金与承包商履约能力需采购官判断和记录；游戏的自动检查只是经营替代。")}</p><p>{localize(language !== 'zh' ? 'The bidding window, milestone schedules, payment delays, employee scores, upgrades, and input limits are simulation mechanics. Bonds, wage standards, bid corrections, protests, full responsibility reviews, and witnessed tie drawings are not modeled.' : '竞标时间、分段付款回款计划、到账延迟、员工评分、升级与数值上限均为经营设定。未模拟担保、工资标准、投标错误更正、抗议、完整资格审查和抽签见证。', language)}</p><div className="legalrefs"><a href="https://www.acquisition.gov/far/36.203" target="_blank" rel="noreferrer">{tr("36.203 政府估算")}</a><a href="https://www.acquisition.gov/far/36.204" target="_blank" rel="noreferrer">{tr("36.204 金额区间基线")}</a><a href="https://www.acquisition.gov/far-overhaul/far-part-deviation-guide/far-overhaul-part-36" target="_blank" rel="noreferrer">{localize("RFO Part 36", language)}</a><a href="https://www.acquisition.gov/far/14.401" target="_blank" rel="noreferrer">{tr("14.401 收标保密")}</a><a href="https://www.acquisition.gov/far/14.402-1" target="_blank" rel="noreferrer">{tr("14.402-1 公开开标")}</a><a href="https://www.acquisition.gov/far/14.408-1" target="_blank" rel="noreferrer">{tr("14.408-1 授标")}</a><a href="https://www.acquisition.gov/far/14.408-6" target="_blank" rel="noreferrer">{tr("14.408-6 同价优先顺序")}</a><a href="https://www.acquisition.gov/far/9.104-1" target="_blank" rel="noreferrer">{tr("9.104-1 履约能力")}</a><a href="https://www.acquisition.gov/far/32.702" target="_blank" rel="noreferrer">{tr("32.702 可用资金")}</a></div><h3>{tr("01 · 机会与竞争")}</h3><p>{tr("默认每 90 秒发布一批项目，每批至少 2 个，随参赛公司数增加。主持人可以关闭自动波次，随时发 1 或 2 个项目。最后 4 分钟停止新项目发布。40 秒秘密竞标，开标前不公开报价、投标数量和投标身份；开标后公开报价和经营审核记录。只有本公司的投标状态可见。假设所有公司投标文件合格且法定同价优先资格相同，在通过经营履约及资金检查的报价中按最低价授标，同价抽签。")}</p><h3>{tr("项目池 · 50 个，不重复抽取")}</h3><p>{tr("新房间使用 50 个项目，每局由服务器随机打乱顺序，自动波次和手动发布共用一个项目池；抽完即止。小规模比赛可能只发布其中一部分，因此本局实际发布的行业比例不保证等于整个项目池。更新前已开局的房间保留原规则。")}</p><p>{tr("分布依据用户提供的市场截图。截图包含正负指标，并非项目数量占比；本游戏假设每个行业基数为 100，以“100＋截图指标”作为权重，归一化到 50 个后用最大余数法取整。仓库与联邦项目分开计算。这是经营分配假设，不代表真实市场份额。")}</p><div className="tablewrap"><table><thead><tr><th>{tr("行业")}</th><th>{tr("截图指标")}</th><th>{tr("项目数")}</th><th>{tr("比例")}</th></tr></thead><tbody>{localize(MARKET.map((m: any) => <tr key={tr(m.sector)}><td>{tr(m.sector)}</td><td>{localize(m.change > 0 ? '+' : '', language)}{localize(m.change, language)}</td><td>{localize(m.count, language)}</td><td>{localize(m.count * 2, language)}%</td></tr>), language)}</tbody></table></div><BankruptcyRules language={language}/><EconomicsRules language={language} riskVersion={state?.riskVersion ?? 1}/><h3>{tr("02 · 资金与升级")}</h3><p>{localize(language !== 'zh' ? 'Completed upgrades: cost −7% per level, duration −10% per level, crews +1 slot per level. Upgrade times: 75 / 75 / 100 seconds. Prices rise with level. Loans add 40 debt and 36 cash after a fee of 4; debt limit 80. Upgrades, wellbeing, and financing fees reduce profit.' : '升级完成后：成本每级−7%、工期每级−10%、队伍每级+1施工位；耗时75/75/100秒，价格随等级提高。借款每笔40，融资费4，到账36，借款上限80。升级、福利与融资费扣减利润。', language)}</p><h3>{tr("03 · 员工疲劳")}</h3><p>{tr("初始疲劳 10。每秒每个标准项目累积 0.11，加班项目 0.20，再除以公司队伍容量。无项目时每秒恢复 0.13；全员休息 45 秒时每秒恢复 0.45，且不能投标。疲劳范围 0–100。达到 70 后施工推进率降到 80%，新项目基础成本 +10%。")}</p><p>{tr("加班项目初始工期缩短 25%，每个加班项目额外扣员工评价 2。福利投入 12、45 秒生效，疲劳 −25，评价 +4（福利加分累计最多 12）。")}</p><h3>{tr("05 · 主持建议")}</h3><p>{tr("讲解规则 2 分钟 → 经营 15–20 分钟 → 复盘 3 分钟。分析：低价是否值得？扩大施工队伍能否缓解疲劳？最终利润率是否掩盖了资金压力？")}</p><p className="small">{tr("所有数据、风险概率与员工评价公式均为经营假设，不代表真实施工或劳动研究结论。房间有效期 7 天；公司名和成绩向房间参与者可见，不要输入真实个人信息。")}</p></>, language)}</section></div>, language)}</></CompanyAccessContext.Provider>;
}
function Stat({ label, value, suffix, warn = false }: {
    label: string;
    value: string;
    suffix: string;
    warn?: boolean;
}) { return <section className={'stat ' + (warn ? 'warn' : '')}><small>{label}</small><strong>{value}<i>{suffix}</i></strong></section>; }
