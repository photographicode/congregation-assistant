// Territory manager calls. Every read and write is a scoped server function; the fictional demo keeps data in memory.
import {z} from 'zod';
import {demo,mapFiles,rpc} from './client';
import {territoryUrl} from './territory-site';
import seed from './territory-demo.json';
import {addDays,reportModeSchema,roleSchema,today,workspaceDataSchema,type Assignment,type Issue,type ReportMode,type Territory,type WorkspaceData} from './territory-model';

const workspaceList=z.array(z.object({id:z.string(),name:z.string(),role:roleSchema}));
type WorkspaceSummary=z.infer<typeof workspaceList>[number];
const ownerSchema=z.object({
 workspaces:z.array(z.object({id:z.string(),name:z.string(),created_at:z.string(),admins:z.array(z.string()),territories:z.number()})),
 applications:z.array(z.object({id:z.string(),contact_name:z.string(),contact_email:z.string(),admin_email:z.string(),congregation_name:z.string(),phone:z.string().nullable(),status:z.enum(['pending','approved','declined']),created_at:z.string()})),
});
type OwnerOverview=z.infer<typeof ownerSchema>;
const reportSettings={report_mode:reportModeSchema.default('issues'),languages:z.array(z.string()).default([])};
const publicFormSchema=z.object({workspace:z.string(),...reportSettings,territories:z.array(z.object({id:z.string(),number:z.string(),name:z.string()}))});
const publicTerritorySchema=z.object({id:z.string(),number:z.string(),name:z.string(),notes:z.string(),image:z.string().nullable(),map_url:z.string().nullable().default(null),workspace:z.string(),...reportSettings,
 reports:z.array(z.object({kind:z.enum(['issue','language']).default('issue'),language:z.string().nullable().default(null),household:z.string(),details:z.string(),lat:z.number().nullable(),lng:z.number().nullable(),created_at:z.string()}))});
export type PublicTerritory=z.infer<typeof publicTerritorySchema>;

// ---- Fictional demo -------------------------------------------------------------------------------
const id=()=>crypto.randomUUID();
const sample=(():WorkspaceData&{images:Record<string,string>}=>{
 const d=today(),now=new Date().toISOString(),notes:Record<string,string>=seed.notesFor;
 const territories:Territory[]=seed.names.map((name,i)=>({id:'demo-t'+(i+1),number:String(i+1),name,notes:notes[String(i+1)]||'',thumb:null,has_image:false,has_boundary:false,map_url:seed.mapUrl,share_token:'demo-share-'+(i+1),updated_at:now,review_comment:'',review_comment_at:null}));
 const assignments:Assignment[]=seed.assignments.map(a=>({id:id(),territory_id:'demo-t'+a.territory,publisher:a.publisher,taken_on:addDays(d,-a.takenDaysAgo),due_on:addDays(d,seed.dueDays-a.takenDaysAgo),returned_on:a.returnedDaysAgo===null?null:addDays(d,-a.returnedDaysAgo)}));
 const {territory,...issue}=seed.issue;
 const reports:Issue[]=[{...issue,kind:'issue',language:null,id:id(),territory_id:'demo-t'+territory,created_at:now,resolved_at:null},
  ...seed.languageFinds.map(f=>({...f,kind:'language' as const,id:id(),territory_id:'demo-t'+f.territory,reporter:'',lat:null,lng:null,accuracy:null,created_at:now,resolved_at:null}))];
 return {workspace:{id:'demo-ws',name:'River Park Congregation',due_days:seed.dueDays,recent_days:seed.recentDays,report_token:'demo',report_mode:'issues_language',languages:seed.languages,review_state:'none',review_round:0,full_map_path:null,full_map_name:null,full_map_at:null,stage:null},role:'admin',members:[{email:'overseer@example.invalid',role:'admin'},{email:'helper@example.invalid',role:'viewer'}],territories,assignments,reports,images:{}};
})();
const demoOwner:OwnerOverview={workspaces:[{id:'demo-ws',name:'River Park Congregation',created_at:new Date().toISOString(),admins:['overseer@example.invalid'],territories:seed.names.length}],
 applications:[{id:'00000000-0000-4000-8000-000000000003',contact_name:'Fictional Servant',contact_email:'servant@example.invalid',admin_email:'servant@example.invalid',congregation_name:'Fictional Hillside',phone:null,status:'pending',created_at:new Date().toISOString()}]};
