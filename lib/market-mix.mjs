export const MARKET_MIX = [[100, 0, 0, 0], [50, 50, 0, 0], [20, 35, 45, 0], [10, 25, 25, 40]];
export function drawTier(stage, roll) { let cumulative = 0; const mix = MARKET_MIX[Math.max(0, Math.min(3, stage))]; for (let i = 0; i < mix.length; i++) {
    cumulative += mix[i];
    if (roll < cumulative)
        return i;
} return 0; }
