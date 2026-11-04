import { COST_SCHEDULES, receiptSchedule } from './milestones.mjs';
import { MARKET } from './market.mjs';
// Gameplay values are illustrative, not actual sector cost estimates.
const COSTS = [60, 85, 100, 130, 150, 110, 180, 140, 75, 95];
export const CATALOG = MARKET.flatMap((m, si) => m.names.map((name, i) => { const base = COSTS[(si * 3 + i) % COSTS.length]; return { catalogId: `sector-${si}-${i}`, costSchedule: COST_SCHEDULES[`sector-${si}-${i}`], receiptSchedule: receiptSchedule(COST_SCHEDULES[`sector-${si}-${i}`]), name, sector: m.sector, change: m.change, base, ceiling: Math.round(base * (1.42 + (i % 3) * .05)), duration: Math.round(70 + base * .75) }; }));
export function randomInt(n) { const limit = Math.floor(4294967296 / n) * n; let x; do {
    x = crypto.getRandomValues(new Uint32Array(1))[0];
} while (x >= limit); return x % n; }
export function shuffledPool(count = CATALOG.length) { let a = Array.from({ length: count }, (_, i) => i); for (let i = a.length - 1; i > 0; i--) {
    let j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
} return a; }
