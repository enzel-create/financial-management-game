import assert from 'node:assert/strict';
import {newRoom,joinCompany,action,view,release} from '../lib/game.mjs';
import {rolesFor} from '../lib/company-access.mjs';
import {openFinancialBooks,financialReport} from '../lib/financial-reporting.mjs';
function room(count=4){const r=newRoom('ABCD1234','host-secret');for(let i=0;i<count;i++)joinCompany(r,'m'+i,'key'+i,'Company','Person'+i);const t=r.teams[0];for(const m of [t,...t.collaborators])m.guideStep=10;openFinancialBooks(r,t);return [r,t];}
for(let n=1;n<=4;n++){const [r,t]=room(n);assert.equal(t.cash,160);assert.equal(t.setupPoints,8);const map=view(r,'key0').me.roleAssignments;assert.equal(Object.keys(map).length,4);assert.equal(new Set(Object.values(map)).size,n);assert.equal(financialReport(r,t).balance.balanceDifference,0);if(n===4)assert.throws(()=>joinCompany(r,'extra','x','Company'),/最多4/);}
{
 const [r,t]=room();r.phase='running';
 assert.throws(()=>action(r,'key1',{type:'bank_borrow',amount:20}),/权限/);
 assert.throws(()=>action(r,'key0',{type:'bank_borrow',amount:20}),/权限/);
 action(r,'key2',{type:'bank_borrow',amount:20});assert(t.cash>160);assert.equal(t.teamActivity[0].member,'Person2');
 const e=r.institutions.equipment.find(e=>e.price>=50);assert(e);const a={type:'equipment_buy',asset:e.id,assetRevision:e.revision};const cash=t.cash;
 action(r,'key3',a);assert.equal(t.cash,cash);assert.equal(e.owner,'dealer');const pending=t.approvals.at(-1);assert.equal(pending.status,'pending');
 assert.throws(()=>action(r,'key3',{type:'approval_decide',id:pending.id,approve:true}),/另一位/);
 assert.throws(()=>action(r,'key1',{type:'approval_decide',id:pending.id,approve:true}),/另一位/);
 const snapshot=JSON.stringify(view(r,'key1'));for(const k of ['key0','key1','key2','key3','host-secret'])assert(!snapshot.includes('"'+k+'"'));
 action(r,'key2',{type:'approval_decide',id:pending.id,approve:true});assert.equal(e.owner,t.id);assert.equal(pending.status,'approved');assert.equal(t.cash,cash-e.basis);assert.equal(financialReport(r,t).balance.balanceDifference,0);
 assert(t.teamActivity.some(x=>x.type==='equipment_buy'&&x.member==='Person3'&&x.approved));assert.equal(t.teamActivity[0].member,'Person2');
 assert.throws(()=>action(r,'key0',{type:'approval_decide',id:pending.id,approve:true}),/已处理/);
 const small=r.institutions.equipment.find(e=>e.owner==='dealer'&&e.price<50);action(r,'key3',{type:'equipment_buy',asset:small.id,assetRevision:small.revision,finance:10});const req=t.approvals.at(-1);assert.equal(small.owner,'dealer');
 small.revision++;assert.throws(()=>action(r,'key0',{type:'approval_decide',id:req.id,approve:true}));assert.equal(small.owner,'dealer');assert.equal(req.status,'pending');
 r.time=req.expiresAt;assert.throws(()=>action(r,'key0',{type:'approval_decide',id:req.id,approve:true}),/过期/);
 action(r,'key3',{type:'approval_cancel',id:req.id});assert.equal(req.status,'cancelled');
 const rev=t.actionRevision;action(r,'key0',{type:'team_assign',role:'project',memberId:'m3',teamRevision:rev});assert.deepEqual(rolesFor(t,'m3'),['project']);assert.deepEqual(rolesFor(t,'m1'),['operations']);
 assert.throws(()=>action(r,'key3',{type:'equipment_sell',asset:e.id,assetRevision:e.revision}),/权限/);
 assert.throws(()=>action(r,'key0',{type:'approval_policy',amount:80,teamRevision:rev}),/队友已更新/);
 action(r,'key0',{type:'approval_policy',amount:80});assert.equal(t.approvalThreshold,80);
 action(r,'key0',{type:'team_assign',role:'general',memberId:'m2'});assert(rolesFor(t,'m2').includes('general'));assert(rolesFor(t,'m0').includes('finance'));
 assert.throws(()=>action(r,'key0',{type:'team_assign',role:'project',memberId:'m0'}),/权限/);
 const loaded=JSON.parse(JSON.stringify(r));assert.deepEqual(view(loaded,'key2').me.roleAssignments,t.roleAssignments);assert(view(loaded,'key2').me.teamActivity.length>0);
 action(r,'host-secret',{type:'end'});action(r,'host-secret',{type:'restart'});assert.equal(view(r,'key2').me.teamActivity.length,0);assert.deepEqual(view(r,'key2').me.roleAssignments,t.roleAssignments);assert.equal(view(r,'key2').me.approvalThreshold,80);
}
{
 const [r,t]=room(1);r.phase='running';const e=r.institutions.equipment.find(e=>e.price>=50);action(r,'key0',{type:'equipment_buy',asset:e.id,assetRevision:e.revision});assert.equal(e.owner,t.id);assert(!t.approvals?.length);
}
{
 const [r,t]=room(4);r.phase='running';release(r,1);const p=r.projects[0];
 action(r,'key1',{type:'bid',project:p.id,amount:100});assert.equal(Object.keys(p.bids).length,0);assert.equal(t.approvals.length,1);
 action(r,'key2',{type:'approval_decide',id:t.approvals[0].id,approve:true});assert.equal(p.bids[t.id].amount,100);
}
console.log('PASS 1–4 seats, fixed opening resources, role permissions, independent approvals, stale assets/revisions, expiry, exact accounting, private credentials, shared history and restart');
