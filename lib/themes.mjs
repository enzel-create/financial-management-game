export const THEMES = [
    { id: 'forest', name: ['森林绿', 'Forest'], scheme: 'dark', colors: ['#101a18', '#1a2924', '#35483c', '#f1f2e7', '#a7b7ad', '#d9f880', '#ee9d80', '#152214'] },
    { id: 'ocean', name: ['深海蓝', 'Ocean'], scheme: 'dark', colors: ['#0d1727', '#18283e', '#354d6b', '#eef5ff', '#aabbd2', '#8cd6ff', '#ffae9c', '#102033'] },
    { id: 'violet', name: ['星云紫', 'Violet'], scheme: 'dark', colors: ['#191426', '#292038', '#514264', '#f5efff', '#bfb0d3', '#d7b1ff', '#ffb2a0', '#261335'] },
    { id: 'graphite', name: ['石墨金', 'Graphite gold'], scheme: 'dark', colors: ['#191918', '#292925', '#48483f', '#f7f5e9', '#bab9ab', '#f3d481', '#ffac99', '#29200c'] },
    { id: 'midnight', name: ['午夜青', 'Midnight teal'], scheme: 'dark', colors: ['#0c1d22', '#173039', '#355660', '#e9f8fb', '#a5c3ca', '#79e5dc', '#ffb19a', '#092924'] },
    { id: 'burgundy', name: ['酒红玫瑰', 'Burgundy'], scheme: 'dark', colors: ['#26151b', '#3a242d', '#64414c', '#fff0f4', '#d2b1bc', '#ffb4ce', '#ffbf91', '#381521'] },
    { id: 'ivory', name: ['暖白琥珀', 'Ivory amber'], scheme: 'light', colors: ['#faf6ed', '#fffdf7', '#cfc4ac', '#30291d', '#6d604b', '#815300', '#a23b22', '#ffffff'] },
    { id: 'cloud', name: ['云雾蓝', 'Cloud blue'], scheme: 'light', colors: ['#f0f5fb', '#ffffff', '#bdcede', '#192e46', '#526780', '#175b99', '#ac392d', '#ffffff'] },
    { id: 'mint', name: ['薄荷白', 'Mint'], scheme: 'light', colors: ['#eff8f3', '#ffffff', '#bad5c7', '#19382b', '#4d6d5c', '#176847', '#a43b2a', '#ffffff'] },
    { id: 'sakura', name: ['樱花粉', 'Sakura'], scheme: 'light', colors: ['#fcf2f5', '#fffafb', '#ddc0cb', '#442334', '#7e5367', '#933758', '#a23b22', '#ffffff'] }
];
export const THEME_KEYS = ['bg', 'panel', 'line', 'ink', 'muted', 'accent', 'rust', 'on-accent'];
export function findTheme(id) { return THEMES.find(t => t.id === id) || THEMES[0]; }
