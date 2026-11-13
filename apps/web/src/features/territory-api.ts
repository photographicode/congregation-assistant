// Territory manager calls. Every read and write is a scoped server function; the fictional demo keeps data in memory.
import {z} from 'zod';
import {demo,rpc} from './client';
import {territoryUrl} from './territory-site';
import seed from './territory-demo.json';
import {addDays,today,workspaceDataSchema,type Assignment,type Issue,type Territory,type WorkspaceData} from './territory-model';

const workspaceList=z.array(z.object({id:z.string(),name:z.string(),role:z.enum(['admin','manager'])}));
type WorkspaceSummary=z.infer<typeof workspaceList>[number];
const ownerSchema=z.object({
 workspaces:z.array(z.object({id:z.string(),name:z.string(),created_at:z.string(),admins:z.array(z.string()),territories:z.number()})),
 applications:z.array(z.object({id:z.string(),contact_name:z.string(),contact_email:z.string(),admin_email:z.string(),congregation_name:z.string(),phone:z.string().nullable(),status:z.enum(['pending','approved','declined']),created_at:z.string()})),
});
type OwnerOverview=z.infer<typeof ownerSchema>;
const publicFormSchema=z.object({workspace:z.string(),territories:z.array(z.object({id:z.string(),number:z.string(),name:z.string()}))});
const publicTerritorySchema=z.object({id:z.string(),number:z.string(),name:z.string(),notes:z.string(),image:z.string().nullable(),map_url:z.string().nullable().default(null),workspace:z.string(),
 reports:z.array(z.object({household:z.string(),details:z.string(),lat:z.number().nullable(),lng:z.number().nullable(),created_at:z.string()}))});
export type PublicTerritory=z.infer<typeof publicTerritorySchema>;

// ---- Fictional demo -------------------------------------------------------------------------------
const id=()=>crypto.randomUUID();
const sample=(():WorkspaceData&{images:Record<string,string>}=>{
 const d=today(),now=new Date().toISOString(),notes:Record<string,string>=seed.notesFor;
 const territories:Territory[]=seed.names.map((name,i)=>({id:'demo-t'+(i+1),number:String(i+1),name,notes:notes[String(i+1)]||'',thumb:null,has_image:false,map_url:seed.mapUrl,share_token:'demo-share-'+(i+1),updated_at:now}));
 const assignments:Assignment[]=seed.assignments.map(a=>({id:id(),territory_id:'demo-t'+a.territory,publisher:a.publisher,taken_on:addDays(d,-a.takenDaysAgo),due_on:addDays(d,seed.dueDays-a.takenDaysAgo),returned_on:a.returnedDaysAgo===null?null:addDays(d,-a.returnedDaysAgo)}));
 const {territory,...issue}=seed.issue;
 const reports:Issue[]=[{...issue,id:id(),territory_id:'demo-t'+territory,created_at:now,resolved_at:null}];
 return {workspace:{id:'demo-ws',name:'River Park Congregation',due_days:seed.dueDays,recent_days:seed.recentDays,report_token:'demo'},role:'admin',members:[{email:'overseer@example.invalid',role:'admin'},{email:'helper@example.invalid',role:'manager'}],territories,assignments,reports,images:{}};
})();
const demoOwner:OwnerOverview={workspaces:[{id:'demo-ws',name:'River Park Congregation',created_at:new Date().toISOString(),admins:['overseer@example.invalid'],territories:seed.names.length}],
 applications:[{id:'00000000-0000-4000-8000-000000000003',contact_name:'Fictional Servant',contact_email:'servant@example.invalid',admin_email:'servant@example.invalid',congregation_name:'Fictional Hillside',phone:null,status:'pending',created_at:new Date().toISOString()}]};
const fail=(message:string)=>{throw Error(message);};
const clone=<T>(v:T):T=>structuredClone(v);

