import { newRoom as originalRoom, action, tick, ranking } from '../lib/game.mjs';
for (const size of [4, 8, 12])
    for (const mixed of [false, true])
        for (let run = 0; run < 3; run++) {
            const r = newRoom('SIM', 'h', 18);
            for (let i = 0; i < size; i++)
                action(r, 'h', { type: 'add_bot', skill: mixed ? 2 + i % 9 : 10 });
            action(r, 'h', { type: 'start' }, 0);
            tick(r, 1100000);
            const good = r.teams.filter(t => t.skill >= 7);
            console.log(JSON.stringify({ size, mixed, run, done: r.projects.filter(p => p.state === 'done').length, unsold: r.projects.filter(p => p.state === 'unsold').length, zero: r.teams.filter(t => !t.revenue).length, profitable: r.teams.filter(t => t.profit > 0 && t.revenue > 0).length, good: good.length, goodProfitable: good.filter(t => t.profit > 0 && t.revenue > 0).length, avgProfit: r.teams.reduce((n, t) => n + t.profit, 0) / size, health: ranking(r, 'health').map(t => t.growth), revenue: r.teams.map(t => t.revenue) }));
        }

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