const fail=(message:string)=>{throw Error(message);};
const clone=<T>(v:T):T=>structuredClone(v);

// ---- Signed-in members ----------------------------------------------------------------------------
export async function myWorkspaces(){return demo?[{id:'demo-ws',name:sample.workspace.name,role:'admin' as const}]:workspaceList.parse(await rpc('tm_my_workspaces'));}
export async function loadWorkspace(ws:string):Promise<WorkspaceData>{
 if(demo){const {images:_images,...data}=sample;return workspaceDataSchema.parse(clone(data));}
 return workspaceDataSchema.parse(await rpc('tm_workspace_data',{p_ws:ws}));
}
export async function territoryImage(territory:string){return demo?sample.images[territory]||null:z.string().nullable().parse(await rpc('tm_territory_image',{p_id:territory}));}
type TerritoryInput={id?:string;number:string;name:string;notes:string;mapUrl:string;image?:string;thumb?:string};
function demoSaveTerritory(t:TerritoryInput){
 if(sample.territories.some(x=>x.number===t.number.trim()&&x.id!==t.id))fail(`Territory number ${t.number} is already used. Choose another.`);
 const existing=sample.territories.find(x=>x.id===t.id);
 const row:Territory=existing??{id:id(),number:'',name:'',notes:'',thumb:null,has_image:false,has_boundary:false,map_url:null,share_token:'demo-share-'+id(),updated_at:'',review_comment:'',review_comment_at:null};
 Object.assign(row,{number:t.number.trim(),name:t.name.trim(),notes:t.notes,map_url:t.mapUrl.trim()||null,updated_at:new Date().toISOString()});
 if(t.image!==undefined){row.thumb=t.thumb||null;row.has_image=Boolean(t.image);if(t.image)sample.images[row.id]=t.image;else delete sample.images[row.id];}
 if(!existing)sample.territories.push(row);
 return row.id;
}
/** image: undefined keeps the saved one, '' removes it. */
export async function saveTerritory(ws:string,t:TerritoryInput){
 if(demo)return demoSaveTerritory(t);
 return z.string().parse(await rpc('tm_save_territory',{p_ws:ws,p_id:t.id||null,p_number:t.number,p_name:t.name,p_notes:t.notes,p_image:t.image??null,p_thumb:t.thumb??null,p_map_url:t.mapUrl.trim()||null}));
}
export async function deleteTerritory(territory:string){
 if(!demo){await rpc('tm_delete_territory',{p_id:territory});return;}
 sample.territories=sample.territories.filter(t=>t.id!==territory);sample.assignments=sample.assignments.filter(a=>a.territory_id!==territory);sample.reports=sample.reports.filter(r=>r.territory_id!==territory);
}
type AssignmentInput={id?:string;publisher:string;taken:string;due:string;returned:string};
function demoSaveAssignment(territory:string,a:AssignmentInput){
 if(!a.returned&&sample.assignments.some(x=>x.territory_id===territory&&!x.returned_on&&x.id!==a.id))fail('This territory is already with a publisher. Mark it returned first.');
 if((a.due&&a.due<a.taken)||(a.returned&&a.returned<a.taken))fail('Check the dates: due and returned dates cannot be before the taken date.');
 const row:Assignment={id:a.id||id(),territory_id:territory,publisher:a.publisher.trim(),taken_on:a.taken,due_on:a.due||addDays(a.taken,sample.workspace.due_days),returned_on:a.returned||null};
 sample.assignments=[...sample.assignments.filter(x=>x.id!==row.id),row];
}
export async function saveAssignment(territory:string,a:AssignmentInput){
 if(demo){demoSaveAssignment(territory,a);return;}
 await rpc('tm_save_assignment',{p_territory:territory,p_id:a.id||null,p_publisher:a.publisher,p_taken:a.taken,p_due:a.due||null,p_returned:a.returned||null});
}
export async function deleteAssignment(assignment:string){if(demo)sample.assignments=sample.assignments.filter(a=>a.id!==assignment);else await rpc('tm_delete_assignment',{p_id:assignment});}
export async function resolveIssue(issue:string,resolved:boolean){
 if(!demo){await rpc('tm_resolve_report',{p_id:issue,p_resolved:resolved});return;}
 const row=sample.reports.find(r=>r.id===issue);if(row)row.resolved_at=resolved?new Date().toISOString():null;
}
export async function deleteIssue(issue:string){if(demo)sample.reports=sample.reports.filter(r=>r.id!==issue);else await rpc('tm_delete_report',{p_id:issue});}
export async function saveSettings(ws:string,s:{name:string;dueDays:number;recentDays:number;rotate:boolean}){
 if(!demo){await rpc('tm_save_settings',{p_ws:ws,p_name:s.name,p_due_days:s.dueDays,p_recent_days:s.recentDays,p_rotate_report_link:s.rotate});return;}
 Object.assign(sample.workspace,{name:s.name.trim(),due_days:s.dueDays,recent_days:s.recentDays});
}
export async function saveReportSettings(ws:string,mode:ReportMode,languages:string[]){
 if(!demo){await rpc('tm_save_report_settings',{p_ws:ws,p_mode:mode,p_languages:languages});return;}
 const list=[...new Set(languages.map(l=>l.trim()).filter(Boolean))];
 if(mode==='issues_language'&&!list.length)fail('Add at least one language for language search');
 Object.assign(sample.workspace,{report_mode:mode,languages:list});
}
/** Territory outlines matched by number; the server routes a located report to the territory that holds it. */
export async function saveBoundaries(ws:string,items:{number:string;boundary:unknown}[]){
 const result=z.object({matched:z.number(),missing:z.array(z.string())});
 if(!demo)return result.parse(await rpc('tm_save_boundaries',{p_ws:ws,p_items:items}));
 const numbers=new Set(sample.territories.map(t=>t.number));
 for(const t of sample.territories)if(items.some(i=>i.number===t.number))t.has_boundary=true;
 return {matched:items.filter(i=>numbers.has(i.number)).length,missing:items.filter(i=>!numbers.has(i.number)).map(i=>i.number)};
}
export async function setMember(ws:string,email:string,role:'admin'|'viewer'|null){
 if(!demo){await rpc('tm_set_member',{p_ws:ws,p_email:email,p_role:role});return;}
 const e=email.trim().toLowerCase();
 if(role!=='admin'&&sample.members.find(m=>m.email===e)?.role==='admin'&&sample.members.filter(m=>m.role==='admin').length<=1)fail('Keep at least one admin. Add another admin first.');
 sample.members=sample.members.filter(m=>m.email!==e);if(role)sample.members.push({email:e,role});
}

