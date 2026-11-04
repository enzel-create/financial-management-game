import { env } from 'cloudflare:workers';
import { newRoom, joinCompany, tick, action, view } from '../../../lib/game.mjs';
import { teamForKey, normalizeCompanyName } from '../../../lib/team-play.mjs';
export const dynamic = 'force-dynamic';
const json = (v: unknown, status = 200) => Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
async function digest(token: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); return Array.from(new Uint8Array(b), b => b.toString(16).padStart(2, '0')).join(''); }
export async function POST(req: Request) {
    try {
        if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
            return json({ error: '请求来源无效' }, 403);
        if (!env.DB)
            return json({ error: '游戏数据库尚未就绪' }, 503);
        const text = await req.text();
        if (text.length > 4096)
            return json({ error: '请求过长' }, 413);
        const b = JSON.parse(text);
        let token = req.headers.get('authorization')?.replace(/^Bearer /, '') || '';
        if (b.type === 'create') {
            const mode = b.gameMode ?? 'full';
            if (mode !== 'full')
                throw Error('未知游戏版本 / Unknown game version');
            const minutes = Number(b.minutes);
            if (![15,18,20].includes(minutes)) throw Error('时长应为15、18或20分钟 / Choose 15, 18 or 20 minutes');
            const secret = crypto.randomUUID() + crypto.randomUUID(), host = await digest(secret);
            for (let n = 0; n < 4; n++) {
                const code = crypto.randomUUID().slice(0, 8).toUpperCase();
                const r = newRoom(code, host, minutes, mode);
                const result = await env.DB.prepare('INSERT OR IGNORE INTO rooms (code,data,version,created) VALUES (?,?,0,?)').bind(code, JSON.stringify(r), Date.now()).run();
                if (result.meta.changes)
                    return json({ token: secret, ...view(r, host) });
            }
            throw Error('请重试创建房间');
        }
        const code = String(b.code || '').trim().toUpperCase();
        if (!/^[A-F0-9]{8}$/.test(code))
            throw Error('请输入 8 位房间码');
        const join = b.type === 'join';
        let secret = join ? crypto.randomUUID() + crypto.randomUUID() : token;
        if (!secret)
            return json({ error: '请先加入房间' }, 401);
        let key = await digest(secret);
        let name = normalizeCompanyName(b.name);
        if (join && (!name || name.length > 16))
            throw Error('公司名称需要 1–16 个字符');
        for (let n = 0; n < 12; n++) {
            const row = await env.DB.prepare('SELECT data,version,created FROM rooms WHERE code=?').bind(code).first<{data:string,version:number,created:number}>();
            if (!row)
                return json({ error: '房间不存在，请检查房间码' }, 404);
            if (Date.now() - row.created > 7 * 86400000)
                return json({ error: '房间已超过 7 天有效期' }, 410);
            let r = JSON.parse(row.data);
            if(r.gameMode && r.gameMode !== 'full')return json({error:'This room is not available in the public game / 该房间不属于公开版本'},410);
            if (!join && r.host !== key && !teamForKey(r, key))
                return json({ error: '凭证无效，请使用原浏览器或重新加入' }, 403);
            if(r.contextVersion==null && r.classroomVersion){r.contextVersion=r.classroomVersion;for(const p of r.projects)if(p.classroomVersion)p.contextVersion=p.classroomVersion;}
            tick(r);
            if (join)
                joinCompany(r, crypto.randomUUID(), key, name, b.memberName);
            else if (b.type !== 'state') {
                if (!b.requestId || typeof b.requestId !== 'string')
                    throw Error('缺少操作编号');
                let op = key + ':' + b.requestId;
                if (!r.processed.includes(op)) {
                    if (!['guide_step', 'lobby_ready'].includes(b.type) && teamForKey(r, key)?.collaborators?.length && !Number.isInteger(b.teamRevision))
                        throw Error('队友已更新公司，请刷新页面后重试 / Refresh to load the shared company state');
                    action(r, key, b);
                    r.processed.push(op);
                    r.processed = r.processed.slice(-300);
                }
            }
            const result = await env.DB.prepare('UPDATE rooms SET data=?,version=version+1 WHERE code=? AND version=?').bind(JSON.stringify(r), code, row.version).run();
            if (result.meta.changes)
                return json({ ...view(r, key), ...(join ? { token: secret } : {}) });
        }
        return json({ error: '操作较多，请稍后重试' }, 409);
    }
    catch (e) {
        return json({ error: e instanceof Error ? e.message : '请求失败，请重试' }, 400);
    }
}
