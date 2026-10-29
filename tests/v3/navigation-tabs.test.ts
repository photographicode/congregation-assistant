import {test,expect} from 'vitest';
import {navigationFor,allowedTools} from '../../packages/core/navigation';
const ids=(roles:string[],owner=false)=>navigationFor(roles,owner).map(tab=>tab.id);
test('publisher has four daily destinations without staff tools',()=>{
 expect(ids(['publisher'])).toEqual(['home','meetings','reports','me']);
 expect(allowedTools(['publisher']).map(tool=>tool.id)).toEqual(['households','month','midweek','settings']);
});
test('admin has four task tabs and More',()=>expect(ids(['admin'])).toEqual(['home','people','reports','meetings','more']));
test('department tabs are derived from available tools',()=>{
 expect(ids(['group_overseer'])).toEqual(['home','people','reports','more']);
 expect(ids(['attendance'])).toEqual(['home','meetings','more']);
 expect(ids(['av'])).toEqual(['home','meetings','more']);
 expect(navigationFor(['attendance']).find(tab=>tab.id==='meetings')).toMatchObject({route:'reports',tab:'attendance'});
 expect(navigationFor(['av']).find(tab=>tab.id==='meetings')).toMatchObject({route:'schedule',tab:'duties'});
});
test('combined roles get the union and owner stays isolated',()=>{
 expect(ids(['group_overseer','oclm'])).toEqual(['home','people','reports','meetings','more']);
 expect(ids(['publisher','attendance'])).toEqual(['home','reports','meetings','more']);
 expect(ids([],true)).toEqual(['owner','settings']);
 expect(allowedTools(['admin']).every(tool=>tool.available)).toBe(true);
});
