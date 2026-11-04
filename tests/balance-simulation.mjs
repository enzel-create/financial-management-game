import { newRoom as originalRoom, action, tick, ranking } from '../lib/game.mjs';
for (let run = 0; run < 2; run++) {
    const r = newRoom('SIM', 'h', 18);
    for (let i = 0; i < 12; i++)
        action(r, 'h', { type: 'add_bot', skill: i === 0 ? 0 : Math.min(10, i + 1) });
    action(r, 'h', { type: 'start' }, 0);
    tick(r, 1100000);
    console.log('SIM', run, r.phase, r.time, 'projects', r.projects.length, JSON.stringify(r.projects.reduce((a, p) => (a[p.state] = (a[p.state] || 0) + 1, a), {})));
    console.table(r.teams.map(t => ({ skill: t.skill, revenue: t.revenue, profit: t.profit, cash: t.cash, completed: t.completedProjects, management: t.managementPaid, growth: ranking(r, 'health').find(x => x.id === t.id).growth, upgrades: t.review.decisions.filter(x => x.type === 'upgrade').length })));
    console.log('unsold', r.projects.filter(p => p.state === 'unsold').map(p => ({ req: p.requirements, joint: p.jointOnly, bids: Object.keys(p.bids).length, reason: p.review })));
}

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
