import assert from 'node:assert/strict';
import {newRoom,addTeam,action,tick,view} from '../lib/game.mjs';
import {openFinancialBooks,financialReport} from '../lib/financial-reporting.mjs';
import {bankQuote,suretyQuote,bindBonds,closeInstitutionsProject,assignEquipment,equipmentSpeed,tickInstitutions,exitInstitutions,settleInstitutions} from '../lib/institutions.mjs';
const make=()=>{const r=newRoom('ABCD1234','host',18);addTeam(r,'a','a','Alpha');addTeam(r,'b','b','Beta');for(const t of r.teams){t.guideStep=10;openFinancialBooks(r,t)}r.phase='running';r.last=100000;r.auto=false;r.modules.news=false;return r;};
const balanced=r=>{for(const t of r.teams){const f=financialReport(r,t);assert.equal(f.balance.balanceDifference,0,JSON.stringify({company:t.id,time:r.time,b:f.balance}));assert.ok(Number.isFinite(f.income.pretaxProfit));}};
const act=(r,id,a)=>action(r,id,{round:1,...a});
const buy=(r,t,e,finance=0)=>act(r,t,{type:'equipment_buy',asset:e.id,assetRevision:e.revision,finance});
{
 const r=make(),[a,b]=r.teams,e=r.institutions.equipment[0];const snapshot=JSON.stringify(r);view(r,'a');assert.equal(JSON.stringify(r),snapshot,'view is read-only');buy(r,'a',e);balanced(r);assert.equal(e.book,48);assert.equal(a.cash,112);
 const old=e.revision;assert.throws(()=>buy(r,'b',{...e,revision:old-1}));assert.equal(b.cash,160);
 act(r,'a',{type:'equipment_list',asset:e.id,assetRevision:e.revision,price:40});const rev=e.revision;buy(r,'b',e);balanced(r);assert.equal(a.profit,-8);assert.equal(e.owner,'b');assert.throws(()=>buy(r,'a',{...e,revision:rev}));
 const p={id:'p',owner:'b',state:'building',price:70,cost:50,paidCost:0,paymentVersion:2,costPayments:[],receipts:[]};r.projects.push(p);assignEquipment(r,p);assert.ok(equipmentSpeed(r,p)>1);assert.throws(()=>act(r,'b',{type:'equipment_sell',asset:e.id,assetRevision:e.revision}));
 for(let i=1;i<=100;i++){r.time=i;tickInstitutions(r);balanced(r)}assert.ok(e.book<40);assert.ok(b.equipmentMaintenance>0);p.state='done';b.revenue=70;b.profit+=70;p.receipts=[{amount:70,received:false}];closeInstitutionsProject(r,p);balanced(r);
}
{
 const r=make(),a=r.teams[0],e=r.institutions.equipment[2];buy(r,'a',e,30);balanced(r);assert.ok(e.lien);assert.equal(a.debt,30);assert.throws(()=>act(r,'a',{type:'equipment_list',asset:e.id,assetRevision:e.revision,price:40}));
 for(let i=1;i<=60;i++){r.time=i;tickInstitutions(r);balanced(r)}assert.ok(a.bankInterest>0);act(r,'a',{type:'bank_repay',loan:r.institutions.bank.loans[0].id});assert.equal(e.lien,null);balanced(r);
 const q=bankQuote(r,a);act(r,'a',{type:'bank_borrow',amount:10});assert.ok(bankQuote(r,a).rate>=q.rate);balanced(r);assert.throws(()=>act(r,'a',{type:'bank_borrow',amount:1e9}));
}
{
 const r=make(),a=r.teams[0],e=r.institutions.equipment[0];buy(r,'a',e,30);a.profit-=a.cash;a.cash=0;for(let i=1;i<=391;i++){r.time=i;tickInstitutions(r);balanced(r)}assert.equal(e.owner,'retired');assert.equal(r.institutions.bank.loans[0].status,'defaulted');assert.equal(bankQuote(r,a).approved,false);balanced(r);
}
{
 const r=make(),a=r.teams[0],p={id:'p',publicWork:true,owner:'a',price:100,state:'open',paymentVersion:2,paidCost:0,receipts:[],costPayments:[{amount:60,paid:false}],cost:60};r.projects.push(p);const q=suretyQuote(r,a,p,100);assert.equal(q.approved,true);const before=a.cash;bindBonds(r,p);p.state='building';assert.equal(a.cash,Math.round((before-q.premium)*100)/100);balanced(r);p.state='terminated';closeInstitutionsProject(r,p);assert.ok(a.suretyRecourse>0);assert.equal(a.cash,Math.round((before-q.premium)*100)/100);balanced(r);const debt=a.suretyRecourse;closeInstitutionsProject(r,p);assert.equal(a.suretyRecourse,debt);act(r,'a',{type:'surety_repay'});balanced(r);assert.equal(a.suretyRecourse,0);
 assert.equal(suretyQuote(r,a,p,100000).approved,false);
}
{
 const r=make(),a=r.teams[0];act(r,'a',{type:'bank_borrow',amount:30});buy(r,'b',r.institutions.equipment[1]);for(let i=1;i<=r.duration;i++){tick(r,100000+i*1000);balanced(r)}assert.equal(r.phase,'finished');const snapshot=JSON.stringify(r);tick(r,9999999);assert.equal(JSON.stringify(r.institutions),JSON.stringify(JSON.parse(snapshot).institutions));assert.throws(()=>buy(r,'a',r.institutions.equipment[0]));const saved=JSON.parse(snapshot);balanced(saved);assert.equal(view(saved,'a').institutions.bank.loans[0].principal,0);
}
console.log('Institution checks passed: ownership, stale transactions, liens, purchases, depreciation, maintenance, interest, default, surety claim/recourse, serialization and full-round accounting.');
