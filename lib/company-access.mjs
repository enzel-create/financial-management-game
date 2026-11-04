import { memberForKey } from './team-play.mjs';
export const COMPANY_ROLES = ['general', 'project', 'finance', 'operations'];
export const ROLE_NAMES = {general:['总经理','General manager'],project:['项目经理','Project manager'],finance:['财务经理','Finance manager'],operations:['运营经理','Operations manager']};
export const ACTION_ROLES = {
 company_design:'general',setup_upgrade:'general',setup_refund:'general',ready:'general',upgrade:'general',bankrupt:'general',
 plan_add:'general',plan_edit:'general',plan_move:'general',plan_cancel:'general',plan_reserve:'finance',
 bid:'project',withdraw:'project',joint_propose:'project',joint_accept:'project',joint_cancel:'project',information_support:'project',
 finance_budget:'finance',bank_borrow:'finance',bank_repay:'finance',surety_repay:'finance',loan:'finance',repay:'finance',guarantee_buy:'finance',guarantee_repay:'finance',
 equipment_buy:'operations',equipment_list:'operations',equipment_unlist:'operations',equipment_sell:'operations',compliance:'operations',welfare:'operations',rest:'operations',mode:'operations',
 team_assign:'general',approval_policy:'general'
};
export const people = t => [t,...(t.collaborators||[])];
export function assignments(t) {
 const ms=people(t), saved=t.roleAssignments;
 if(saved && COMPANY_ROLES.every(role=>ms.slice(0,4).some(m=>m.id===saved[role]))) return saved;
 const layout=ms.length===1?[0,0,0,0]:ms.length===2?[0,0,1,1]:ms.length===3?[0,1,2,0]:[0,1,2,3];
 return Object.fromEntries(COMPANY_ROLES.map((role,i)=>[role,ms[layout[i]].id]));
}
export const rolesFor=(t,id)=>COMPANY_ROLES.filter(role=>assignments(t)[role]===id);
export function permissions(t,key) { const m=memberForKey(t,key);if(!m)return []; const roles=rolesFor(t,m.id);return Object.keys(ACTION_ROLES).filter(type=>roles.includes(ACTION_ROLES[type])); }
export function assertPermission(t,key,type) {
 if(['guide_step','lobby_ready','approval_decide','approval_cancel'].includes(type))return;
 if(!permissions(t,key).includes(type)) throw Error('当前职位无此操作权限 / Your role cannot perform this action');
}
export function addActivity(r,t,key,a,extra={}) {
 const m=memberForKey(t,key);t.teamActivity??=[];
 t.teamActivity.unshift({id:crypto.randomUUID(),time:r.time,phase:r.phase,round:r.round||1,memberId:m?.id,member:m===t?t.memberName||'成员1':m?.name||'系统',roles:m?rolesFor(t,m.id):[],type:a.type,project:a.project,asset:a.asset,amount:Number.isFinite(Number(a.amount))?Number(a.amount):undefined,...extra});
 t.teamActivity=t.teamActivity.slice(0,150);
}
export function resetAssignmentsOnJoin(t) {
 // Joining redistributes the default seats; a customized company keeps its existing assignments.
 if(!t.roleAssignments)return;
 const map={...assignments(t)}, newest=people(t).at(-1), counts=Object.values(map).reduce((a,id)=>(a[id]=(a[id]||0)+1,a),{});
 const role=[...COMPANY_ROLES].reverse().find(role=>role!=='general'&&counts[map[role]]>1);
 if(role)map[role]=newest.id;
 t.roleAssignments=map;
}
export function approvalAmount(r,t,a) {
 if(a.type==='bank_borrow'||a.type==='bid')return Number(a.amount);
 if(a.type==='equipment_buy')return r.institutions?.equipment.find(e=>e.id===a.asset)?.price||0;
 if(a.type==='joint_propose')return Number(a.amount)*Number(a.share)/100;
 if(a.type==='joint_accept'){const o=r.projects.find(p=>p.id===a.project)?.jointOffers?.find(o=>o.id===a.offer);return o?o.amount*(o.partner===t.id?100-o.share:o.share)/100:0;}
 return 0;
}
export function needsApproval(r,t,a) {return people(t).length>1 && (approvalAmount(r,t,a)>=(t.approvalThreshold??50)||(a.type==='equipment_buy'&&Number(a.finance)>0));}
export function teamworkView(r,t,key) {return {roleAssignments:assignments(t),memberRoles:rolesFor(t,memberForKey(t,key)?.id),permissions:permissions(t,key),approvalThreshold:t.approvalThreshold??50,teamActivity:t.teamActivity||[],approvals:(t.approvals||[]).map(({actor,action,...p})=>({...p,action:{type:action.type,project:action.project,asset:action.asset,amount:action.amount,finance:action.finance}}))};}
