import assert from 'node:assert/strict';import {newRoom,joinCompany,action} from '../lib/game.mjs';import {lobbySummary,LOBBY_ACTIVE_MS} from '../lib/lobby.mjs';
const r=newRoom('ABCD1234','secret-host');const now=Date.now();assert.equal(lobbySummary(r,now),null);r.lobbyPublic=true;r.lobbySeenAt=now;
joinCompany(r,'a','secret-a','Alpha','PrivateNickname');const x=lobbySummary(r,now);assert.equal(x.companyCount,1);assert.equal(x.playerCount,1);assert.equal(x.maxCompanyMembers,4);assert.equal(x.companies[0].members,1);
for(const secret of ['secret-host','secret-a','PrivateNickname','cash','bids'])assert(!JSON.stringify(x).includes(secret));
assert.equal(lobbySummary(r,now+LOBBY_ACTIVE_MS+1),null);r.phase='running';assert.equal(lobbySummary(r,now),null);r.phase='lobby';
action(r,'secret-host',{type:'lobby_visibility',public:false},now);assert.equal(lobbySummary(r,now),null);assert.throws(()=>action(r,'secret-a',{type:'lobby_visibility',public:true}),/权限/);
action(r,'secret-host',{type:'lobby_visibility',public:true},now);assert(lobbySummary(r,now));
for(let i=1;i<12;i++)action(r,'secret-host',{type:'add_bot',skill:5});for(let i=1;i<4;i++)joinCompany(r,'m'+i,'secret'+i,'Alpha');assert.equal(lobbySummary(r,now),null);
console.log('PASS lobby: opt-in listing, live host, pre-start only, full-room exclusion, safe summaries, host-only visibility and fixed seat limit');
