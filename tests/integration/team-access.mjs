// Isolated loopback HTTP/D1 verification; never connects to production.
import assert from 'node:assert/strict';import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const origin=process.env.GAME_TEST_ORIGIN||'http://127.0.0.1:5173';if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw Error('Local test only');
async function req(b,token){const r=await fetch(origin+'/api/game',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(b)});return {status:r.status,...await r.json()};}
const h=await req({type:'create',minutes:18}),code=h.code;assert.equal(h.status,200);
const company='Team access QA',join=name=>req({type:'join',code,name:company,memberName:name});
const owner=await join('General');const project=await join('Project');const finance=await join('Finance');
const joined=await Promise.all([join('Operations A'),join('Operations B')]);assert.deepEqual(joined.map(x=>x.status).sort(),[200,400]);const ops=joined.find(x=>x.status===200);assert.equal(ops.me.members.length,4);assert.equal(ops.me.cash,160);assert.equal(ops.me.setupPoints,8);
const dir='.wrangler/state/v3/d1/miniflare-D1DatabaseObject',db=fs.readdirSync(dir).find(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite');
const seed=spawnSync('python3',['-c',`import sqlite3,json,sys,time
p=json.load(sys.stdin);c=sqlite3.connect(p['db']);r=json.loads(c.execute('select data from rooms where code=?',(p['code'],)).fetchone()[0]);r['phase']='running';r['auto']=False;r['last']=int(time.time()*1000);r['modules']['news']=False
for t in r['teams']:
 t['financeOpening']={'capital':t['cash'],'time':0}
 for m in [t]+t['collaborators']:m['guideStep']=10
c.execute('update rooms set data=?,version=version+1 where code=?',(json.dumps(r),p['code']));c.commit()
`],{input:JSON.stringify({db:dir+'/'+db,code}),encoding:'utf8'});assert.equal(seed.status,0,seed.stderr);
const state=token=>req({type:'state',code},token),op=(who,revision,b)=>req({code,round:1,teamRevision:revision,requestId:crypto.randomUUID(),...b},who.token);
let s=await state(project.token);assert.equal((await op(project,s.me.actionRevision,{type:'bank_borrow',amount:20})).status,400);
s=await state(ops.token);const e=s.institutions.equipment.find(x=>x.owner==='dealer'&&x.price>=50);let q=await op(ops,s.me.actionRevision,{type:'equipment_buy',asset:e.id,assetRevision:e.revision});assert.equal(q.status,200);assert.equal(q.me.cash,160);const pending=q.me.approvals.find(p=>p.status==='pending');assert(pending);assert(!JSON.stringify(q.me.approvals).includes('actor'));
const before=q.me.actionRevision;const approval={type:'approval_decide',id:pending.id,approve:true};
const race=await Promise.all([op(owner,before,approval),op(finance,before,approval)]);assert.deepEqual(race.map(x=>x.status).sort(),[200,400]);
s=await state(owner.token);assert.equal(s.institutions.equipment.find(x=>x.id===e.id).owner,s.me.id);assert.equal(s.me.cash,160-e.price);assert.equal(s.me.teamActivity.filter(x=>x.type==='equipment_buy').length,1);assert.equal(s.me.financials.balance.balanceDifference,0);
const id=crypto.randomUUID();const reassign={type:'team_assign',role:'project',memberId:ops.me.memberId,requestId:id};const dupe=await Promise.all([op(owner,s.me.actionRevision,reassign),op(owner,s.me.actionRevision,reassign)]);assert(dupe.every(x=>x.status===200));s=await state(ops.token);assert.deepEqual(s.me.memberRoles,['project']);assert.equal(s.me.teamActivity.filter(x=>x.type==='team_assign').length,1);
assert.equal((await op(ops,s.me.actionRevision,{type:'equipment_list',asset:e.id,assetRevision:s.institutions.equipment.find(x=>x.id===e.id).revision,price:50})).status,400);
const old=await state(project.token);assert.deepEqual(old.me.memberRoles,['operations']);
console.log('PASS HTTP/D1: concurrent fourth-seat limit; fixed 160/8 resources; forged role denied; approval race executes once; duplicate assignment idempotent; new roles take effect; balanced reports; private request credentials.');
