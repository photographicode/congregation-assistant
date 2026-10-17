import {test,expect} from 'vitest';
import {localCommand} from '../../packages/core/local-command';
const people=[{id:'a',name:'Maria Thomas'},{id:'b',name:'Maria George'}];
test('the requested example becomes a structured local preview, with the most recent September',()=>expect(localCommand('add a report for maria thomas, for the month of september hour 3, studies 2',people,new Date('2026-10-17T12:00:00Z'))).toEqual({kind:'report',people:[people[0]],period:'2026-09',hours:3,studies:2}));
test('generate all publisher reports explicitly previews S-21 exports',()=>expect(localCommand('generate all publisher reports',people)).toEqual({kind:'s21-all'}));
test('ambiguity is kept for selection and invalid or incomplete commands cannot write',()=>{expect(localCommand('add report for maria in september hours 3 studies 2',people).kind).toBe('report');for(const text of ['delete all reports','add report for maria in september hours -3 studies 2','add report for maria in september hours 3 studies 2.5','add report for maria hours 3 studies 2'])expect(()=>localCommand(text,people)).toThrow();});
