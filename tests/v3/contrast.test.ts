import {test,expect} from 'vitest';import {ratio,themeIds} from '../../scripts/contrast-check.mjs';
test('contrast checker does not accept equal foreground/background or round a failing ratio up',()=>{expect(ratio([0,0,0],[255,255,255])).toBe(21);expect(ratio([70,70,70],[70,70,70])).toBe(1);expect(ratio([119,119,119],[255,255,255])).toBeLessThan(4.5);});
test('theme inventory deduplicates repeated component selectors',()=>expect(themeIds('[data-theme="one"]{} [data-theme="two"]{} [data-theme="one"] button{}')).toEqual(['one','two']));
