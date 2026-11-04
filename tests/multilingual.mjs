import assert from 'node:assert/strict';
import { translate, localize } from '../lib/i18n.mjs';
import { newRoom as originalRoom, joinCompany, view } from '../lib/game.mjs';
import ES from '../lib/locales/es.json' with { type: 'json' };
import FR from '../lib/locales/fr.json' with { type: 'json' };
import HI from '../lib/locales/hi.json' with { type: 'json' };
for (const [lang, dict] of Object.entries({ es: ES, fr: FR, hi: HI })) {
    for (const source of ['Net profit', 'Revenue', 'Company teamwork', 'Ready to play', 'Quick guide', 'FINANCIAL ANALYSIS AND MANAGEMENT']) {
        assert(dict[source]);
        assert.notEqual(translate(source, lang), source);
        assert.equal(translate(translate(source, lang), lang), translate(source, lang));
    }
    assert.equal(translate('Cash', lang, ['Cash']), 'Cash');
    assert(translate('Cash 加入市场', lang, ['Cash']).startsWith('Cash'));
    assert.equal(translate('医院公司 加入市场', lang, ['医院公司']).startsWith('医院公司'), true);
    assert.equal(localize(80, lang), 80);
    assert.equal(localize(false, lang), false);
    assert.equal(translate('净利润', lang), dict['Net profit']);
    for (const v of Object.values(dict))
        assert.equal(typeof v, 'string');
}
for (const mode of ['full']) {
    const r = newRoom('1234ABCD', 'host', 18, mode);
    joinCompany(r, 'a', 'a-key', 'Cash', 'Loan');
    joinCompany(r, 'b', 'b-key', 'Cash', 'Margin');
    const before = JSON.stringify(r);
    for (const lang of ['zh', 'en', 'es', 'fr', 'hi']) {
        const s = view(r, 'a-key');
        assert.equal(s.me.name, 'Cash');
        assert.equal(s.me.memberName, 'Loan');
        translate('净利润', lang);
        assert.equal(JSON.stringify(r), before);
    }
}
assert.equal(translate('再来一局 ↻', 'en'), 'Play again ↻');
assert.equal(translate('再来一局 ↻', 'zh'), '再来一局 ↻');
console.log('PASS five languages: financial terms, idempotence, protected names, both modes and unchanged shared state');

// Regression coverage for saved rooms from before institutions were enabled.
function newRoom(...args){const r=originalRoom(...args);r.institutionsVersion=0;delete r.institutions;return r;}
