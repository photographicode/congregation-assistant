// Receives finished territories from the territory generator (generator.congregationassistant.com) and saves them into
// a workspace: number, name, map link, card image and outline. Opened by the generator at ?territory&from-generator.
// Only the window that opened this page, on the generator's origin, can send; everything is checked before saving.
import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {z} from 'zod';
import {Check,Map as MapIcon,Send} from 'lucide-react';
import {Button,Combobox,Segmented} from '../../../../packages/ui/components';
import * as api from './territory-api';
import {generatorUrl} from './territory-site';
import {sameCongregation} from './territory-review-model';

const LOCAL_GENERATOR='http://localhost:5180',READY='tm-manager-ready',SYNC='tm-sync',PING_MS=1000,NAME_MAX=150,NUMBER_MAX=20,URL_MAX=2000,IMAGE_MAX=1_500_000,THUMB_MAX=150_000,MAX_TERRITORIES=1000,LANDMARK_MAX=80,MAX_POINTS=12;
const dataImage=(max:number)=>z.string().max(max).regex(/^data:image\/(webp|jpeg|png);base64,/);
const ring=z.array(z.tuple([z.number(),z.number()]).rest(z.number()));
const payloadSchema=z.object({type:z.literal(SYNC),congregation:z.string().max(NAME_MAX).default(''),territories:z.array(z.object({
 number:z.string().trim().min(1).max(NUMBER_MAX),name:z.string().trim().min(1).max(NAME_MAX),mapUrl:z.string().max(URL_MAX).regex(/^https:\/\/\S+$/).or(z.literal('')),
 boundary:z.union([z.object({type:z.literal('Polygon'),coordinates:z.array(ring)}),z.object({type:z.literal('MultiPolygon'),coordinates:z.array(z.array(ring))})]),
 // The card's landmarks, for the naming link; older generators leave them out.
 landmarks:z.array(z.object({name:z.string().trim().min(1).max(LANDMARK_MAX),lng:z.number(),lat:z.number()})).max(MAX_POINTS).default([]),
 image:dataImage(IMAGE_MAX).optional(),thumb:dataImage(THUMB_MAX).optional()})).min(1).max(MAX_TERRITORIES)});
type Payload=z.infer<typeof payloadSchema>;

// Local development: the generator runs on its own localhost port.
const trusted=(origin:string)=>origin===new URL(generatorUrl()).origin||/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
const generatorOrigins=()=>[new URL(generatorUrl()).origin,...(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?[LOCAL_GENERATOR]:[])];
const FLAG='tm-from-generator';
/** True when the generator opened this page. Kept for this tab, so signing in with Google (which drops the query) does not lose it. */
export function fromGenerator(){
 try{
  if(new URLSearchParams(location.search).has('from-generator'))sessionStorage.setItem(FLAG,'1');
  return sessionStorage.getItem(FLAG)==='1'&&Boolean(window.opener);
 }catch{return new URLSearchParams(location.search).has('from-generator');}
}
const forget=()=>{try{sessionStorage.removeItem(FLAG);}catch{/* nothing kept */}};

/** Says "ready" to the generator until it sends the territories, then keeps the first valid message. */
function useIncoming(){
 const [data,setData]=React.useState<Payload|null>(null),[error,setError]=React.useState('');
 React.useEffect(()=>{
  const opener=window.opener as Window|null;
  if(!opener){setError('Open this page from the generator: Cards → Send to the territory manager.');return;}
  const listener=(e:MessageEvent)=>{
   if(e.source!==opener||!trusted(e.origin))return;
   const parsed=payloadSchema.safeParse(e.data);
   if(parsed.success){setData(parsed.data);clearInterval(ping);}
   else if((e.data as {type?:unknown}|null)?.type===SYNC)setError('The territories from the generator could not be read: '+parsed.error.issues[0]?.message);
  };
  addEventListener('message',listener);
  // Sent only to the generator's origins (production, and its local development server); the reply is checked above.
  const ready=()=>{for(const origin of generatorOrigins())opener.postMessage({type:READY},origin);};
  const ping=setInterval(ready,PING_MS);
  ready();
  return()=>{clearInterval(ping);removeEventListener('message',listener);};
 },[]);
 return {data,error};
}

