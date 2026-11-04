'use client';
import { localize } from '../lib/i18n.mjs';
import { useEffect, useState } from 'react';
import { THEMES, THEME_KEYS, findTheme } from '../lib/themes.mjs';
export default function ThemePicker({ language }: any) {
    const [chosen, setChosen] = useState<string | null>(null);
    useEffect(() => { let id = 'forest'; try {
        id = findTheme(localStorage.getItem('fmg-theme')).id;
    }
    catch { } setChosen(id); }, []);
    useEffect(() => { if (!chosen)
        return; const theme = findTheme(chosen); THEME_KEYS.forEach((key: string, i: number) => document.documentElement.style.setProperty('--' + key, theme.colors[i])); document.documentElement.dataset.theme = theme.id; document.documentElement.style.colorScheme = theme.scheme; try {
        localStorage.setItem('fmg-theme', theme.id);
    }
    catch { } }, [chosen]);
    return <label className="theme-picker">{localize(language !== 'zh' ? 'Theme' : '界面配色', language)}<select aria-label={localize(language !== 'zh' ? 'Interface theme' : '界面配色', language)} value={chosen || 'forest'} onChange={e => setChosen(e.target.value)}>{THEMES.map(t => <option key={t.id} value={t.id}>{localize(t.name[language !== 'zh' ? 1 : 0], language)}</option>)}</select></label>;
}