// ---- Signed-in members ----------------------------------------------------------------------------
export async function myWorkspaces(){return demo?[{id:'demo-ws',name:sample.workspace.name,role:'admin' as const}]:workspaceList.parse(await rpc('tm_my_workspaces'));}
export async function loadWorkspace(ws:string):Promise<WorkspaceData>{
 if(demo){const {images:_images,...data}=sample;return clone(data);}
 return workspaceDataSchema.parse(await rpc('tm_workspace_data',{p_ws:ws}));
}
export async function territoryImage(territory:string){return demo?sample.images[territory]||null:z.string().nullable().parse(await rpc('tm_territory_image',{p_id:territory}));}
type TerritoryInput={id?:string;number:string;name:string;notes:string;mapUrl:string;image?:string;thumb?:string};
function demoSaveTerritory(t:TerritoryInput){
 if(sample.territories.some(x=>x.number===t.number.trim()&&x.id!==t.id))fail(`Territory number ${t.number} is already used. Choose another.`);
 const existing=sample.territories.find(x=>x.id===t.id);
 const row:Territory=existing??{id:id(),number:'',name:'',notes:'',thumb:null,has_image:false,map_url:null,share_token:'demo-share-'+id(),updated_at:''};
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
export async function setMember(ws:string,email:string,role:'admin'|'manager'|null){
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
 if(demo)return {workspace:sample.workspace.name,territories:sample.territories.map(({id,number,name})=>({id,number,name}))};
 return publicFormSchema.parse(await rpc('tm_public_form',{p_token:token}));
}
export async function publicTerritory(token:string):Promise<PublicTerritory>{
 if(demo){const t=sample.territories.find(x=>x.share_token===token)??sample.territories.find(x=>x.number==='3');if(!t)throw Error('Demo territory missing');return {id:t.id,number:t.number,name:t.name,notes:t.notes,map_url:t.map_url,image:sample.images[t.id]||null,workspace:sample.workspace.name,reports:sample.reports.filter(r=>r.territory_id===t.id&&!r.resolved_at)};}
 return publicTerritorySchema.parse(await rpc('tm_public_territory',{p_token:token}));
}
export async function submitIssue(token:string,r:{territory:string|null;household:string;details:string;reporter:string;lat:number|null;lng:number|null;accuracy:number|null;website:string}){
 if(!demo){await rpc('tm_submit_report',{p_token:token,p_territory:r.territory,p_household:r.household,p_details:r.details,p_reporter:r.reporter,p_lat:r.lat,p_lng:r.lng,p_accuracy:r.accuracy,p_website:r.website});return;}
 const territory=r.territory||sample.territories.find(t=>t.share_token===token)?.id;if(!territory)fail('Choose a territory from the list.');
 sample.reports.unshift({id:id(),territory_id:territory!,household:r.household,details:r.details,reporter:r.reporter,lat:r.lat,lng:r.lng,accuracy:r.accuracy,created_at:new Date().toISOString(),resolved_at:null});
}
export async function submitApplication(f:{name:string;email:string;admin:string;congregation:string;phone:string;website:string}){
 if(demo)return 'demo';
 const result=z.object({reference:z.string().optional()}).parse(await rpc('tm_submit_application',{p_name:f.name,p_contact_email:f.email,p_admin_email:f.admin,p_congregation:f.congregation,p_phone:f.phone,p_website:f.website}));
 return result.reference||'received';
}

// ---- Territory-making requests (owners only) ------------------------------------------------------
const helpStatus=z.enum(['new','in_progress','done','declined']);
const helpRequestSchema=z.object({id:z.string(),contact_name:z.string(),contact_email:z.string(),congregation_name:z.string(),phone:z.string().nullable(),details:z.string(),
 status:helpStatus,owner_note:z.string().nullable(),created_at:z.string(),
 files:z.array(z.object({id:z.string(),name:z.string(),kind:z.enum(['kml','kmz']),size:z.number()})).default([])});
export type HelpRequest=z.infer<typeof helpRequestSchema>;
export type HelpStatus=z.infer<typeof helpStatus>;
const helpFileSchema=z.object({name:z.string(),kind:z.enum(['kml','kmz']),congregation:z.string(),data:z.string()});
export type HelpFile=z.infer<typeof helpFileSchema>;
const DEMO_KML='<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Fictional Hillside boundary</name><Polygon><outerBoundaryIs><LinearRing><coordinates>76.30,9.90 76.33,9.90 76.33,9.93 76.30,9.93 76.30,9.90</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>';
let demoHelp:HelpRequest[]=[{id:'00000000-0000-4000-8000-000000000011',contact_name:'Fictional Servant',contact_email:'servant@example.invalid',congregation_name:'Fictional Hillside',phone:null,
 details:'[Complete package] [Now: Not started: we have only the boundary] We need about 40 territories. Card instructions in Malayalam.',status:'new',owner_note:null,created_at:new Date().toISOString(),
 files:[{id:'demo-file-1',name:'hillside-boundary.kml',kind:'kml',size:DEMO_KML.length}]}];
export async function helpRequests(){return demo?clone(demoHelp):z.array(helpRequestSchema).parse(await rpc('get_territory_requests'));}
export async function setHelpRequest(request:string,status:HelpStatus,note:string|null){
 if(!demo){await rpc('update_territory_request',{p_id:request,p_status:status,p_note:note});return;}
 demoHelp=demoHelp.map(r=>r.id===request?{...r,status,owner_note:note===null?r.owner_note:note.trim()||null}:r);
}
export async function helpRequestFile(file:string):Promise<HelpFile>{
 if(demo)return {name:'hillside-boundary.kml',kind:'kml',congregation:'Fictional Hillside',data:btoa(DEMO_KML)};
 return helpFileSchema.parse(await rpc('get_territory_request_file',{p_id:file}));
}

/** Links that open without sign-in. The token rides in the hash so it never reaches server logs or referrers. */
export const shareLink=(token:string)=>`${territoryUrl('territory-card'+(demo?'&demo':''))}#token=${token}`;
export const issueLink=(token:string)=>`${territoryUrl('territory-issue'+(demo?'&demo':''))}#token=${token}`;
