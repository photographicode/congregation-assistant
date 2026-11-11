// Reads a territory CSV (the app's own export, or a spreadsheet with the same headings) into an import plan.
// Columns are found by heading, in any order: Number (required), Name, Notes, Map link, Publisher, Taken, Due, Returned.
import {byNumber,canonicalName,publisherNames,type Assignment,type Territory} from './territory-model';

const QUOTE='"',YEAR_2DIGIT_BASE=2000,SHORT_YEAR=2;
/** RFC 4180 fields: quotes, doubled quotes and line breaks inside quotes. */
export function parseCsv(text:string):string[][]{
 const src=text.replace(/^\ufeff/,'').replace(/\r\n?/g,'\n'),rows:string[][]=[];
 let row:string[]=[],field='',quoted=false;
 const endField=()=>{row.push(field);field='';};
 for(let i=0;i<src.length;i++){
  const ch=src[i];
  if(quoted){
   const doubled=ch===QUOTE&&src[i+1]===QUOTE;
   if(doubled)i++;
   if(ch===QUOTE&&!doubled)quoted=false;else field+=ch;
   continue;
  }
  if(ch===QUOTE)quoted=true;
  else if(ch===',')endField();
  else if(ch==='\n'){endField();rows.push(row);row=[];}
  else field+=ch;
 }
 if(field||row.length){endField();rows.push(row);}
 return rows.filter(r=>r.some(c=>c.trim()));
}
/** The export guards formulas with a leading apostrophe; take it off again. */
const clean=(value:string|undefined)=>(value??'').trim().replace(/^'(?=[=+\-@])/,'');
/** yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy or dd/mm/yy. Returns '' when the cell is empty or unreadable. */
export function readDate(value:string){
 const v=clean(value);
 if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
 const m=/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(v);
 if(!m)return '';
 const [,day='',month='',y='']=m;
 const year=y.length===SHORT_YEAR?YEAR_2DIGIT_BASE+Number(y):Number(y);
 const iso=`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
 return Number.isNaN(Date.parse(iso+'T00:00:00Z'))?'':iso;
}

type ImportTerritory={number:string;name:string;notes:string;mapUrl:string;existingId?:string};
type ImportRecord={number:string;publisher:string;taken:string;due:string;returned:string};
export type ImportPlan={territories:ImportTerritory[];records:ImportRecord[];skipped:string[]};
const HEADINGS={number:['number','territory number','terr. no.','no'],name:['name','territory','locality'],notes:['notes','note'],mapUrl:['map link','map','map url'],publisher:['publisher','assigned to','name of publisher'],taken:['taken','date assigned','assigned'],due:['due','due date'],returned:['returned','date completed','completed']};
type Key=keyof typeof HEADINGS;

/** New territories are created; existing ones keep their details. History rows already saved are not added twice. */
export function planImport(text:string,territories:Territory[],assignments:Assignment[]):ImportPlan{
 const [head,...body]=parseCsv(text);
 if(!head)throw Error('The file is empty.');
 const lower=head.map(h=>clean(h).toLowerCase());
 const col=Object.fromEntries((Object.keys(HEADINGS) as Key[]).map(k=>[k,lower.findIndex(h=>HEADINGS[k].includes(h))])) as Record<Key,number>;
 if(col.number<0)throw Error('Add a "Number" column with the territory numbers.');
 const cell=(row:string[],k:Key)=>col[k]<0?'':clean(row[col[k]]);
 const names=publisherNames(assignments),byNum=new Map(territories.map(t=>[t.number,t]));
 const seen=new Set(assignments.map(a=>{const t=territories.find(x=>x.id===a.territory_id);return `${t?.number}|${a.publisher.toLowerCase()}|${a.taken_on}`;}));
 const plan:ImportPlan={territories:[],records:[],skipped:[]},added=new Map<string,ImportTerritory>();
 body.forEach((row,i)=>{
  const number=cell(row,'number');
  if(!number){plan.skipped.push(`Row ${i+2}: no territory number`);return;}
  if(!added.has(number)){
   const existing=byNum.get(number);
   const entry={number,name:cell(row,'name')||existing?.name||`Territory ${number}`,notes:cell(row,'notes'),mapUrl:cell(row,'mapUrl'),existingId:existing?.id};
   added.set(number,entry);
   if(!existing)plan.territories.push(entry);
  }
  const publisher=cell(row,'publisher');
  if(!publisher)return;
  const taken=readDate(cell(row,'taken'));
  if(!taken){plan.skipped.push(`Row ${i+2}: no readable "Taken" date for ${publisher}`);return;}
  const record={number,publisher:canonicalName(publisher,names),taken,due:readDate(cell(row,'due')),returned:readDate(cell(row,'returned'))};
  const key=`${number}|${record.publisher.toLowerCase()}|${taken}`;
  if(seen.has(key))return;
  seen.add(key);plan.records.push(record);
 });
 plan.territories.sort(byNumber);
 // Older records first, so a territory's current holder is the last one added.
 plan.records.sort((a,b)=>a.taken.localeCompare(b.taken));
 return plan;
}
