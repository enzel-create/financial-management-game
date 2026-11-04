import assert from 'node:assert/strict';
import { newRoom as originalRoom, tick, action, view } from '../lib/game.mjs';
import { newsEffect } from '../lib/market-news.mjs';
for (let run = 0; run < 5; run++) {
    const r = newRoom('N', 'h', 20);
    r.phase = 'running';
    r.auto = false;
    r.duration = 3000;
    tick(r, 3000000);
    assert.equal(r.news.length, 100);
    assert.equal(new Set(r.news.map(n => n.id)).size, 100);
    assert.equal(r.nextNews, null);
    const times = [...new Set(r.news.map(n => n.time))];
    assert(times[0] >= 25 && times[0] <= 50);
    for (let i = 0; i < times.length; i++) {
        if (i)
            assert(times[i] - times[i - 1] >= 25 && times[i] - times[i - 1] <= 50);
        const batch = r.news.filter(n => n.time === times[i]);
        assert(batch.length <= 5);
        if (i < times.length - 1)
            assert(batch.length >= 2);
    }
    for (const n of r.news) {
        assert(n.duration >= 45 && n.duration <= 120);
        assert(n.endsAt === Math.min(r.duration, n.time + n.duration));
    }
    console.log(JSON.stringify({ run, events: r.news.length, batches: times.length, first: times[0], last: times.at(-1), intervals: times.slice(1, 6).map((t, i) => t - times[i]) }));
}
const legacy = newRoom('N', 'h', 18);
delete legacy.newsScheduleVersion;
legacy.nextNews = 120;
legacy.phase = 'running';
legacy.auto = false;
tick(legacy, 1000);
assert(legacy.nextNews >= 26 && legacy.nextNews <= 51);
assert.equal(legacy.news.length, 0);
action(legacy, 'h', { type: 'pause' }, 1000);
const next = legacy.nextNews;
tick(legacy, 900000);
assert.equal(legacy.nextNews, next);
legacy.news = Array.from({ length: 5 }, () => ({ track: 'digital', kind: 'cost', value: .06, time: 0, endsAt: 100 }));
assert.equal(newsEffect(legacy, { specialty: 'digital' }, 'cost'), .08);
console.log('PASS random intervals/counts/durations, exhaustion, migration, pause and stacking caps');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
