export const UPGRADES = { safety: { name: '安全管理', price: 18, time: 45, max: 2, detail: '一级安全检查费1万；二级为新中标项目自动完成安全检查。' }, compliance: { name: '合同合规', price: 18, time: 50, max: 2, detail: '一级资料办理费1万；二级为新中标项目自动完成合同资料。' }, insurance: { name: '保险保障', price: 22, time: 45, max: 2, detail: '模拟第三方索赔减少30% / 60%，不承担整改费用或停工延误。' }, cost: { name: '成本控制', price: 25, time: 75, max: 3, detail: '每级降低新项目基础成本 7%' }, speed: { name: '施工效率', price: 25, time: 75, max: 3, detail: '每级缩短新项目工期 10%' }, crew: { name: '施工队伍', price: 40, time: 100, max: 2, detail: '每级增加 1 个并行项目位' } };
export const SPECIALTY_KEYS = ['digital', 'industrial', 'medical', 'infrastructure', 'buildings'];
export const isSpecialty = k => SPECIALTY_KEYS.includes(k);
export const chosenSpecialties = t => SPECIALTY_KEYS.filter(k => (t.levels[k] || 0) > 0 || t.training.some(x => x.kind === k));
UPGRADES.digital = { name: '数字设施', price: 20, time: 60, max: 2, detail: '数据中心与数字基础设施' };
UPGRADES.industrial = { name: '工业能源', price: 20, time: 60, max: 2, detail: '电力、制造与设备密集工程' };
UPGRADES.medical = { name: '医疗设施', price: 20, time: 60, max: 2, detail: '医院与医疗设施' };
UPGRADES.infrastructure = { name: '公共基建', price: 20, time: 60, max: 2, detail: '给排水、交通、桥梁与联邦工程' };
UPGRADES.buildings = { name: '住宅商业', price: 20, time: 60, max: 2, detail: '住宅、仓储、学校与商业建筑' };
// Model 2 uses smaller increments; active older rooms retain their original scale.
export const ADVANCED_UPGRADES = {
    cost: { name: '成本控制', price: 8, time: 35, max: 6, detail: '每级降低基础成本3.5%，最高21%。' },
    speed: { name: '施工效率', price: 8, time: 35, max: 6, detail: '每级缩短基础工期5%，最高30%。' },
    crew: { name: '施工队伍', price: 18, time: 55, max: 4, detail: '每级增加1个施工位，同时增加持续管理成本；闲置队伍也收费。' },
    safety: { name: '安全管理', price: 7, time: 30, max: 6, detail: '安全检查费：Lv.0–1为2万，Lv.2–3为1.5万，Lv.4–5为1万，Lv.6自动办理。' },
    compliance: { name: '合同合规', price: 7, time: 30, max: 6, detail: '资料办理费：Lv.0–1为2万，Lv.2–3为1.5万，Lv.4–5为1万，Lv.6自动办理。' },
    insurance: { name: '保险保障', price: 8, time: 30, max: 6, detail: '每级减少模拟索赔10%，最高60%；不承担整改费用。' },
    coordination: { name: '组织协调', price: 7, time: 35, max: 6, detail: '每级降低持续管理成本4%，最高24%；支持复杂项目组织要求。' },
    talent: { name: '人才培养', price: 7, time: 35, max: 6, detail: '每级降低工作疲劳增长5%，最高30%；支持专业人才要求。' },
    procurement: { name: '供应链管理', price: 7, time: 35, max: 6, detail: '每级降低基础成本1%，最高6%；支持采购与设备交付要求。' },
    technology: { name: '数字协同', price: 7, time: 35, max: 6, detail: '每级缩短基础工期1%，最高6%；支持数字化交付要求。' },
    quality: { name: '质量管理', price: 7, time: 35, max: 6, detail: '每级降低最终材料冲击金额8%，最高48%；支持高质量项目准入。' },
    ...Object.fromEntries(SPECIALTY_KEYS.map(k => [k, { ...UPGRADES[k], price: 10, time: 40, max: 6 }]))
};
export const BALANCED_UPGRADES = Object.fromEntries(Object.entries(ADVANCED_UPGRADES).map(([k, u]) => [k, { ...u, price: k === 'crew' ? 12 : isSpecialty(k) ? 4 : Math.max(3, Math.round(u.price * .5)) }]));
export const CONTEXT_UPGRADES = { ...BALANCED_UPGRADES, safety: { ...BALANCED_UPGRADES.safety, detail: '25%与65%前安排安全流程；6级自动安排，但疲劳现场风险仍存在。' }, insurance: { ...BALANCED_UPGRADES.insurance, detail: '抽象风险保障能力；每级减少模拟自担索赔10%，不是保单赔付比例。' }, quality: { ...BALANCED_UPGRADES.quality, detail: '每级减少返工风险金额8%，最高48%；不降低材料市场价格。' }, procurement: { ...BALANCED_UPGRADES.procurement, detail: '每级降低基础成本1%及材料风险金额8%；订单锁价后不受后续成本新闻影响。' } };
/** @returns {Record<string, any>} */
export const getUpgrades = r => r?.contextVersion ? CONTEXT_UPGRADES : r?.modelVersion === 2 ? (r.balanceVersion ? BALANCED_UPGRADES : ADVANCED_UPGRADES) : UPGRADES;
export const ALL_UPGRADES = { ...UPGRADES, ...ADVANCED_UPGRADES };