// ---- Owner (SuperAdmin) ---------------------------------------------------------------------------
/** Main-app owners and the territory-only owners both manage territory workspaces. */
// The fictional demo shows the owner home with ?territory&demo=owner.
export async function amSuperadmin(){return demo?new URLSearchParams(location.search).get('demo')==='owner':z.boolean().parse(await rpc('tm_am_superadmin'));}
export async function ownerOverview(){return demo?clone(demoOwner):ownerSchema.parse(await rpc('tm_owner_overview'));}
export async function createWorkspace(name:string,adminEmail:string){
 if(!demo){await rpc('tm_create_workspace',{p_name:name,p_admin_email:adminEmail});return;}
 demoOwner.workspaces.unshift({id:id(),name,created_at:new Date().toISOString(),admins:[adminEmail.toLowerCase()],territories:0});
}
export async function reviewApplication(application:string,approve:boolean){
 if(!demo){await rpc('tm_review_application',{p_id:application,p_approve:approve});return;}
 const row=demoOwner.applications.find(a=>a.id===application);if(!row)return;
 row.status=approve?'approved':'declined';if(approve)await createWorkspace(row.congregation_name,row.admin_email);
}

// ---- Public, no sign-in ---------------------------------------------------------------------------
export async function publicForm(token:string){
 if(demo)return {workspace:sample.workspace.name,report_mode:sample.workspace.report_mode,languages:sample.workspace.languages,territories:sample.territories.map(({id,number,name})=>({id,number,name}))};
 return publicFormSchema.parse(await rpc('tm_public_form',{p_token:token}));
}
export async function publicTerritory(token:string):Promise<PublicTerritory>{
 if(demo){const t=sample.territories.find(x=>x.share_token===token)??sample.territories.find(x=>x.number==='3');if(!t)throw Error('Demo territory missing');return {id:t.id,number:t.number,name:t.name,notes:t.notes,map_url:t.map_url,image:sample.images[t.id]||null,workspace:sample.workspace.name,report_mode:sample.workspace.report_mode,languages:sample.workspace.languages,reports:sample.reports.filter(r=>r.territory_id===t.id&&!r.resolved_at)};}
 return publicTerritorySchema.parse(await rpc('tm_public_territory',{p_token:token}));
}
type ReportInput={territory:string|null;kind:'issue'|'language';language:string;household:string;details:string;reporter:string;lat:number|null;lng:number|null;accuracy:number|null;website:string};
const reportResult=z.object({number:z.string().optional(),name:z.string().optional(),moved:z.boolean().optional()}).passthrough();
/** Sends a report. With a location inside a territory outline the server files it under that territory (moved: true). */
export async function submitIssue(token:string,r:ReportInput){
 if(demo)return demoSubmitIssue(token,r);
 try{return reportResult.parse(await rpc('tm_submit_report_v2',{p_token:token,p_territory:r.territory,p_kind:r.kind,p_language:r.language||null,p_household:r.household,p_details:r.details,p_reporter:r.reporter,p_lat:r.lat,p_lng:r.lng,p_accuracy:r.accuracy,p_website:r.website}));}
 catch(e){
  // shortcut: servers without the 2026-11-16 migration take issues only; drop this fallback once it has run.
  if(r.kind!=='issue'||!/PGRST202|could not find the function/i.test((e as Error)?.message||''))throw e;
  await rpc('tm_submit_report',{p_token:token,p_territory:r.territory,p_household:r.household,p_details:r.details,p_reporter:r.reporter,p_lat:r.lat,p_lng:r.lng,p_accuracy:r.accuracy,p_website:r.website});return {};
 }
}
function demoSubmitIssue(token:string,r:ReportInput){
 const territory=r.territory||sample.territories.find(t=>t.share_token===token)?.id;if(!territory)fail('Choose a territory from the list.');
 const details=r.details.trim()||(r.kind==='language'?'Speaks '+r.language:'');
 sample.reports.unshift({id:id(),territory_id:territory!,kind:r.kind,language:r.kind==='language'?r.language:null,household:r.household,details,reporter:r.reporter,lat:r.lat,lng:r.lng,accuracy:r.accuracy,created_at:new Date().toISOString(),resolved_at:null});
 return {};
}
export async function submitApplication(f:{name:string;email:string;admin:string;congregation:string;phone:string;website:string}){
 if(demo)return 'demo';
 const result=z.object({reference:z.string().optional()}).parse(await rpc('tm_submit_application',{p_name:f.name,p_contact_email:f.email,p_admin_email:f.admin,p_congregation:f.congregation,p_phone:f.phone,p_website:f.website}));
 return result.reference||'received';
}

