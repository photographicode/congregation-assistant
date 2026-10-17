export const themeIds=['mono-light','mono-dark','paper','lagoon-glass','neon-night','sunset-pop','neo-brutal','forest','aurora'] as const;
export type ThemeId=typeof themeIds[number];
const aliases:Record<string,ThemeId>={daylight:'mono-light',lagoon:'lagoon-glass',slate:'forest',midnight:'mono-dark',dusk:'aurora','glass-lagoon':'lagoon-glass','glass-arctic':'mono-light','glass-aurora':'aurora','glass-lagoon-dark':'lagoon-glass','glass-sunset':'sunset-pop','glass-mint-air':'forest','glass-ocean-night':'forest','glass-graphite':'mono-dark'};
export function normalizeTheme(value:string):ThemeId|'auto'{return value==='auto'?'auto':themeIds.includes(value as ThemeId)?value as ThemeId:aliases[value]||'paper';}
export function resolvedTheme(value:string,dark:boolean):ThemeId{const name=normalizeTheme(value);return name==='auto'?(dark?'forest':'paper'):name;}
