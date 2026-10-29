import {describe,it,expect} from 'vitest';
import {needsAttention,reportPeriod,roleCards} from '../../apps/web/src/features/today/model';
describe('Today priorities',()=>{
 it('orders setup and urgent work before informational updates and limits the preview',()=>{
  const rows=needsAttention({setupStep:3,requests:2,missing:3,unassigned:2,attendance:true,updates:1});
  expect(rows.map(row=>row.id)).toEqual(['setup','requests','missing','unassigned','attendance','updates']);
  expect(rows.slice(0,5)).toHaveLength(5);
 });
 it('omits completed and absent work',()=>expect(needsAttention({setupStep:10,requests:0,missing:0,unassigned:0,attendance:false,updates:0})).toEqual([]));
 it('routes a publisher report to its service-year calendar month',()=>{
  expect(reportPeriod({month:8,serviceYear:2027},'2026-10')).toBe('2026-09');
  expect(reportPeriod({month:0,serviceYear:2027},'2026-10')).toBe('2027-01');
  expect(reportPeriod({},'2026-09')).toBe('2026-09');
 });
 it('gives each department a real role card before publisher blocks without treating it as admin',()=>{
  expect(roleCards(['publisher','av','attendance','group_overseer','oclm','weekend','field_service','cleaning','attendant'])).toEqual(['attendance','oclm','weekend','group_overseer','field_service','av','cleaning','attendant']);
  expect(roleCards(['publisher'])).toEqual([]);
 });
});
