import ES from './locales/es.json' with { type: 'json' };
import FR from './locales/fr.json' with { type: 'json' };
import HI from './locales/hi.json' with { type: 'json' };
import { EN as BASE_EN } from './translations.mjs';
import EXTRA_EN from './locales/en-extra.json' with { type: 'json' };
const EN = { ...BASE_EN, ...EXTRA_EN };
const entries = Object.entries(EN).sort((a, b) => b[0].length - a[0].length);
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(entries.map(([key]) => escape(key)).join('|'), 'g');
function toEnglish(text, language = 'zh', protectedNames = []) {
    if (typeof text !== 'string')
        return text;
    if (language !== 'en')
        return text.replaceAll('市场指标', '本局经营供给权重');
    if (Object.hasOwn(EN, text))
        return EN[text].replaceAll('bankruptcy', 'game exit').replaceAll('Bankruptcy', 'Game exit').replaceAll('bankrupt', 'eliminated').replaceAll('Bankrupt', 'Eliminated');
    const names = [...new Set(protectedNames.filter(Boolean))].sort((a, b) => b.length - a.length);
    // Protect player-entered company names in server-generated activity messages.
    if (names.length) {
        const re = new RegExp(names.map(escape).join('|'), 'g');
        let out = '', last = 0;
        for (const match of text.matchAll(re)) {
            out += text.slice(last, match.index).replace(pattern, key => EN[key]) + match[0];
            last = match.index + match[0].length;
        }
        return out + text.slice(last).replace(pattern, key => EN[key]);
    }
    return text.replace(pattern, key => EN[key]);
}
const dictionaries = { es: ES, fr: FR, hi: HI };
const caches = { es: new Map(), fr: new Map(), hi: new Map() };
const translatedValues = Object.fromEntries(Object.entries(dictionaries).map(([lang, d]) => [lang, new Set(Object.values(d))]));
const localePatterns = Object.fromEntries(Object.entries(dictionaries).map(([lang, d]) => [lang, new RegExp('(?<![\\p{L}\\p{N}])(?:' + Object.keys(d).filter(k => k.trim().length >= 3).sort((a, b) => b.length - a.length).map(escape).join('|') + ')(?![\\p{L}\\p{N}])', 'gu')]));
function translatedPart(text, language) {
    if (language === 'zh')
        return toEnglish(text, 'zh');
    const english = toEnglish(text, 'en');
    if (language === 'en')
        return english;
    const dict = dictionaries[language];
    if (!dict)
        return english;
    const cache = caches[language];
    if (cache.has(text))
        return cache.get(text);
    let result;
    if (translatedValues[language].has(text))
        result = text;
    else if (Object.hasOwn(dict, english))
        result = dict[english];
    else if (Object.hasOwn(dict, english.trim()))
        result = english.replace(english.trim(), dict[english.trim()]);
    else
        result = english.replace(localePatterns[language], key => dict[key]);
    if (cache.size > 20000)
        cache.clear();
    cache.set(text, result);
    return result;
}
export function translate(text, language = 'zh', protectedNames = []) {
    if (typeof text !== 'string')
        return text;
    const names = [...new Set(protectedNames.filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!names.length)
        return translatedPart(text, language);
    const re = new RegExp(names.map(escape).join('|'), 'g');
    let out = '', last = 0;
    for (const match of text.matchAll(re)) {
        out += translatedPart(text.slice(last, match.index), language) + match[0];
        last = match.index + match[0].length;
    }
    return out + translatedPart(text.slice(last), language);
}
export const localize = translate;
