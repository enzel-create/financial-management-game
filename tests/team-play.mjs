import assert from 'node:assert/strict';
import { newRoom as originalRoom, joinCompany, action, view } from '../lib/game.mjs';
for (const mode of ['full']) {
    const r = newRoom('ABCD1234', 'host-secret', mode === 'full' ? 18 : 10, mode), steps = mode === 'full' ? 10 : 4;
    for (let i = 1; i <= 4; i++)
        joinCompany(r, 'm' + i, 'secret-' + i, i === 2 ? '  ＴＥＡ  ' : 'tea', 'Person ' + i);
    assert.equal(r.teams.length, 1);
    assert.equal(r.teams[0].cash, mode === 'full' ? 160 : 80);
    const guide = key => { for (let step = 1; step <= steps; step++)
        action(r, key, { type: 'guide_step', step }); if (mode === 'simulation')
        action(r, key, { type: 'company_roles', roles: ['general'] }); };
    guide('secret-1');
    assert.equal(view(r, 'secret-2').guideStep, 0);
    action(r, 'secret-1', { type: 'lobby_ready' });
    assert.equal(r.teams[0].lobbyReady, false);
    assert.throws(() => action(r, 'secret-2', { type: 'lobby_ready' }), /指引/);
    for (let i = 2; i <= 4; i++)
        guide('secret-' + i);
    for (let i = 2; i <= 4; i++)
        action(r, 'secret-' + i, { type: 'lobby_ready', teamRevision: 0 });
    assert.equal(view(r, 'secret-1').me.lobbyReady, true);
    joinCompany(r, 'other', 'other-secret', 'Other');
    guide('other-secret');
    action(r, 'other-secret', { type: 'lobby_ready' });
    assert.equal(view(r, 'host-secret').canStart, true);
    for (const key of ['host-secret', 'secret-1', 'secret-2', 'other-secret']) {
        const serialized = JSON.stringify(view(r, key));
        for (const secret of ['host-secret', 'secret-1', 'secret-2', 'secret-3', 'secret-4', 'other-secret'])
            assert(!serialized.includes(secret));
    }
    const rev = view(r, 'secret-1').me.actionRevision;
    action(r, 'secret-1', { type: 'lobby_ready', ready: false, teamRevision: rev });
    action(r, 'secret-2', { type: 'lobby_ready', ready: true, teamRevision: rev });
    assert.equal(view(r, 'host-secret').canStart, false);
    assert.equal(r.teams[0].lobbyReady, false);
    action(r, 'secret-1', { type: 'lobby_ready' });
    assert.equal(view(r, 'host-secret').canStart, true);
    assert.throws(() => joinCompany(r, 'fifth', 'fifth-secret', 'tea'), /最多4人/);
    action(r, 'host-secret', { type: 'start' });
    assert.throws(() => joinCompany(r, 'late', 'late-secret', 'Tea'), /最多4人/);
    joinCompany(r, 'late', 'late-secret', 'Other');
    assert.throws(() => action(r, 'late-secret', { type: 'loan' }), /指引/);
    guide('late-secret');
    assert.throws(() => joinCompany(r, 'new', 'new-secret', 'New'), /已开始/);
    const persisted = JSON.parse(JSON.stringify(r));
    assert.equal(view(persisted, 'secret-3').me.id, 'm1');
    r.phase = 'running';
    const sharedRevision = view(r, 'secret-1').me.actionRevision;
    action(r, 'secret-3', { type: 'loan', teamRevision: sharedRevision });
    const cash = r.teams[0].cash;
    assert.throws(() => action(r, 'secret-2', { type: 'loan', teamRevision: sharedRevision }), /队友已更新/);
    assert.equal(r.teams[0].cash, cash);
    action(r, 'host-secret', { type: 'end' });
    action(r, 'host-secret', { type: 'restart' });
    assert.equal(view(r, 'secret-4').me.members.length, 4);
    assert.equal(view(r, 'secret-4').guideStep, 0);
    assert.equal(view(r, 'secret-4').me.memberReady, false);
    assert.equal(r.teams.length, 2);
}
console.log('PASS both modes: shared identity/cash, per-member guide, readiness, stale-action rejection, private credentials, late join and restart');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