// ---- Territory-making requests (owners only) ------------------------------------------------------
/** The last request milestone, ready for use. */
const LAST_STAGE=4;
const helpStatus=z.enum(['new','in_progress','done','declined']);
const helpRequestSchema=z.object({id:z.string(),contact_name:z.string(),contact_email:z.string(),congregation_name:z.string(),phone:z.string().nullable(),details:z.string(),
 status:helpStatus,owner_note:z.string().nullable(),created_at:z.string(),stage:z.number().int().min(0).max(LAST_STAGE).default(0),track_token:z.string().nullable().default(null),
 files:z.array(z.object({id:z.string(),name:z.string(),kind:z.enum(['kml','kmz']),size:z.number()})).default([])});
export type HelpRequest=z.infer<typeof helpRequestSchema>;
export type HelpStatus=z.infer<typeof helpStatus>;
const helpFileSchema=z.object({name:z.string(),kind:z.enum(['kml','kmz']),congregation:z.string(),data:z.string()});
export type HelpFile=z.infer<typeof helpFileSchema>;
const DEMO_KML='<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Fictional Hillside boundary</name><Polygon><outerBoundaryIs><LinearRing><coordinates>76.30,9.90 76.33,9.90 76.33,9.93 76.30,9.93 76.30,9.90</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>';
let demoHelp:HelpRequest[]=[{id:'00000000-0000-4000-8000-000000000011',contact_name:'Fictional Servant',contact_email:'servant@example.invalid',congregation_name:'Fictional Hillside',phone:null,
 details:'[Needs: Territory Cards, Full map] [Now: Just the KML file from Hub] We need about 40 territories. Card instructions in Malayalam.',status:'new',owner_note:null,created_at:new Date().toISOString(),stage:0,track_token:'demo-track',
 files:[{id:'demo-file-1',name:'hillside-boundary.kml',kind:'kml',size:DEMO_KML.length}]}];
