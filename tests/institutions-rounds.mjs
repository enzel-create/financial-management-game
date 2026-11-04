import assert from 'node:assert/strict';import {newRoom,action,tick} from '../lib/game.mjs';import {financialReport} from '../lib/financial-reporting.mjs';
// Fresh public rooms, not the legacy fixtures in the historical suite.
let completions=0,bonds=0;
for(const count of [2,6,12]){
 const r=newRoom('ROUND','host',18);for(let i=0;i<count;i++)action(r,'host',{type:'add_bot',skill:8+i%3},0);r.modules.manualCompliance=false;
 action(r,'host',{type:'start'},0);let invested=false;
 for(let now=0;now<1500000&&r.phase!=='finished';now+=1000){tick(r,now);if(r.phase==='running'&&!invested){invested=true;for(const [i,t] of r.teams.entries()){if(i%2===0){const e=r.institutions.equipment.find(e=>e.owner==='dealer');action(r,t.key,{type:'equipment_buy',asset:e.id,assetRevision:e.revision,finance:15},now)}else action(r,t.key,{type:'bank_borrow',amount:20},now);}}
  for(const t of r.teams){const f=financialReport(r,t);if(f.available)assert.equal(f.balance.balanceDifference,0,JSON.stringify({count,time:r.time,t:t.name,b:f.balance}));}
  assert(r.institutions.bank.cash>=0);assert(r.institutions.surety.cash>=0);
 }
 assert.equal(r.phase,'finished');const done=r.projects.filter(p=>p.state==='done').length;completions+=done;bonds+=r.institutions.surety.bonds.length;assert(done>0);assert(r.institutions.bank.loans.length>0);assert(r.teams.some(t=>t.depreciation>0));console.log(JSON.stringify({companies:count,completed:done,bonds:r.institutions.surety.bonds.length,bankDefaults:r.teams.reduce((n,t)=>n+(t.bankDefaults||0),0),bankCash:r.institutions.bank.cash,suretyCash:r.institutions.surety.cash}));
}
assert(bonds>0);console.log('PASS new-room 2/6/12-company full rounds: construction + bank + equipment + surety, accounting checked every simulated second.');
