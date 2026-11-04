import { CATALOG } from './catalog.mjs';
const variants = [['维护与适应性改造', 'Maintenance & adaptation'], ['标准化扩建', 'Standard expansion'], ['分期运营交付', 'Phased operational delivery'], ['复杂系统整合', 'Complex systems integration']];
const round = x => Math.round(x * 100) / 100;
export const EXPANDED_CATALOG = CATALOG.flatMap((p, index) => variants.map(([zh, en], v) => {
    const si = Number(p.catalogId.split('-')[1]), track = si === 0 ? 'digital' : [1, 5].includes(si) ? 'industrial' : [2, 3].includes(si) ? 'medical' : [4, 6, 7, 9].includes(si) ? 'infrastructure' : 'buildings';
    const supports = { digital: ['technology', 'quality'], industrial: ['procurement', 'safety'], medical: ['quality', 'talent'], infrastructure: ['coordination', 'compliance'], buildings: ['procurement', 'coordination'] }[track], req = v === 0 ? {} : { [track]: v === 1 ? 2 : v === 2 ? 3 + index % 2 : 4 + index % 2, [supports[index % 2]]: v === 1 ? 1 + index % 2 : v === 2 ? 2 + index % 2 : 3 };
    const alternatives = v < 2 ? [] : [{ [supports[(index + 1) % 2]]: v + 1 }, { [index % 2 ? 'technology' : 'talent']: v, [index % 2 ? 'coordination' : 'quality']: 2 }];
    const base = Math.round(p.base * [.65, .9, 1.12, 1.32][v]), weights = p.costSchedule.map((x, j) => Math.max(5, x.share + (j === 1 ? v * 2 : j === 3 ? -v * 2 : 0))), sum = weights.reduce((a, b) => a + b, 0);
    let used = 0;
    const costs = p.costSchedule.map((x, j) => { const share = j === 4 ? 100 - used : Math.round(weights[j] / sum * 100); used += share; return { ...x, share, at: j === 0 ? 0 : j === 4 ? 100 : Math.min(95, Math.max(5, x.at + (v - 1) * 2)), label: [zh + ' · ' + x.label[0], en + ' · ' + x.label[1]] }; });
    return { ...p, catalogId: p.catalogId + '-v' + v, name: p.name + ' · ' + zh, modelVersion: 2, specialty: track, releaseTier: v, base, ceiling: Math.round(base * 1.6), duration: Math.round(65 + base * .65 + v * 8), requirements: req, entryRules: { anyOf: alternatives, completed: v === 3 && index % 3 === 0 ? 1 : 0, netCash: v >= 2 ? 10 + (index % 3) * 5 : 0 }, crewSlots: v === 3 && index % 2 === 0 ? 2 : 1, costSchedule: costs, receiptSchedule: p.receiptSchedule.map(x => ({ ...x, delay: Math.max(4, x.delay + (v - 1) * 2), label: [zh + ' · ' + x.label[0], en + ' · ' + x.label[1]] })) };
}));
// Spread each difficulty across the catalog instead of grouping early access by sector.
export const JOINT_CATALOG = CATALOG.flatMap((_, i) => [0, 1].map(v => {
    const rank = ((i * 2 + v) * 37) % 100, tier = rank < 30 ? 1 : rank < 65 ? 2 : 3;
    const original = EXPANDED_CATALOG[i * 4 + 2 + v], p = EXPANDED_CATALOG[i * 4 + tier], tracks = ['digital', 'industrial', 'medical', 'infrastructure', 'buildings'], secondary = tracks[(tracks.indexOf(p.specialty) + 1 + i % 4) % 5];
    const base = Math.round(p.base * ({ 1: 1.15, 2: 1.3, 3: 1.5 }[tier]));
    return { ...p, catalogId: original.catalogId + '-joint', name: p.name + ' · 跨专业专项 ' + (v + 1), jointOnly: false, crossSpecialty: true, releaseTier: tier, base, ceiling: Math.round(base * 1.65), duration: Math.round(p.duration * (tier === 1 ? 1 : 1.1)), crewSlots: 2,
        requirements: { [p.specialty]: tier === 1 ? 2 : tier === 2 ? 3 : 4 + i % 2, [secondary]: tier === 1 ? 1 : tier === 2 ? 2 : 3, coordination: tier === 1 ? 1 : tier === 2 ? 2 : 3 },
        entryRules: { anyOf: tier === 3 ? [{ quality: 3 }, { safety: 3, compliance: 2 }] : [], completed: tier === 3 ? 1 : 0, netCash: tier === 1 ? 0 : tier === 2 ? 10 : 20 } };
}));
export const FULL_CATALOG = [...EXPANDED_CATALOG, ...JOINT_CATALOG];
export const catalogFor = r => r.catalogVersion >= 4 ? FULL_CATALOG : r.catalogVersion === 3 ? EXPANDED_CATALOG : CATALOG;