export async function helpRequests(){return demo?clone(demoHelp):z.array(helpRequestSchema).parse(await rpc('get_territory_requests'));}
export async function setHelpRequest(request:string,status:HelpStatus,note:string|null){
 if(!demo){await rpc('update_territory_request',{p_id:request,p_status:status,p_note:note});return;}
 demoHelp=demoHelp.map(r=>r.id===request?{...r,status,owner_note:note===null?r.owner_note:note.trim()||null}:r);
}
const demoStatus=(stage:number):HelpStatus=>{if(stage===0)return 'new';return stage===LAST_STAGE?'done':'in_progress';};
/** Moves a request to a milestone (0 received … 4 ready for use; -1 declines). The server emails the congregation on accept, decline and ready. */
export async function setHelpStage(request:string,stage:number){
 if(!demo){await rpc('set_territory_request_stage',{p_id:request,p_stage:stage});return;}
 demoHelp=demoHelp.map(r=>{if(r.id!==request)return r;if(stage<0)return {...r,status:'declined'};return {...r,stage,status:demoStatus(stage)};});
}
const progressSchema=z.object({congregation:z.string(),status:helpStatus,stage:z.number(),created_at:z.string(),updated_at:z.string()});
export type RequestProgress=z.infer<typeof progressSchema>;
/** The congregation's tracking link (no sign-in). */
export async function requestProgress(token:string):Promise<RequestProgress>{
 if(demo){const now=new Date().toISOString();return {congregation:'Fictional Hillside',status:'in_progress',stage:2,created_at:now,updated_at:now};}
 return progressSchema.parse(await rpc('territory_request_progress',{p_token:token}));
}
export const trackLink=(token:string)=>`${territoryUrl('territory-track'+(demo?'&demo':''))}#token=${token}`;
export async function helpRequestFile(file:string):Promise<HelpFile>{
 if(demo)return {name:'hillside-boundary.kml',kind:'kml',congregation:'Fictional Hillside',data:btoa(DEMO_KML)};
 return helpFileSchema.parse(await rpc('get_territory_request_file',{p_id:file}));
}

