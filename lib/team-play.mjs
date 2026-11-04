export const normalizeCompanyName = name => String(name || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
export const companyNameKey = name => normalizeCompanyName(name).toLowerCase();
export const teamForKey = (r, key) => r.teams.find(t => t.key === key || t.collaborators?.some(m => m.key === key));
export const memberForKey = (t, key) => t?.key === key ? t : t?.collaborators?.find(m => m.key === key);
export const teamMembers = t => [{ id: t.id, roles: t.roles || [], name: t.memberName || '成员1', guideStep: t.guideStep || 0, ready: !!(t.memberReady ?? (!t.collaborators?.length && t.lobbyReady)) }, ...(t.collaborators || []).map(m => ({ id: m.id, roles: m.roles || [], name: m.name, guideStep: m.guideStep || 0, ready: !!m.memberReady }))];
export const allMembersGuided = (t, steps) => !!t.bot || teamMembers(t).every(m => m.guideStep >= steps);
export const allMembersReady = (t, steps) => !!t.bot || teamMembers(t).every(m => m.ready && m.guideStep >= steps);
export const publicMembers = (t, steps) => teamMembers(t).map(m => ({ id: m.id, roles: m.roles || [], name: m.name, guideComplete: m.guideStep >= steps, ready: m.ready && m.guideStep >= steps }));