/** The import page: waits for the generator, then saves into the chosen workspace. */
export function GeneratorSync({workspaces}:{workspaces:Workspace[]}){
 const {data,error}=useIncoming();
 return <main className="tm tm-center"><section className="tm-raised tm-login stack">
  <span className="tm-mark"><MapIcon/></span>
  <h1>{'From the generator'}</h1>
  {error&&<p role="alert">{error}</p>}
  {!error&&!data&&<p aria-live="polite">{'Waiting for the generator to finish drawing the cards…'}</p>}
  {data&&<SaveInto data={data} workspaces={workspaces}/>}
  {data&&<SendForNaming data={data}/>}
 </section></main>;
}

type Workspace={id:string;name:string;role:'admin'|'viewer'};
// Generator names like "Territory 4" are placeholders, not localities.
const toNaming=(data:Payload)=>data.territories.map(t=>({number:t.number,geometry:t.boundary,locality:t.name===`Territory ${t.number}`?'':t.name,points:t.landmarks}));

/** Owners: send the split territories to the congregation, who name each one and mark its junctions on one link. */
function SendForNaming({data}:{data:Payload}){
 const requests=useQuery({queryKey:['tm','help'],queryFn:api.helpRequests,retry:false});
 const open=(requests.data||[]).filter(r=>r.status!=='declined');
 const [request,setRequest]=React.useState(''),[busy,setBusy]=React.useState(false),[result,setResult]=React.useState(''),[failed,setFailed]=React.useState('');
 const [editable,setEditable]=React.useState(true);
 if(requests.isError)return null;
 const chosen=request||open.find(r=>data.congregation&&r.congregation_name.toLowerCase().includes(data.congregation.toLowerCase()))?.id||'';
 async function send(){
  setBusy(true);setFailed('');
  try{const r=await api.createNaming(chosen||null,data.congregation,toNaming(data),editable);
   setResult(r.emailed?`Sent. The congregation was emailed this link: ${r.link}`:`Naming link made: ${r.link}`);}
  catch(e){setFailed((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="stack tm-inset-box" aria-labelledby="send-naming">
  <h2 id="send-naming">{'Or send for naming'}</h2>
  <p className="muted">{'The congregation gets one link with all these territories: the outline and the landmarks on a street map, not the card. For each one they write the locality name, rename the landmarks and add notes, then submit. Pull their names into the generator from Requests.'}</p>
  <p className="muted">{'Landmarks on the naming link'}</p>
  <Segmented label={'Landmarks on the naming link'} value={editable?'edit':'rename'} options={[{value:'rename',label:'Rename only'},{value:'edit',label:'Rename, move, add, remove'}]} onChange={v=>setEditable(v==='edit')}/>
  <Combobox label={'Request'} value={chosen} options={[{value:'',label:'No request (just make the link)'},...open.map(r=>({value:r.id,label:r.congregation_name+' · '+r.contact_email}))]} onChange={setRequest}/>
  {result?<p role="status">{result}</p>:<Button busy={busy} onClick={()=>void send()}>{chosen?'Send naming link by email':'Make naming link'}</Button>}
  {failed&&<p role="alert" className="error">{failed}</p>}
 </section>;
}
// No silent fallback: saving overwrites territories by number, so a wrong default would overwrite another congregation.
const pick=(targets:{value:string;label:string}[],congregation:string)=>targets.find(t=>sameCongregation(t.label,congregation))?.value??(targets.length===1?targets[0].value:'');
const describe=(data:Payload)=>`${data.territories.length} territories${data.congregation?' for '+data.congregation:''}: number, name, map link${data.territories.some(t=>t.image)?', card image':''} and outline. Territories already in the workspace are updated by number; their notes and history stay.`;
function SaveButtons({disabled,busy,save}:{disabled:boolean;busy:boolean;save:(review:boolean)=>void}){
 return <div className="actions">
  <Button className="primary" disabled={disabled} busy={busy} onClick={()=>save(true)}><Send/>{'Save and send for review'}</Button>
  <Button disabled={disabled} onClick={()=>save(false)}>{'Save only'}</Button>
 </div>;
}
/** Where the territories can go: workspaces this account administers and, for owners, requests with no workspace yet
 * (made on save). Other admins get an error from the request list, so they see only their workspaces. */
function useTargets(workspaces:Workspace[]){
 const requests=useQuery({queryKey:['tm','save-targets'],retry:false,queryFn:async()=>{
  const [all,made]=await Promise.all([api.helpRequests(),api.requestWorkspaces()]);
  const linked=new Set(made.map(w=>w.request_id));
  return all.filter(r=>r.status!=='declined'&&!linked.has(r.id));
 }});
 const targets=[...workspaces.filter(w=>w.role==='admin').map(w=>({value:'w:'+w.id,label:w.name})),
  ...(requests.data??[]).map(r=>({value:'r:'+r.id,label:`${r.congregation_name} (new workspace for this request)`}))];
 return {targets,loading:requests.isLoading};
}
/** Saves the territories into the workspace (updated by number when already there), then sends them for review if asked. */
async function saveAll(id:string,data:Payload,review:boolean,setProgress:(m:string)=>void){
 const existing=new Map((await api.loadWorkspace(id)).territories.map(t=>[t.number,t]));
 for(const [i,t] of data.territories.entries()){
  setProgress(`Saving territory ${t.number} (${i+1} of ${data.territories.length})…`);
  const old=existing.get(t.number);
  await api.saveTerritory(id,{id:old?.id,number:t.number,name:t.name,notes:old?.notes??'',mapUrl:t.mapUrl,...(t.image?{image:t.image,thumb:t.thumb}:{})});
 }
 setProgress('Saving the outlines…');
 const r=await api.saveBoundaries(id,data.territories.map(t=>({number:t.number,boundary:t.boundary})));
 const note=`${data.territories.length} territories saved${data.territories.some(t=>t.image)?' with their cards':''} and ${r.matched} outlines.`;
 if(!review)return note;
 // With the outlines and landmarks, so the admin can also check each territory's name and landmarks.
 setProgress('Sending the cards for review…');
 await api.reviewNamingSet(id,toNaming(data));await api.reviewSend(id);
 return note+' The admin is emailed to check them.';
}
/** Saves every territory into the chosen workspace (updated by number when already there), then by default sends the cards
 * to its admin for review. A request without a workspace can be chosen too: its workspace is made on save. */
function SaveInto({data,workspaces}:{data:Payload;workspaces:Workspace[]}){
 const {targets,loading}=useTargets(workspaces);
 const [target,setTarget]=React.useState(''),[progress,setProgress]=React.useState(''),[done,setDone]=React.useState(''),[failed,setFailed]=React.useState(''),[ws,setWs]=React.useState('');
 const chosen=target||pick(targets,data.congregation);
 async function save(review:boolean){
  setFailed('');setDone('');
  try{
   const id=chosen.startsWith('r:')?(setProgress('Making the workspace…'),await api.workspaceForRequest(chosen.slice(2))):chosen.slice(2);
   setWs(id);
   setDone(await saveAll(id,data,review,setProgress));
   forget();
  }catch(e){setFailed((e as Error).message);}finally{setProgress('');}
 }
 if(!targets.length)return <p role="alert">{loading?'Finding your workspaces…':'You are not an admin of any workspace. Create the workspace first (Owner → Workspaces), then send again.'}</p>;
 const busy=Boolean(progress);
 return <>
  <p>{describe(data)}</p>
  <Combobox label={'Save into workspace'} value={chosen} options={[...(chosen?[]:[{value:'',label:'Choose a workspace'}]),...targets]} onChange={setTarget} disabled={busy||Boolean(done)}/>
  {done?<><p role="status"><Check aria-hidden="true"/>{done}</p><div className="actions"><a className="button primary" href={`?territory&ws=${encodeURIComponent(ws)}`}>{'Open the workspace'}</a></div></>
  :<SaveButtons disabled={!chosen||busy} busy={busy} save={review=>void save(review)}/>}
  {progress&&<p className="muted" aria-live="polite">{progress}</p>}
  {failed&&<p role="alert" className="error">{failed}</p>}
 </>;
}
