const specialties = new Set(['digital', 'industrial', 'medical', 'infrastructure', 'buildings']);
export function bidComplexity(p) {
    const req = Object.entries(p.requirements || {}).filter(([, v]) => v > 0), e = p.entryRules || {}, paths = e.anyOf || [];
    const alternatives = paths.length ? Math.min(...paths.map(path => Object.values(path).reduce((n, v) => n + Number(v), 0))) + paths.length : 0;
    return req.reduce((n, [, v]) => n + Number(v), 0) + req.length + 3 * Math.max(0, req.filter(([k]) => specialties.has(k)).length - 1) + alternatives + 2 * (e.completed || 0) + Math.ceil((e.netCash || 0) / 10) + 2 * Math.max(0, (p.crewSlots || 1) - 1);
}
export function bidWindow(p) { const score = bidComplexity(p); return score === 0 ? 30 : score <= 7 ? 45 : score <= 12 ? 60 : score <= 18 ? 75 : score <= 24 ? 90 : 120; }
