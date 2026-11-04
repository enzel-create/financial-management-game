// Public lobby responses are allowlisted summaries, never room state or credentials.
export const LOBBY_ACTIVE_MS = 10 * 60 * 1000;
export function lobbySummary(r, now = Date.now()) {
 if(r.lobbyPublic!==true||r.phase!=='lobby'||r.gameMode!=='full'||!r.lobbySeenAt||now-r.lobbySeenAt>LOBBY_ACTIVE_MS)return null;
 const companies=(r.teams||[]).map(t=>({name:t.name,members:1+(t.collaborators?.length||0),bot:!!t.bot}));
 const canCreate=companies.length<12, canJoin=companies.some(t=>!t.bot&&t.members<4);
 if(!canCreate&&!canJoin)return null;
 return {code:r.code,minutes:r.duration/60,companies,companyCount:companies.length,playerCount:companies.filter(t=>!t.bot).reduce((n,t)=>n+t.members,0),canCreateCompany:canCreate,maxCompanies:12,maxCompanyMembers:4};
}