// ---- Territory naming: the congregation names each split territory on one link --------------------------------
const pointSchema=z.object({name:z.string(),lng:z.number(),lat:z.number()});
export type NamingPoint=z.infer<typeof pointSchema>;
const entrySchema=z.object({number:z.string(),locality:z.string(),points:z.array(pointSchema),note:z.string(),submitted:z.boolean()});
export type NamingEntry=z.infer<typeof entrySchema>;
const outline=z.object({type:z.enum(['Polygon','MultiPolygon']),coordinates:z.array(z.any())});
// Territories may carry their card's current locality and landmarks; landmarks_editable=false allows renaming only.
const namingSchema=z.object({congregation:z.string(),landmarks_editable:z.boolean().default(true),
 territories:z.array(z.object({number:z.string(),geometry:outline,locality:z.string().default(''),points:z.array(pointSchema).default([])})),entries:z.array(entrySchema)});
export type Naming=z.infer<typeof namingSchema>;
const namingListSchema=z.array(z.object({id:z.string(),token:z.string(),request_id:z.string().nullable(),congregation:z.string(),created_at:z.string(),total:z.number(),submitted:z.number(),landmarks_editable:z.boolean().default(true)}));
export type NamingSummary=z.infer<typeof namingListSchema>[number];
const demoNaming:Naming=namingSchema.parse(seed.naming);
/** Owner: publish split territories for naming; with a request, its contact is emailed the link. */
export async function createNaming(request:string|null,congregation:string,territories:{number:string;geometry:unknown;locality?:string;points?:NamingPoint[]}[],landmarksEditable=true){
 const result=z.object({id:z.string(),token:z.string(),link:z.string(),emailed:z.boolean()});
 if(demo)return {id:'demo-naming',token:'demo',link:namingLink('demo'),emailed:Boolean(request)};
 return result.parse(await rpc('create_territory_naming',{p_request:request,p_congregation:congregation,p_territories:territories,p_landmarks_editable:landmarksEditable}));
}
export async function namingList():Promise<NamingSummary[]>{
 if(demo)return [{id:'demo-naming',token:'demo',request_id:'00000000-0000-4000-8000-000000000011',congregation:'Fictional Hillside',created_at:new Date().toISOString(),total:demoNaming.territories.length,submitted:demoNaming.entries.filter(e=>e.submitted).length,landmarks_editable:demoNaming.landmarks_editable}];
 return namingListSchema.parse(await rpc('territory_naming_list'));
}
/** Owner: let the congregation move, add and remove landmarks on this link, or only rename them. */
export async function setNamingLandmarks(id:string,on:boolean){
 if(demo||id==='demo-naming'){demoNaming.landmarks_editable=on;return;}
 await rpc('set_territory_naming_landmarks',{p_id:id,p_on:on});
}
export async function namingResults(id:string):Promise<NamingEntry[]>{
 if(demo||id==='demo-naming')return clone(demoNaming.entries);
 return z.array(entrySchema).parse(await rpc('territory_naming_results',{p_id:id}));
}
export async function namingGet(token:string):Promise<Naming>{
 if(demo)return clone(demoNaming);
 return namingSchema.parse(await rpc('territory_naming_get',{p_token:token}));
}
export async function namingSave(token:string,e:Omit<NamingEntry,'submitted'>,submit:boolean){
 if(!demo){await rpc('territory_naming_save',{p_token:token,p_number:e.number,p_locality:e.locality,p_points:e.points,p_note:e.note,p_submit:submit});return;}
 if(submit&&e.locality.trim().length<2)fail('Write the locality name before submitting');
 const old=demoNaming.entries.find(x=>x.number===e.number);
 demoNaming.entries=[...demoNaming.entries.filter(x=>x.number!==e.number),{...e,submitted:submit||Boolean(old?.submitted)}];
}
export const namingLink=(token:string)=>`${territoryUrl('territory-names'+(demo?'&demo':''))}#token=${token}`;

