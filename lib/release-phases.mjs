import { requirements } from './compliance.mjs';
// The shuffled pool is retained; only projects unlocked at this game time may leave it.
export function projectTier(project, specialized = false) { if (project.modelVersion === 2)
    return project.releaseTier; const values = Object.values(requirements(project, specialized)); if (specialized)
    return values.length ? Math.max(...values) : 0; return !values.length ? 0 : values.length === 1 && values[0] === 1 ? 1 : 2; }
export function releaseStage(r) { if (r.modelVersion === 2)
    return r.time < Math.ceil(r.duration * .2) ? 0 : r.time < Math.ceil(r.duration * .4) ? 1 : r.time < Math.ceil(r.duration * .6) ? 2 : 3; return r.time < Math.ceil(r.duration * .25) ? 0 : r.time < Math.ceil(r.duration * .5) ? 1 : 2; }
export function nextUnlock(r) { const stage = releaseStage(r); if (r.modelVersion === 2)
    return stage < 3 ? Math.ceil(r.duration * [.2, .4, .6][stage]) : null; return stage === 0 ? Math.ceil(r.duration * .25) : stage === 1 ? Math.ceil(r.duration * .5) : null; }
export function availableIndices(r, catalog) { return r.pool.filter(i => r.releaseVersion !== 1 || projectTier(catalog[i], r.specialtyVersion === 1) <= releaseStage(r)); }
