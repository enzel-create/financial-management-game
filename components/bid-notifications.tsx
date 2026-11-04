'use client';
import { localize } from '../lib/i18n.mjs';
import { useEffect, useState } from 'react';
import { bidResults } from '../lib/bid-results.mjs';
import { translate } from '../lib/i18n.mjs';
export default function BidNotifications({ state, language }: any) {
    const scope = state?.me && !state.host ? `fmg-bid-results:${state.code}:${state.round || 1}:${state.me.id}` : '';
    const [saved, setSaved] = useState<{
        scope: string;
        ids: string[];
    }>({ scope: '', ids: [] });
    useEffect(() => { let ids: string[] = []; if (scope)
        try {
            const data = JSON.parse(localStorage.getItem(scope) || '[]');
            if (Array.isArray(data))
                ids = data.filter(x => typeof x === 'string');
        }
        catch { } setSaved({ scope, ids }); }, [scope]);
    const c = (z: string, e: string) => localize(language !== 'zh' ? e : z, language);
    if (!scope || saved.scope !== scope)
        return null;
    const notices = bidResults(state).filter((n: any) => !saved.ids.includes(n.id)).reverse();
    function dismiss(ids: string[]) { setSaved(prev => { const next = [...new Set([...prev.ids, ...ids])]; try {
        localStorage.setItem(scope, JSON.stringify(next));
    }
    catch { } return { scope, ids: next }; }); }
    return <aside className="bid-notifications" aria-label={c('投标结果通知', 'Bid result notifications')} aria-live="polite" aria-relevant="additions">{localize(notices.length > 1 && <button className="dismiss-bids" onClick={() => dismiss(notices.map((n: any) => n.id))}>{c('全部已读', 'Dismiss all')} ({localize(notices.length, language)})</button>, language)}{notices.map((n: any) => <article key={n.id} className={'bid-notice ' + n.status} role="status"><button className="bid-notice-close" aria-label={c('关闭通知：', 'Dismiss notification: ') + translate(n.name, language)} onClick={() => dismiss([n.id])}>×</button><strong>{localize(n.status === 'won' ? c('投标成功', 'Bid successful') : n.status === 'cancelled' ? c('投标已取消', 'Bidding cancelled') : c('投标失败', 'Bid unsuccessful'), language)}</strong><h3>{translate(n.name, language)}</h3>{localize(n.amount != null ? <>{localize(n.status !== 'won' && <p>{c('中标公司：', 'Awarded to: ')}<b>{localize(n.winners.join(' + '), language)}</b></p>, language)}<p>{c('中标金额：', 'Award amount: ')}<b>{localize(Number(n.amount).toLocaleString('en-US', { maximumFractionDigits: 2 }), language)}{c(' 万美元', ' × $10,000')}</b></p>{localize(n.status === 'won' && n.winners.length > 1 && <small>{c('联合中标，以上为合同总额；按双方约定比例分摊。', 'Joint award: this is the total contract amount, shared at the agreed ratio.')}</small>, language)}</> : <p>{localize(n.status === 'cancelled' ? c('比赛结束前未开标，无中标公司或中标金额。', 'Bidding was cancelled when the round ended. No winner or award amount.') : c('本项目未授标，无中标公司或中标金额。', 'No award was made. There is no winner or award amount.'), language)}</p>, language)}</article>)}</aside>;
}
