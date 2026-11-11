// Territory manager rules shared by the screens, the exports and the tests. Dates are yyyy-mm-dd strings.
import {z} from 'zod';

const territorySchema=z.object({id:z.string(),number:z.string(),name:z.string(),notes:z.string(),thumb:z.string().nullable(),has_image:z.boolean(),map_url:z.string().nullable().default(null),share_token:z.string(),updated_at:z.string()});
const assignmentSchema=z.object({id:z.string(),territory_id:z.string(),publisher:z.string(),taken_on:z.string(),due_on:z.string(),returned_on:z.string().nullable()});
const issueSchema=z.object({id:z.string(),territory_id:z.string(),household:z.string(),details:z.string(),reporter:z.string(),lat:z.number().nullable(),lng:z.number().nullable(),accuracy:z.number().nullable(),created_at:z.string(),resolved_at:z.string().nullable()});
export const workspaceDataSchema=z.object({
 workspace:z.object({id:z.string(),name:z.string(),due_days:z.number(),recent_days:z.number(),report_token:z.string()}),
 role:z.enum(['admin','manager']),
 members:z.array(z.object({email:z.string(),role:z.enum(['admin','manager'])})),
 territories:z.array(territorySchema),
 assignments:z.array(assignmentSchema),
 reports:z.array(issueSchema),
});
export type Territory=z.infer<typeof territorySchema>;
export type Assignment=z.infer<typeof assignmentSchema>;
export type Issue=z.infer<typeof issueSchema>;
export type WorkspaceData=z.infer<typeof workspaceDataSchema>;

export type Status='in_use'|'available'|'never'|'recent';
export const STATUS_LABEL:Record<Status,string>={in_use:'In use',available:'Available',never:'Never used',recent:'Recently used'};
export const STATUS_TONE:Record<Status,'default'|'ok'|'warn'|'danger'>={in_use:'warn',available:'ok',never:'default',recent:'default'};

const DAY=86_400_000,ISO_DATE=10,COORD_DIGITS=6,YEAR_END=4,MONTH_START=5,MONTH_END=7,SEPTEMBER=9;
/** Service year 2026 runs from 1 September 2025 to 31 August 2026. */
export const serviceYearOf=(iso:string)=>+iso.slice(0,YEAR_END)+(+iso.slice(MONTH_START,MONTH_END)>=SEPTEMBER?1:0);
/** Service year 2027 is written 2026-2027 everywhere. */
export const serviceYearLabel=(year:number)=>`${year-1}-${year}`;
/** Service years from the oldest record to the current one, newest first. */
export function serviceYears(assignments:Assignment[],on=today()){
 const last=serviceYearOf(on),first=Math.min(last,...assignments.map(a=>serviceYearOf(a.taken_on)));
 return Array.from({length:last-first+1},(_,i)=>last-i);
}
export type Filter=Status|'all'|'overdue';
export const FILTERS:{value:Filter;label:string}[]=[{value:'all',label:'All'},{value:'in_use',label:'In use'},{value:'overdue',label:'Overdue'},{value:'available',label:'Available'},{value:'recent',label:'Recently used'},{value:'never',label:'Never used'}];
export const fmt=(iso:string|null|undefined)=>iso?new Date(isDateOnly(iso)?iso+'T00:00:00':iso).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'';
export const isDateOnly=(iso:string)=>/^\d{4}-\d{2}-\d{2}$/.test(iso);
export const today=()=>new Date().toISOString().slice(0,ISO_DATE);
export const addDays=(iso:string,days:number)=>new Date(Date.parse(iso+'T00:00:00Z')+days*DAY).toISOString().slice(0,ISO_DATE);
export const daysBetween=(from:string,to:string)=>Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/DAY);
export const byNumber=(a:{number:string},b:{number:string})=>a.number.localeCompare(b.number,undefined,{numeric:true});

export type Summary={status:Status;open?:Assignment;lastReturned?:string;overdue:boolean;history:Assignment[]};
/** In use while an assignment is open; recently used when returned within recentDays; otherwise available or never used. */
export function summarize(id:string,assignments:Assignment[],recentDays:number,on=today()):Summary{
 const history=assignments.filter(a=>a.territory_id===id).sort((a,b)=>b.taken_on.localeCompare(a.taken_on));
 const open=history.find(a=>!a.returned_on);
 const lastReturned=history.map(a=>a.returned_on||'').filter(Boolean).sort().pop();
 let status:Status='available';
 if(open)status='in_use';
 else if(!history.length)status='never';
 else if(lastReturned&&daysBetween(lastReturned,on)<=recentDays)status='recent';
 return {status,open,lastReturned,overdue:Boolean(open&&open.due_on<on),history};
}

/** Spreadsheet-safe cell: quoted, and formulas neutralised so a name cannot run in Excel. */
export function csvCell(value:unknown){const text=String(value??'');const safe=/^[=+\-@\t\r]/.test(text)?"'"+text:text;return '"'+safe.replace(/"/g,'""')+'"';}
/** One row per assignment (territories never given out get one empty row), in number order. */
export function territoryCsv(territories:Territory[],assignments:Assignment[],recentDays:number,on=today()){
 const rows=[['Number','Name','Status','Publisher','Taken','Due','Returned','Map link','Notes']];
 for(const t of [...territories].sort(byNumber)){
  const s=summarize(t.id,assignments,recentDays,on);
  const label=STATUS_LABEL[s.status]+(s.overdue?' (overdue)':'');
  if(!s.history.length)rows.push([t.number,t.name,label,'','','','',t.map_url||'',t.notes]);
  for(const a of [...s.history].reverse())rows.push([t.number,t.name,label,a.publisher,a.taken_on,a.due_on,a.returned_on||'',t.map_url||'',t.notes]);
 }
 return '﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
}

export function mapsLink(lat:number,lng:number){return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(COORD_DIGITS)},${lng.toFixed(COORD_DIGITS)}`;}

/** Every name used before, so the same publisher is always written the same way. */
export function publisherNames(assignments:Assignment[]){
 const seen=new Map<string,string>();
 for(const a of assignments){const key=a.publisher.trim().toLocaleLowerCase();if(key&&!seen.has(key))seen.set(key,a.publisher.trim());}
 return [...seen.values()].sort((x,y)=>x.localeCompare(y));
}
/** A name typed in different case or spacing becomes the saved spelling. */
export function canonicalName(typed:string,names:string[]){
 const clean=typed.trim().replace(/\s+/g,' ');
 return names.find(n=>n.toLocaleLowerCase()===clean.toLocaleLowerCase())||clean;
}
