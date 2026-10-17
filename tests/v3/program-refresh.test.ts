import {test,expect} from 'vitest';
import {refreshProgram} from '../../packages/core/program-refresh';
import type {Program} from '../../packages/core/meeting';
const reading:Program['parts'][number]={id:'Reading',title:'Earlier reading',type:'BibleReading',section:'treasures',minutes:4,assistant:false};
const program=(parts:Program['parts']):Program=>({reading:'Reading',sourceMonth:'2026-10',reviewed:true,parts});
test('source refresh preserves saved assignment IDs and chosen meeting date/time',()=>{
 const old={...program([reading]),meetingDate:'2026-10-15',startTime:'18:30'};
 const source={...program([{...reading,id:'Part3',title:'Published reading'}]),sourceUrl:'https://wol.jw.org/en/wol/d/r1/lp-e/202026257'};
 const assignments={Reading:{personId:'reader'},ReadingAux:{personId:'other'},ReadingAuxAssistant:{personId:'assistant'}};
 const next=refreshProgram(old,source);
 expect(next.parts[0]).toEqual({...source.parts[0],id:'Reading'});
 expect(next.meetingDate).toBe(old.meetingDate);expect(next.startTime).toBe(old.startTime);
 expect(assignments[next.parts[0].id]).toEqual({personId:'reader'});
 expect(old.parts[0].title).toBe('Earlier reading');
});
test('repeated compatible slots retain their ordinal identities while new slots stay unassigned',()=>{
 const field={...reading,type:'Conversation' as const,section:'field' as const,assistant:true};
 const old=program([{...field,id:'First'},{...field,id:'Second'}]);
 const next=refreshProgram(old,program([{...field,id:'Part4',title:'New first'},{...field,id:'Part5',title:'New second'}]));
 expect(next.parts.map(p=>p.id)).toEqual(['First','Second']);
 const expanded=refreshProgram(old,program([1,2,3].map(n=>({...field,id:'Part'+n,title:'Changed '+n}))));
 expect(expanded.parts.map(p=>p.id)).toEqual(['Part1','Part2','Part3']);
});
test('changed part types cannot steal a saved slot or produce duplicate IDs',()=>{
 const old=program([{...reading,id:'Part1'}]);
 const next=refreshProgram(old,program([{...reading,id:'Part1',type:'TreasuresTalk'},{...reading,id:'Part3'}]));
 expect(next.parts[1].id).toBe('Part1');expect(next.parts[0].id).not.toBe('Part1');
 expect(new Set(next.parts.map(p=>p.id)).size).toBe(2);
});
