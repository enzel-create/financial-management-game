// Runs only against loopback preview; seeds only its local Miniflare D1 test room.
import assert from 'node:assert/strict';import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const origin=process.env.GAME_TEST_ORIGIN||'http://127.0.0.1:5173';if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw Error('Local test only');
async function request(body,token){const response=await fetch(origin+'/api/game',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const value=await response.json();return {status:response.status,...value}}
const h=await request({type:'create',minutes:18,gameMode:'full'});assert.equal(h.status,200);
assert.equal((await request({type:'create',minutes:18,gameMode:'simulation'})).status,400);
const a=await request({type:'join',code:h.code,name:'Alpha QA'}),b=await request({type:'join',code:h.code,name:'Beta QA'});assert.equal(a.status,200);assert.equal(b.status,200);
const dir='.wrangler/state/v3/d1/miniflare-D1DatabaseObject',db=fs.readdirSync(dir).find(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite');assert(db);
const seed=spawnSync('python3',['-c',`import sqlite3,json,sys,time
p=json.load(sys.stdin);c=sqlite3.connect(p['db']);r=json.loads(c.execute('select data from rooms where code=?',(p['code'],)).fetchone()[0]);r['phase']='running';r['auto']=False;r['last']=int(time.time()*1000);r['modules']['news']=False
for t in r['teams']:
 t['guideStep']=10;t['memberReady']=True;t['financeOpening']={'capital':t['cash'],'time':0}
c.execute('update rooms set data=?,version=version+1 where code=?',(json.dumps(r),p['code']));c.commit()
`],{input:JSON.stringify({db:dir+'/'+db,code:h.code}),encoding:'utf8'});assert.equal(seed.status,0,seed.stderr);
const op=(t,body)=>request({code:h.code,round:1,requestId:crypto.randomUUID(),...body},t.token);
let state=await request({type:'state',code:h.code},a.token),e=state.institutions.equipment[0];
const race=await Promise.all([op(a,{type:'equipment_buy',asset:e.id,assetRevision:e.revision}),op(b,{type:'equipment_buy',asset:e.id,assetRevision:e.revision})]);assert.deepEqual(race.map(x=>x.status).sort(),[200,400]);
const winner=race[0].status===200?a:b,loser=winner===a?b:a;state=await request({type:'state',code:h.code},winner.token);e=state.institutions.equipment.find(x=>x.id===e.id);assert.equal(e.owner,state.me.id);
const listing=await op(winner,{type:'equipment_list',asset:e.id,assetRevision:e.revision,price:40});assert.equal(listing.status,200);e=listing.institutions.equipment.find(x=>x.id===e.id);
const id=crypto.randomUUID(),trade={type:'equipment_buy',asset:e.id,assetRevision:e.revision,requestId:id};const dup=await Promise.all([op(loser,trade),op(loser,trade)]);assert(dup.every(x=>x.status===200));const sold=await request({type:'state',code:h.code},winner.token);assert.equal(sold.me.financials.balance.fixedAssets,0);assert.equal(sold.me.disposalGain,-8);
// Two different purchases by one company must not spend the same cash twice.
const cap=spawnSync('python3',['-c',`import sqlite3,json,sys
p=json.load(sys.stdin);c=sqlite3.connect(p['db']);r=json.loads(c.execute('select data from rooms where code=?',(p['code'],)).fetchone()[0])
t=next(x for x in r['teams'] if x['id']==p['id']);t['profit']=round(t['profit']-(t['cash']-50),2);t['cash']=50
c.execute('update rooms set data=?,version=version+1 where code=?',(json.dumps(r),p['code']));c.commit()
`],{input:JSON.stringify({db:dir+'/'+db,code:h.code,id:sold.me.id}),encoding:'utf8'});assert.equal(cap.status,0,cap.stderr);
const stock=(await request({type:'state',code:h.code},winner.token)).institutions.equipment.filter(x=>x.owner==='dealer'&&x.price>=26&&x.price<=42).slice(0,2);
assert(stock[0].price+stock[1].price>50);
const double=await Promise.all(stock.map(x=>op(winner,{type:'equipment_buy',asset:x.id,assetRevision:x.revision})));assert.deepEqual(double.map(x=>x.status).sort(),[200,400]);
const hostile=await op(h,{type:'bank_borrow',amount:30});assert.equal(hostile.status,400);
state=await op(loser,{type:'bank_borrow',amount:30});assert.equal(state.status,200);assert.equal(state.me.debt,30);assert.equal(state.me.financials.balance.balanceDifference,0);
const other=await request({type:'state',code:h.code},winner.token);assert.equal(other.institutions.bank.loans.length,0);assert(!JSON.stringify(state).includes(winner.token));
const ended=await op(h,{type:'end'});assert.equal(ended.status,200);assert.equal((await op(a,{type:'bank_borrow',amount:10})).status,400);for(const c of ended.debrief.companies)assert.equal(c.financials.balance.balanceDifference,0);
console.log('PASS real HTTP/D1 (also same-company double-spend race): hidden mode blocked, atomic two-buyer race, idempotent duplicate trade, seller gain, bank authorization, private loans, balanced reports and end lock. Room '+h.code);
