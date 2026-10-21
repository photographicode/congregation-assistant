import {test,expect} from 'vitest';
import {publisherCommand} from '../../packages/core/publisher-command';
import {normalizeTheme,themeIds} from '../../packages/core/themes';
const people=[{id:'maria',name:'Maria Thomas'},{id:'daniel',name:'Daniel Thomas'}];
for(const [phrase,field,value]of [
 ["set Maria Thomas date of birth to 1990-05-04","dob","1990-05-04"],
 ["set Daniel's baptism to 4 May 2019","baptized","2019-05-04"],
 ['update Maria Thomas phone number to +919876543210','phone','+919876543210'],
 ['change Maria Thomas gender to sister','gender','Female'],
 ['set Daniel Thomas regular pioneer to yes','is_rp',true],
 ['set Maria Thomas group to South','service_group','South'],
] as const)test(phrase,()=>expect(publisherCommand(phrase,people)).toMatchObject({field,value}));
test('ambiguous person requires selection',()=>expect(publisherCommand('set Maria baptism to 4 May 2019',[...people,{id:'other',name:'Maria George'}])?.people).toHaveLength(2));
test('invalid calendar date is rejected',()=>expect(()=>publisherCommand('set Maria Thomas date of birth to 2020-02-31',people)).toThrow());
test('unknown publisher is rejected',()=>expect(()=>publisherCommand('set Unknown gender to male',people)).toThrow());
test('saved Noir preference migrates to Eclipse',()=>{expect(normalizeTheme('noir-pop')).toBe('eclipse');expect(themeIds).not.toContain('noir-pop');expect(themeIds).toHaveLength(11);});
