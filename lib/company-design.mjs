import { getUpgrades } from './upgrades.mjs';
import { decisionEvent, sampleReview } from './debrief.mjs';
export const DESIGN_GROUPS = {
    structure: { name: ['公司架构', 'Organization'], options: {
            functional: { name: ['职能型', 'Functional'], detail: ['集中专业职能，侧重成本和标准化；跨部门协调需另行投入。', 'Centralized expertise emphasizes cost and standards; cross-functional coordination needs separate investment.'], bonus: { cost: 2, compliance: 1, quality: 1 } },
            divisional: { name: ['事业部型', 'Divisional'], detail: ['按市场或项目分工，强化责任与并行交付；更多队伍带来管理费用。', 'Market or project units strengthen accountability and parallel delivery; extra crews incur overhead.'], bonus: { coordination: 2, crew: 1, speed: 1 } },
            matrix: { name: ['矩阵型', 'Matrix'], detail: ['共享专业人才、横向协作；成本与流程能力需要补足。', 'Share specialists across teams; cost controls and formal processes require additional development.'], bonus: { coordination: 2, technology: 1, talent: 1 } }
        } },
    philosophy: { name: ['公司理念', 'Mission & values'], options: {
            lean: { name: ['精益与成本纪律', 'Lean & cost discipline'], detail: ['集中投入效率与采购，质量和员工能力需要另行配置。', 'Emphasize cost and procurement; quality and people capabilities need separate allocation.'], bonus: { cost: 2, procurement: 2 } },
            quality: { name: ['品质与客户信任', 'Quality & client trust'], detail: ['以质量、合同与风险保障形成差异。', 'Differentiate through quality, contracts and risk protection.'], bonus: { quality: 2, compliance: 1, insurance: 1 } },
            people: { name: ['以人为本与安全', 'People & safety'], detail: ['投资人才和安全，降低疲劳增长。', 'Invest in people and safety to reduce fatigue growth.'], bonus: { talent: 2, safety: 2 } },
            innovation: { name: ['创新与协同交付', 'Innovation & collaboration'], detail: ['优先数字工具、施工效率与质量。', 'Prioritize digital tools, delivery efficiency and quality.'], bonus: { technology: 2, quality: 1, speed: 1 } },
            stewardship: { name: ['社区责任与稳健交付', 'Community stewardship'], detail: ['兼顾安全、质量、供应链与数字协同。', 'Balance safety, quality, procurement and digital coordination.'], bonus: { quality: 1, procurement: 1, safety: 1, technology: 1 } }
        } },
    resources: { name: ['核心资源', 'Core resources'], options: {
            equipment: { name: ['自有施工团队', 'Self-performing crews'], detail: ['增加现场能力和容量，但持续管理成本更高。', 'Build field capacity, with higher recurring management costs.'], bonus: { crew: 1, speed: 2, safety: 1 } },
            partners: { name: ['供应商与分包网络', 'Supplier & subcontractor network'], detail: ['优先采购整合、协作和合同管理。', 'Prioritize procurement integration, coordination and contracts.'], bonus: { procurement: 2, coordination: 1, compliance: 1 } },
            specialists: { name: ['专业人才梯队', 'Specialist talent pipeline'], detail: ['侧重人员培养和质量控制。', 'Emphasize people development and quality controls.'], bonus: { talent: 2, quality: 2 } },
            systems: { name: ['数字系统与数据', 'Digital systems & data'], detail: ['侧重信息系统、成本和供应链。', 'Emphasize information systems, cost and supply-chain management.'], bonus: { technology: 2, cost: 1, procurement: 1 } }
        } },
    delivery: { name: ['管理与授权方式', 'Management & decision rights'], options: {
            controls: { name: ['流程与风险控制', 'Process & risk controls'], detail: ['明确合同、安全与保障，现场响应能力另行投入。', 'Emphasize contracts, safety and protection; invest separately in field responsiveness.'], bonus: { compliance: 2, insurance: 1, safety: 1 } },
            collaborative: { name: ['跨职能协作', 'Cross-functional collaboration'], detail: ['投入协调、信息共享与质量检查。', 'Invest in coordination, shared information and quality checks.'], bonus: { coordination: 2, technology: 1, quality: 1 } },
            delegated: { name: ['现场授权与响应', 'Field delegation'], detail: ['投入施工响应、人员和协调能力。', 'Invest in field responsiveness, people and coordination.'], bonus: { speed: 2, talent: 1, coordination: 1 } }
        } }
};
export function designBonus(design = {}) { const result = {}; for (const [group, key] of Object.entries(design)) {
    const option = DESIGN_GROUPS[group]?.options[key];
    if (option)
        for (const [k, n] of Object.entries(option.bonus))
            result[k] = (result[k] || 0) + n;
} return result; }
export const designComplete = t => Object.keys(DESIGN_GROUPS).every(k => !!DESIGN_GROUPS[k].options[t.companyDesign?.[k]]);
export function configureCompany(r, t, a, source = 'manual') {
    if (r.modelVersion !== 2 || r.phase !== 'setup' || !t || t.setupReady)
        throw Error('只能在未确认的初始配置阶段选择公司方案');
    const group = DESIGN_GROUPS[a.group];
    if (!group || !Object.hasOwn(group.options, a.choice))
        throw Error('无效公司方案');
    const design = { ...(t.companyDesign || {}), [a.group]: a.choice }, old = designBonus(t.companyDesign), next = designBonus(design), specs = getUpgrades(r), levels = { ...t.levels };
    for (const k of Object.keys(specs)) {
        levels[k] = (levels[k] || 0) - (old[k] || 0) + (next[k] || 0);
        if (levels[k] > specs[k].max)
            throw Error('该组合超过能力上限，请先撤回自由能力点');
    }
    t.companyDesign = design;
    t.levels = levels;
    decisionEvent(r, t, 'company_design', { group: a.group, choice: a.choice, design, levels: { ...levels } }, source);
    sampleReview(r, t, true);
}
