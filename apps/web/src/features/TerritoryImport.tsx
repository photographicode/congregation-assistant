// Import territories and their history from a CSV: read the file, show what will change, then save row by row.
import React from 'react';
import {Upload} from 'lucide-react';
import {Button} from '../../../../packages/ui/components';
import {Dialog} from '../../../../packages/ui/Dialog';
import * as api from './territory-api';
import {planImport,type ImportPlan} from './territory-csv';
import type {WorkspaceData} from './territory-model';

const MAX_SKIPPED_SHOWN=5;
type Result={done:number;failed:string[]};

async function runImport(ws:string,plan:ImportPlan,d:WorkspaceData,onProgress:(n:number)=>void):Promise<Result>{
 const ids=new Map(d.territories.map(t=>[t.number,t.id])),failed:string[]=[];let done=0;
 for(const t of plan.territories){
  try{ids.set(t.number,await api.saveTerritory(ws,{number:t.number,name:t.name,notes:t.notes,mapUrl:t.mapUrl}));}
  catch(e){failed.push(`Territory ${t.number}: ${(e as Error).message}`);}
  onProgress(++done);
 }
 for(const r of plan.records){
  const territory=ids.get(r.number);
  try{if(!territory)throw Error('territory was not created');await api.saveAssignment(territory,{publisher:r.publisher,taken:r.taken,due:r.due,returned:r.returned});}
  catch(e){failed.push(`Territory ${r.number}, ${r.publisher} (${r.taken}): ${(e as Error).message}`);}
  onProgress(++done);
 }
 return {done:done-failed.length,failed};
}

export function ImportCsv({d,ws,refresh,notify}:{d:WorkspaceData;ws:string;refresh:()=>Promise<void>;notify:(m:string)=>void}){
 const input=React.useRef<HTMLInputElement>(null);
 const [plan,setPlan]=React.useState<ImportPlan|null>(null),[error,setError]=React.useState(''),[progress,setProgress]=React.useState(-1),[result,setResult]=React.useState<Result|null>(null);
 const close=()=>{setPlan(null);setError('');setResult(null);setProgress(-1);};
 const read=async(file?:File)=>{
  if(!file)return;
  try{setPlan(planImport(await file.text(),d.territories,d.assignments));setError('');}
  catch(e){setPlan({territories:[],records:[],skipped:[]});setError((e as Error).message);}
  if(input.current)input.current.value='';
 };
 const start=async()=>{if(!plan)return;setProgress(0);const r=await runImport(ws,plan,d,setProgress);await refresh();setResult(r);setProgress(-1);notify(`Imported ${r.done} items.`);};
 const total=plan?plan.territories.length+plan.records.length:0;
 return <>
  <Button onClick={()=>input.current?.click()}><Upload/>{'Import CSV'}</Button>
  <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={e=>void read(e.target.files?.[0])}/>
  {plan&&<Dialog open onClose={close} title={'Import CSV'}><div className="tm-dialog stack">
   {error&&<p role="alert" className="error">{error}</p>}
   {!error&&!result&&<>
    <p>{`${plan.territories.length} new territories and ${plan.records.length} history records will be added. Territories that already exist keep their details.`}</p>
    {plan.skipped.length>0&&<div className="tm-inset-box stack"><strong>{`${plan.skipped.length} rows skipped`}</strong>{plan.skipped.slice(0,MAX_SKIPPED_SHOWN).map(s=><small key={s}>{s}</small>)}</div>}
    <p className="muted">{'Columns: Number (required), Name, Notes, Map link, Publisher, Taken, Due, Returned. Dates as 2026-11-12 or 12/11/2026. The CSV export uses the same columns.'}</p>
    <Button className="primary" busy={progress>=0} disabled={!total} onClick={()=>void start()}>{progress>=0?`Importing ${progress} of ${total}…`:'Import'}</Button>
   </>}
   {result&&<div role="status" className="stack"><p>{`${result.done} items imported.`}</p>{result.failed.length>0&&<div className="tm-inset-box stack"><strong>{`${result.failed.length} could not be saved`}</strong>{result.failed.map(f=><small key={f}>{f}</small>)}</div>}<Button onClick={close}>{'Done'}</Button></div>}
  </div></Dialog>}
 </>;
}