/** Links that open without sign-in. The token rides in the hash so it never reaches server logs or referrers. */
export const shareLink=(token:string)=>`${territoryUrl('territory-card'+(demo?'&demo':''))}#token=${token}`;
export const issueLink=(token:string)=>`${territoryUrl('territory-issue'+(demo?'&demo':''))}#token=${token}`;

// ---- Card review, downloads and the full map ---------------------------------------------------------------
/** Admin: a comment on one card while in review ('' removes it). */
export async function reviewComment(territory:string,comment:string){
 if(!demo){await rpc('tm_review_comment',{p_territory:territory,p_comment:comment});return;}
 const t=sample.territories.find(x=>x.id===territory);if(t){t.review_comment=comment.trim();t.review_comment_at=comment.trim()?new Date().toISOString():null;}
}
/** Admin: send the comments back (the cards come back corrected). */
export async function reviewSubmit(ws:string){
 if(!demo){await rpc('tm_review_submit',{p_ws:ws});return;}
 if(!sample.territories.some(t=>t.review_comment))fail('Write a comment on the cards that need a change, or approve all cards');
 sample.workspace.review_state='changes';
}
/** Admin: approve every card. */
export async function reviewApprove(ws:string){
 if(!demo){await rpc('tm_review_approve',{p_ws:ws});return;}
 sample.workspace.review_state='approved';for(const t of sample.territories){t.review_comment='';t.review_comment_at=null;}
}
/** Owner: send the cards in a workspace to its admin for review. */
export async function reviewSend(ws:string){
 if(!demo){await rpc('tm_review_send',{p_ws:ws});return;}
 sample.workspace.review_state='review';sample.workspace.review_round=(sample.workspace.review_round??0)+1;
}
const requestWorkspaceSchema=z.array(z.object({id:z.string(),request_id:z.string(),review_state:z.enum(['none','review','changes','approved']),review_round:z.number(),cards:z.number(),comments:z.number(),full_map_name:z.string().nullable(),full_map_at:z.string().nullable()}));
export type RequestWorkspace=z.infer<typeof requestWorkspaceSchema>[number];
/** Owner: each request's workspace and how far its review has got. */
export async function requestWorkspaces():Promise<RequestWorkspace[]>{
 if(demo)return [{id:'demo-ws',request_id:'00000000-0000-4000-8000-000000000011',review_state:sample.workspace.review_state??'none',review_round:sample.workspace.review_round??0,cards:sample.territories.length,comments:sample.territories.filter(t=>t.review_comment).length,full_map_name:null,full_map_at:null}];
 return requestWorkspaceSchema.parse(await rpc('tm_request_workspaces'));
}
/** Owner: the request's workspace (made now if missing; its contact email is the admin). */
export async function workspaceForRequest(request:string){return demo?'demo-ws':z.string().parse(await rpc('tm_workspace_for_request',{p_request:request}));}
const FILE_NAME_MAX=120;
/** Owner: upload the full map into the workspace's folder; the admin is emailed and the request becomes ready for use. */
export async function setFullMap(ws:string,file:File){
 if(demo)return;
 const safe=file.name.replace(/[^\w.-]+/g,'-').slice(-FILE_NAME_MAX)||'full-map.pdf',path=`${ws}/${Date.now()}-${safe}`;
 await mapFiles.upload(path,file);
 await rpc('tm_set_full_map',{p_ws:ws,p_path:path,p_name:file.name});
}
/** Members: a short-lived link that downloads the full map. */
export async function fullMapLink(path:string,name:string){if(demo)fail('The fictional demo has no full map file.');return mapFiles.link(path,name);}
