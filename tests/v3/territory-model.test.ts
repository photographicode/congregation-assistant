import {describe,expect,it} from 'vitest';
import {canonicalName,csvCell,publisherNames,serviceYearLabel,serviceYearOf,serviceYears,summarize,territoryCsv,type Assignment,type Territory} from '../../apps/web/src/features/territory-model';
import {s13Rows} from '../../apps/web/src/features/territory-s13';
import {parseCsv,planImport,readDate} from '../../apps/web/src/features/territory-csv';

const on='2026-11-11';
const a=(id:string,territory:string,taken:string,returned:string|null,due='2027-03-11'):Assignment=>({id,territory_id:territory,publisher:'P '+id,taken_on:taken,due_on:due,returned_on:returned});
const t=(id:string,number:string):Territory=>({id,number,name:'T'+number,notes:'',thumb:null,has_image:false,map_url:null,share_token:'x',updated_at:on});

describe('territory status',()=>{
 it('is never used without history',()=>expect(summarize('t1',[],90,on).status).toBe('never'));
 it('is in use while an assignment is open, and overdue after its due date',()=>{
  const s=summarize('t1',[a('1','t1','2026-01-01',null,'2026-05-01')],90,on);
  expect(s.status).toBe('in_use');expect(s.overdue).toBe(true);
 });
 it('is recently used within the window, then available',()=>{
  expect(summarize('t1',[a('1','t1','2026-08-01','2026-10-01')],90,on).status).toBe('recent');
  expect(summarize('t1',[a('1','t1','2025-01-01','2025-03-01')],90,on).status).toBe('available');
 });
});

describe('exports',()=>{
 it('neutralises spreadsheet formulas and quotes',()=>{
  expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');
  expect(csvCell('say "hi"')).toBe('"say ""hi"""');
 });
 it('writes one CSV row per assignment and one for unused territories',()=>{
  const csv=territoryCsv([t('t1','1'),t('t2','2')],[a('1','t1','2026-01-01','2026-02-01'),a('2','t1','2026-03-01',null)],90,on);
  expect(csv.trim().split('\r\n')).toHaveLength(4);
 });
 it('uses September–August service years, written 2026-2027',()=>{
  expect(serviceYearOf('2026-08-31')).toBe(2026);
  expect(serviceYearOf('2026-09-01')).toBe(2027);
  expect(serviceYearLabel(2027)).toBe('2026-2027');
  expect(serviceYears([a('1','t1','2024-10-01',null)],on)).toEqual([2027,2026,2025]);
 });
 it('suggests saved names and keeps one spelling',()=>{
  const list=[{...a('1','t1','2026-01-01',null),publisher:'Anna Joseph'},{...a('2','t2','2026-02-01',null),publisher:'anna joseph'},{...a('3','t3','2026-03-01',null),publisher:'Daniel'}];
  expect(publisherNames(list)).toEqual(['Anna Joseph','Daniel']);
  expect(canonicalName('  ANNA   joseph ',publisherNames(list))).toBe('Anna Joseph');
  expect(canonicalName('New Name',publisherNames(list))).toBe('New Name');
 });
 it('fills S-13 rows with four slots and the last completion before the year',()=>{
  const list=[a('0','t1','2025-03-01','2025-04-01'),...['2025-09-05','2025-10-05','2025-11-05','2025-12-05','2026-01-05'].map((d,i)=>a(String(i+1),'t1',d,null))];
  const rows=s13Rows([t('t1','1'),t('t2','2')],list,2026);
  expect(rows).toHaveLength(3);
  expect(rows[0].last).toBe('2025-04-01');
  expect(rows[0].slots).toHaveLength(4);
  expect(rows[1].slots).toHaveLength(1);
  expect(rows[2]).toEqual({number:'2',last:'',slots:[]});
 });
});

describe('CSV import',()=>{
 it('reads quoted fields, doubled quotes and line breaks',()=>{
  expect(parseCsv('a,"b ""x""",c\r\n1,"two\nlines",3\n')).toEqual([['a','b "x"','c'],['1','two\nlines','3']]);
 });
 it('reads common date styles',()=>{
  expect(readDate('2026-11-12')).toBe('2026-11-12');
  expect(readDate('12/11/2026')).toBe('2026-11-12');
  expect(readDate('1-2-26')).toBe('2026-02-01');
  expect(readDate('soon')).toBe('');
 });
 it('round-trips the export and skips history already saved',()=>{
  const ts=[t('t1','1')],list=[a('1','t1','2026-01-01','2026-02-01')];
  const csv=territoryCsv(ts,list,90,on)+'"2","Hill","","Anna","12/03/2026","","","https://maps.app.goo.gl/x",""\r\n';
  const plan=planImport(csv,ts,list);
  expect(plan.territories).toEqual([{number:'2',name:'Hill',notes:'',mapUrl:'https://maps.app.goo.gl/x',existingId:undefined}]);
  expect(plan.records).toEqual([{number:'2',publisher:'Anna',taken:'2026-03-12',due:'',returned:''}]);
 });
 it('needs a Number column',()=>expect(()=>planImport('Name\nX\n',[],[])).toThrow(/Number/));
});
