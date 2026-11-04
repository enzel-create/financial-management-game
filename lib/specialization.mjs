// Simulated commercial capabilities, not legal license categories.
export function specialtyRequirements(p) {
    const [, s0, i0] = (p.catalogId || '').split('-'), s = Number(s0), i = Number(i0);
    if (!Number.isInteger(s) || !Number.isInteger(i))
        return {};
    const track = s === 0 ? 'digital' : [1, 5].includes(s) ? 'industrial' : [2, 3].includes(s) ? 'medical' : [4, 6, 7, 9].includes(s) ? 'infrastructure' : 'buildings';
    // Each sector retains an entry project. Smaller building sectors remain accessible longer.
    if (i === 0 || (['buildings'].includes(track) && i === 1))
        return {};
    const level = i === 1 ? 1 : 2, req = { [track]: level };
    // Different delivery risks, rather than the same safety/compliance/insurance ladder.
    const support = track === 'digital' ? 'insurance' : track === 'industrial' ? 'safety' : track === 'medical' ? 'compliance' : track === 'infrastructure' ? (s === 9 ? 'compliance' : 'safety') : (s === 14 ? 'insurance' : 'compliance');
    if (level === 2)
        req[support] = 1;
    return req;
}
