import {test,expect} from 'vitest';
import {localCommand} from '../../packages/core/local-command';
const people=[{id:'a',name:'Maria Thomas'},{id:'b',name:'Maria George'}];
test('the requested example becomes a structured local preview, with the most recent September',()=>expect(localCommand('add a report for maria thomas, for the month of september hour 3, studies 2',people,new Date('2026-10-17T12:00:00Z'))).toEqual({kind:'report',people:[people[0]],period:'2026-09',hours:3,studies:2}));
test('generate all publisher reports explicitly previews S-21 exports',()=>expect(localCommand('generate all publisher reports',people)).toEqual({kind:'s21-all'}));
test('ambiguity is kept for selection and invalid or incomplete commands cannot write',()=>{expect(localCommand('add report for maria in september hours 3 studies 2',people).kind).toBe('report');for(const text of ['delete all reports','add report for maria in september hours -3 studies 2','add report for maria in september hours 3 studies 2.5','add report for maria hours 3 studies 2'])expect(()=>localCommand(text,people)).toThrow();});
test('accepts natural number order and number words without sending the command',()=>{const plan=localCommand('add a report for Maria Thomas, September, three hours, two studies',[{id:'m',name:'Maria Thomas'}],new Date('2026-10-17'));expect(plan).toMatchObject({kind:'report',hours:3,studies:2,period:'2026-09'});});
test('individual S-21 matches full names exactly and retains ambiguous first names',()=>{
 expect(localCommand('S-21 for Maria Thomas',people)).toEqual({kind:'s21-person',people:[people[0]]});
 expect(localCommand('download S21 for Maria',people)).toEqual({kind:'s21-person',people});
 expect(()=>localCommand('S-21 for nobody',people)).toThrow();
});
test('attendance is a bounded whole-count preview; date is resolved from authorized meeting context',()=>{
 expect(localCommand('record midweek attendance 85',people)).toEqual({kind:'attendance',count:85,meeting:'midweek'});
 expect(localCommand('add this weeks attendance 0',people)).toEqual({kind:'attendance',count:0,meeting:null});
 for(const input of ['record attendance -1','record attendance 1.5','record attendance 100000','record attendance 5; delete reports'])expect(()=>localCommand(input,people)).toThrow();
});
