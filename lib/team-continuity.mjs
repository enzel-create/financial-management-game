import { cashEvent, decisionEvent } from './debrief.mjs';
export function updateTeamContinuity(r, t, working) {
    t.teamStability ??= 100;
    const strained = working && t.fatigue >= 70;
    t.teamStability = Math.max(0, Math.min(100, t.teamStability + (strained ? -.12 * (1 - (t.levels.talent || 0) * .05) : .015)));
    t.highPressureSeconds = strained ? (t.highPressureSeconds || 0) + 1 : 0;
    if (t.highPressureSeconds >= 60 && r.time >= (t.staffGapUntil || 0)) {
        t.highPressureSeconds = 0;
        t.staffGapUntil = r.time + 60;
        t.turnoverCosts = (t.turnoverCosts || 0) + 3;
        t.cash = Math.round((t.cash - 3) * 100) / 100;
        t.profit = Math.round((t.profit - 3) * 100) / 100;
        cashEvent(r, t, -3, 'staff_replacement');
        decisionEvent(r, t, 'staff_replacement', { until: t.staffGapUntil }, 'system');
    }
}
