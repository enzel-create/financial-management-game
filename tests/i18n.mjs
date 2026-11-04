const newRoom = (...args) => { const r = makeRoom(...args); return { ...r, institutionsVersion:0,contextVersion:0,balanceVersion: 0, modelVersion: 1, interestVersion: 0, onboardingVersion: 0, catalogVersion: 2, pool: r.pool.filter(i => i < 50), preparationVersion: 1 }; };
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { translate } from '../lib/i18n.mjs';
import { MARKET } from '../lib/market.mjs';
import { UPGRADES } from '../lib/upgrades.mjs';
import { newRoom as makeRoom, addTeam, action, view, tick } from '../lib/game.mjs';
const chinese = /[\u4e00-\u9fff]/;
const missing = new Set();
for (const path of ['app/page.tsx', 'lib/game.mjs', 'app/api/game/route.ts', 'lib/market.mjs', 'lib/upgrades.mjs']) {
    const source = fs.readFileSync(path, 'utf8'), root = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function check(node) {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
            const s = node.text;
            if (ts.isConditionalExpression(node.parent))
                return;
            if (ts.isCallExpression(node.parent) && node.parent.expression.getText(root) === 'c')
                return;
            if (chinese.test(s) && !['财务经营游戏', 'Language / 语言', '新手指引'].includes(s) && chinese.test(translate(s, 'en')))
                missing.add(s + ' => ' + translate(s, 'en'));
        }
        ts.forEachChild(node, check);
    }
    check(root);
}
assert.deepEqual([...missing], [], 'Untranslated app text');
for (const sector of MARKET) {
    assert(!chinese.test(translate(sector.sector, 'en')));
    for (const name of sector.names)
        assert(!chinese.test(translate(name, 'en')));
}
assert.equal(MARKET.reduce((n, s) => n + s.count, 0), 50);
for (const upgrade of Object.values(UPGRADES))
    for (const s of [upgrade.name, upgrade.detail])
        assert(!chinese.test(translate(s, 'en')));
const r = newRoom('TEST', 'host');
addTeam(r, 'a', 'ka', '医院公司');
addTeam(r, 'b', 'kb', 'English Co');
action(r, 'host', { type: 'start' }, -120000);
tick(r, 0);
const before = JSON.stringify(r), a = view(r, 'ka'), b = view(r, 'kb');
assert.equal(a.projects[0].id, b.projects[0].id);
assert.equal(translate(a.projects[0].name, 'zh'), a.projects[0].name);
assert(!chinese.test(translate(b.projects[0].name, 'en')));
assert.equal(translate('医院公司 加入市场', 'en', ['医院公司']), '医院公司 joined the market');
assert.equal(translate('医院公司 借款 40，支付融资费 4', 'en', ['医院公司']), '医院公司 borrowed 40 and paid a financing fee of 4');
assert.equal(translate('100–500 万', 'en'), '$1–5 million');
assert.equal(translate('再来一局 ↻', 'zh'), '再来一局 ↻');
assert.equal(translate('再来一局 ↻', 'en'), 'Play again ↻');
assert.equal(JSON.stringify(r), before, 'Localization must not mutate shared game state');
console.log('PASS: UI/API text coverage, 50 project names, units, protected company names, and independent display of shared game state.');
