import assert from 'node:assert/strict';
const origin=process.env.GAME_TEST_ORIGIN||'http://127.0.0.1:5173';if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw Error('Local test only');
async function req(b,token){const r=await fetch(origin+'/api/game',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(b)});return {status:r.status,...await r.json()};}
const pub=await req({type:'create',minutes:18,lobbyPublic:true}),privateRoom=await req({type:'create',minutes:18,lobbyPublic:false});assert.equal(pub.status,200);assert.equal(privateRoom.status,200);
let list=await req({type:'lobby'});assert.equal(list.status,200);assert(list.rooms.some(r=>r.code===pub.code));assert(!list.rooms.some(r=>r.code===privateRoom.code));assert(!JSON.stringify(list).includes(pub.token));
const member=await req({type:'join',code:pub.code,name:'Lobby QA',memberName:'PrivateNickname'});assert.equal(member.status,200);list=await req({type:'lobby'});const row=list.rooms.find(r=>r.code===pub.code);assert.equal(row.playerCount,1);assert.equal(row.companies[0].members,1);assert(!JSON.stringify(list).includes('PrivateNickname'));assert(!JSON.stringify(row).includes('cash'));
const op=(token,b)=>req({code:pub.code,round:1,teamRevision:0,requestId:crypto.randomUUID(),...b},token);
assert.equal((await op(member.token,{type:'lobby_visibility',public:false})).status,400);
assert.equal((await op(pub.token,{type:'lobby_visibility',public:false})).status,200);assert(!(await req({type:'lobby'})).rooms.some(r=>r.code===pub.code));
assert.equal((await op(pub.token,{type:'lobby_visibility',public:true})).status,200);
for(let step=1;step<=10;step++)assert.equal((await op(member.token,{type:'guide_step',step})).status,200);
assert.equal((await op(member.token,{type:'lobby_ready'})).status,200);assert.equal((await op(pub.token,{type:'add_bot',skill:5})).status,200);assert.equal((await op(pub.token,{type:'start'})).status,200);assert(!(await req({type:'lobby'})).rooms.some(r=>r.code===pub.code));
console.log('PASS anonymous lobby HTTP/D1: public discovery, private exclusion, safe member counts, host-only visibility and automatic removal on start.');
if(process.env.CREATE_UI_ROOM==='1'){const room=await req({type:'create',minutes:18,lobbyPublic:true});console.log('UI room '+room.code);}
