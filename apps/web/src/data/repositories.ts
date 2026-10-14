import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
export type FailureKind='retryable'|'conflict'|'forbidden'|'offline'|'invalid';
export class DataError extends Error {constructor(public kind:FailureKind,message:string){super(message);}}
export function dataError(error:unknown):DataError {
 const e=error as {code?:string;message?:string};
 return new DataError(!navigator.onLine?'offline':e?.code==='40001'?'conflict':e?.code==='42501'?'forbidden':e?.code==='23505'?'conflict':e?.code==='PGRST202'?'invalid':'retryable',e?.message||'Connection unavailable. Your changes are kept.');
}
export const reportSchema=z.object({id:z.string(),pub_id:z.string(),cong_id:z.string(),service_year:z.number().int(),month:z.number().int().min(0).max(11),shared_in_ministry:z.boolean().nullable().default(false),studies:z.number().int().nullable().default(0),hours:z.coerce.number().min(0).max(744).default(0),comments:z.string().nullable().default(''),is_ap:z.boolean().nullable().default(false)});
export type Report=z.infer<typeof reportSchema>;
const personSchema=z.object({id:z.string(),name:z.string(),service_group:z.string().nullable().optional()}).passthrough();
export const draftSchema=z.object({v:z.number().optional(),personnel:z.array(z.object({id:z.string(),name:z.string()}).passthrough()),assignments:z.record(z.string(),z.record(z.string(),z.object({personId:z.string().nullable().optional(),customTitle:z.string().optional(),assignmentType:z.string().optional(),status:z.string().optional()}).passthrough())),additionalDuties:z.array(z.object({id:z.string(),name:z.string(),slots:z.number()}).passthrough()),programs:z.record(z.string(),z.unknown()).optional(),template:z.string().optional()}).passthrough();
export type ScheduleDraft=z.infer<typeof draftSchema>;
export function repositories(client:SupabaseClient,cong:string,isDemo=false) {
 const invoke=async<T>(name:string,args:Record<string,unknown>,schema:z.ZodType<T>):Promise<T>=>{
  if(isDemo)throw new DataError('forbidden','The fictional demo never calls the cloud.');
  const {data,error}=await client.rpc(name,{p_cong_id:cong,...args});if(error)throw dataError(error);
  const parsed=schema.safeParse(data);if(!parsed.success)throw new DataError('invalid','The server returned an unexpected response. Update the database contract before continuing.');return parsed.data;
 };
 const table=async<T>(name:string,schema:z.ZodType<T>,filters:Record<string,unknown>={})=>{
  if(isDemo)throw new DataError('forbidden','The fictional demo never calls the cloud.');
  const rows:unknown[]=[];const seen=new Set<string>();
  for(let offset=0;offset<100000;offset+=1000){let request=client.from(name).select('*').eq('cong_id',cong).order('id').range(offset,offset+999);for(const [key,value] of Object.entries(filters))request=request.eq(key,value);const {data,error}=await request;if(error)throw dataError(error);for(const row of data||[]){if(seen.has(row.id))throw new DataError('conflict','Records changed during loading. Refresh before continuing.');seen.add(row.id);rows.push(row);}if((data||[]).length<1000)return schema.parse(rows);}
  throw new DataError('invalid','Dataset is larger than the supported workspace limit.');
 };
 return {
  people:{list:()=>table('publishers',z.array(personSchema))},
  reports:{year:(year:number)=>table('reports',z.array(reportSchema),{service_year:year}),list:(year:number,month:number)=>table('reports',z.array(reportSchema),{service_year:year,month}),save:(rows:unknown[])=>invoke('save_congregation_reports',{p_reports:rows},z.array(reportSchema)),family:()=>invoke('get_my_report_publishers',{},z.array(z.object({id:z.string(),name:z.string()}))),own:(id:string)=>invoke('get_my_family_report',{p_publisher_id:id},z.object({publisherId:z.string(),name:z.string(),report:z.object({period:z.string(),submitted:z.boolean(),record:z.unknown().nullable(),hoursRequired:z.boolean()}).passthrough()})),submit:(args:Record<string,unknown>)=>invoke('submit_family_report',args,z.unknown())},
  schedules:{get:()=>invoke('get_oclm_workspace',{},z.object({revision:z.number(),draft:draftSchema.nullable(),publication:z.object({version:z.number(),token:z.string(),snapshot:z.unknown()}).passthrough().nullable()})),save:(revision:number,draft:ScheduleDraft)=>invoke('save_oclm_workspace',{p_expected_revision:revision,p_data:draft},z.object({revision:z.number(),draft:draftSchema})),publish:(week:string,revision:number,version:number)=>invoke('publish_oclm_week',{p_week:week,p_expected_revision:revision,p_expected_version:version,p_remove:false},z.record(z.string(),z.unknown())),roster:()=>invoke('get_oclm_roster',{},z.array(z.object({id:z.string(),name:z.string()}).passthrough()))},
  attendance:{all:()=>table('meeting_attendance',z.array(z.object({id:z.string()}).passthrough())),list:(year:number,month:number)=>table('meeting_attendance',z.array(z.object({id:z.string()}).passthrough()),{service_year:year,month}),save:async(row:Record<string,unknown>)=>{if(isDemo)throw new DataError('forbidden','Demo is local only.');const {error}=await client.from('meeting_attendance').upsert({...row,cong_id:cong},{onConflict:'cong_id,service_year,month'});if(error)throw dataError(error);}},
  access:{list:()=>table('congregation_access',z.array(z.object({id:z.string(),email:z.email(),role:z.string(),active:z.boolean()}).passthrough()))},
  backup:{export:()=>invoke('export_congregation_workspace',{},z.object({data:z.record(z.string(),z.unknown()),fingerprint:z.string()})),restore:(fingerprint:string,data:unknown)=>invoke('restore_congregation_workspace',{p_expected_fingerprint:fingerprint,p_backup:data},z.boolean())},
 };
}
