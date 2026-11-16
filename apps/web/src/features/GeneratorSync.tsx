// Receives finished territories from the territory generator (generator.congregationassistant.com) and saves them into
// a workspace: number, name, map link, card image and outline. Opened by the generator at ?territory&from-generator.
// Only the window that opened this page, on the generator's origin, can send; everything is checked before saving.
import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {z} from 'zod';
import {Check,Map as MapIcon} from 'lucide-react';
import {Button,Combobox,Segmented} from '../../../../packages/ui/components';
import * as api from './territory-api';
import {generatorUrl} from './territory-site';

const LOCAL_GENERATOR='http://localhost:5180',READY='tm-manager-ready',SYNC='tm-sync',PING_MS=1000,NAME_MAX=150,NUMBER_MAX=20,URL_MAX=500,IMAGE_MAX=1_500_000,THUMB_MAX=150_000,MAX_TERRITORIES=1000,LANDMARK_MAX=80,MAX_POINTS=12;
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
  // Generator names like "Territory 4" are placeholders, not localities.
  try{const r=await api.createNaming(chosen||null,data.congregation,data.territories.map(t=>({number:t.number,geometry:t.boundary,locality:t.name===`Territory ${t.number}`?'':t.name,points:t.landmarks})),editable);
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
/** Sends the saved cards to the workspace's admin, who checks them and comments or approves; they are emailed now. */
function SendReview({ws}:{ws:string}){
 const [sending,setSending]=React.useState(false),[sent,setSent]=React.useState(false),[note,setNote]=React.useState('');
 const send=async()=>{setSending(true);setNote('');try{await api.reviewSend(ws);setSent(true);setNote('The admin is emailed to check the cards.');}catch(e){setNote((e as Error).message);}finally{setSending(false);}};
 return <><Button busy={sending} disabled={sent} onClick={()=>void send()}>{sent?'Sent for review':'Send to the admin for review'}</Button>{note&&<p role="status">{note}</p>}</>;
}
/** Saves every territory into the chosen workspace, updated by number when it is already there. */
function SaveInto({data,workspaces}:{data:Payload;workspaces:Workspace[]}){
 const admin=workspaces.filter(w=>w.role==='admin');
 const guess=admin.find(w=>data.congregation&&w.name.toLowerCase().includes(data.congregation.toLowerCase()))?.id;
 const [ws,setWs]=React.useState(''),[progress,setProgress]=React.useState(''),[done,setDone]=React.useState(''),[failed,setFailed]=React.useState('');
 const chosen=ws||guess||admin[0]?.id||'';
 async function save(){
  setFailed('');setDone('');
  try{
   const existing=new Map((await api.loadWorkspace(chosen)).territories.map(t=>[t.number,t]));
   for(const [i,t] of data.territories.entries()){
    setProgress(`Saving territory ${t.number} (${i+1} of ${data.territories.length})…`);
    const old=existing.get(t.number);
    await api.saveTerritory(chosen,{id:old?.id,number:t.number,name:t.name,notes:old?.notes??'',mapUrl:t.mapUrl,...(t.image?{image:t.image,thumb:t.thumb}:{})});
   }
   setProgress('Saving the outlines…');
   const r=await api.saveBoundaries(chosen,data.territories.map(t=>({number:t.number,boundary:t.boundary})));
   setDone(`${data.territories.length} territories saved${data.territories.some(t=>t.image)?' with their cards':''} and ${r.matched} outlines.`);
   forget();
  }catch(e){setFailed((e as Error).message);}finally{setProgress('');}
 }
 if(!admin.length)return <p role="alert">{'You are not an admin of any workspace. Create the workspace first (Owner → Workspaces), then send again.'}</p>;
 return <>
  <p>{`${data.territories.length} territories${data.congregation?' for '+data.congregation:''}: number, name, map link${data.territories.some(t=>t.image)?', card image':''} and outline. Territories already in the workspace are updated by number; their notes and history stay.`}</p>
  <Combobox label={'Save into workspace'} value={chosen} options={admin.map(w=>({value:w.id,label:w.name}))} onChange={setWs}/>
  {done?<><p role="status"><Check aria-hidden="true"/>{done}</p><div className="actions"><a className="button primary" href={`?territory&ws=${encodeURIComponent(chosen)}`}>{'Open the workspace'}</a>
   <SendReview ws={chosen}/></div></>
  :<Button className="primary" disabled={!chosen} busy={Boolean(progress)} onClick={()=>void save()}>{'Save'}</Button>}
  {progress&&<p className="muted" aria-live="polite">{progress}</p>}
  {failed&&<p role="alert" className="error">{failed}</p>}
 </>;
}
