import { randomInt } from './catalog.mjs';
export const staggered = r => r.waveVersion >= 1 && r.modelVersion === 2;
export function startWave(r) { const count = 3 + randomInt(3); let offsets = []; if (r.waveVersion === 1)
    offsets = Array.from({ length: count }, (_, i) => i * 15);
else {
    let remaining = count;
    const times = [0];
    while (times.length < count) {
        const at = 8 + randomInt(68);
        if (!times.includes(at))
            times.push(at);
    }
    times.sort((a, b) => a - b);
    for (const at of times) {
        if (!remaining)
            break;
        const group = Math.min(remaining, 1 + randomInt(2));
        for (let i = 0; i < group; i++)
            offsets.push(at);
        remaining -= group;
    }
} r.waveDue = offsets.map(i => r.time + i).filter(at => at <= r.duration - 240); r.nextWave = r.time + 90; }
export function advanceWave(r, release) { if (!r.auto || r.time > r.duration - 240) {
    r.waveDue = [];
    return;
} if (r.time >= r.nextWave)
    startWave(r); while (r.waveDue?.length && r.waveDue[0] <= r.time) {
    const at = r.waveDue.shift();
    let count = 1;
    while (r.waveDue[0] === at) {
        r.waveDue.shift();
        count++;
    }
    release(r, count);
} }
