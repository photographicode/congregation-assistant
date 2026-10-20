import {test,expect} from 'vitest';
import {localCommand} from '../../packages/core/local-command.ts';
const people=[{id:'1',name:' María\u200B Thomas '},{id:'2',name:'മരിയ തോമസ്'},{id:'3',name:'مريم توماس'}];
test('assistant rejects malformed numeric and injection-shaped writes',()=>{for(const input of ['record attendance -1','record attendance 1,5','record attendance 1.5 h','record attendance 999999','record attendance <img src=x onerror=alert(1)>','record attendance =CMD()'])expect(()=>localCommand(input,people)).toThrow();});
test('long, Indic, RTL and zero-width publisher data cannot turn into an unintended write',()=>{for(const name of ['A'.repeat(200),'മരിയ തോമസ്','مريم توماس','María\u200B Thomas'])expect(()=>localCommand(`add report for ${name} in september hours -1 studies 0`,people,new Date('2026-10-20'))).toThrow();});
