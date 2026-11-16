// Owner dashboard: territory-making requests from the public form, their boundary files, and the next step for each.
import React from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Copy,Download,ExternalLink,FileUp,Mail,Phone,Send,Wand2} from 'lucide-react';
import {Button,Chip,Combobox,Field,Segmented} from '../../../../packages/ui/components';
import * as api from './territory-api';
import {fromBase64,KIBIBYTE} from './request-files';
import {openInGenerator,openNamesInGenerator} from './generator-handoff';
import {MILESTONES} from './territory-model';

// -1 declines; the congregation is emailed when a request is accepted, declined or ready for use.
const STAGES=[...MILESTONES.map((label,i)=>({value:String(i),label:`${i+1}. ${label}`})),{value:'-1',label:'Declined'}];
const stageOf=(r:api.HelpRequest)=>r.status==='declined'?'-1':String(r.stage);

const STATUS:{value:api.HelpStatus;label:string;tone:'default'|'warn'|'ok'|'danger'}[]=[
 {value:'new',label:'New',tone:'warn'},{value:'in_progress',label:'In progress',tone:'default'},{value:'done',label:'Done',tone:'ok'},{value:'declined',label:'Declined',tone:'danger'}];
type Show=api.HelpStatus|'all';
const NOTE_MAX=2000,REF_LENGTH=8,REVOKE_MS=1000;
const when=(iso:string)=>new Date(iso).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
const kb=(n:number)=>n<KIBIBYTE*KIBIBYTE?`${Math.max(1,Math.round(n/KIBIBYTE))} KB`:`${(n/KIBIBYTE/KIBIBYTE).toFixed(1)} MB`;
/** The form puts the service and progress in brackets at the start of the details; show them as labels. */
function splitDetails(details:string){
 const tags:string[]=[];let rest=details;
 for(let m=/^\s*\[([^\]]{1,200})\]/.exec(rest);m;m=/^\s*\[([^\]]{1,200})\]/.exec(rest)){tags.push(m[1]??"");rest=rest.slice(m[0].length);}
 return {tags,text:rest.trim()};
}
function save(name:string,bytes:Uint8Array<ArrayBuffer>,kind:'kml'|'kmz'){
 const url=URL.createObjectURL(new Blob([bytes],{type:kind==='kmz'?'application/vnd.google-earth.kmz':'application/vnd.google-earth.kml+xml'}));
 const a=Object.assign(document.createElement('a'),{href:url,download:name});
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),REVOKE_MS);
}

export function TerritoryRequests({notify}:{notify:(m:string)=>void}){
 const list=useQuery({queryKey:['tm','help'],queryFn:api.helpRequests});
 const namings=useQuery({queryKey:['tm','naming'],queryFn:api.namingList,retry:false});
 const reviews=useQuery({queryKey:['tm','request-ws'],queryFn:api.requestWorkspaces,retry:false});
 const [show,setShow]=React.useState<Show>('new');
 const rows=list.data||[];
 const count=(s:Show)=>s==='all'?rows.length:rows.filter(r=>r.status===s).length;
 const options=[...STATUS.map(s=>({value:s.value,label:`${s.label} (${count(s.value)})`})),{value:'all',label:`All (${rows.length})`}];
 const shown=show==='all'?rows:rows.filter(r=>r.status===show);
 if(list.error)return <section className="tm-raised stack"><h2>{'Requests'}</h2><p role="alert">{/PGRST202|could not find/i.test((list.error as Error).message)?'Requests with files turn on after the 2026-11-14 database update is run.':(list.error as Error).message}</p><Button onClick={()=>void list.refetch()}>{'Retry'}</Button></section>;
 return <section className="stack">
  <div className="tm-section-head"><h2>{'Requests'}</h2><Button onClick={()=>void list.refetch()} busy={list.isFetching}>{'Refresh'}</Button></div>
  <Segmented label={'Show requests'} value={show} options={options} onChange={v=>setShow(options.some(o=>o.value===v)?v as Show:'new')}/>
  {list.isLoading&&<p className="muted">{'Loading requests…'}</p>}
  {!list.isLoading&&!shown.length&&<p className="muted">{show==='new'?'No new requests.':'Nothing here.'}</p>}
  {shown.map(r=><RequestCard key={r.id} r={r} notify={notify} naming={namings.data?.find(n=>n.request_id===r.id)} review={reviews.isError?undefined:reviews.data?.find(w=>w.request_id===r.id)??null}/>)}
 </section>;
}

function RequestCard({r,notify,naming,review}:{r:api.HelpRequest;notify:(m:string)=>void;naming?:api.NamingSummary;review?:api.RequestWorkspace|null}){
 const qc=useQueryClient();
 const [stage,setStage]=React.useState(stageOf(r)),[note,setNote]=React.useState(r.owner_note||''),[busy,setBusy]=React.useState(''),[error,setError]=React.useState('');
 React.useEffect(()=>{setStage(stageOf(r));setNote(r.owner_note||'');},[r]);
 const {tags,text}=splitDetails(r.details);
 const tone=STATUS.find(s=>s.value===r.status)!;
 const moved=stage!==stageOf(r),dirty=moved||note.trim()!==(r.owner_note||'');
 async function run(key:string,fn:()=>Promise<void>){
  setBusy(key);setError('');
  try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 const update=()=>run('save',async()=>{
  if(moved)await api.setHelpStage(r.id,+stage);
  if(note.trim()!==(r.owner_note||''))await api.setHelpRequest(r.id,(await api.helpRequests()).find(x=>x.id===r.id)?.status??r.status,note);
  await qc.invalidateQueries({queryKey:['tm','help']});
  notify(moved&&['-1','1','4'].includes(stage)?'Request updated. The congregation will get an email.':'Request updated.');
 });
 const copyTrack=()=>{if(r.track_token)void navigator.clipboard.writeText(api.trackLink(r.track_token)).then(()=>notify('Tracking link copied.'),()=>notify('Copy failed.'));};
 const download=(f:api.HelpRequest['files'][number])=>run('dl'+f.id,async()=>{const got=await api.helpRequestFile(f.id);save(got.name,fromBase64(got.data),got.kind);});
 const generate=(f:api.HelpRequest['files'][number])=>run('gen'+f.id,async()=>{
  await openInGenerator(async()=>{const got=await api.helpRequestFile(f.id);return {name:got.name,congregation:got.congregation,bytes:fromBase64(got.data)};});
  // Opening the boundary is the start of the work.
  if(r.status==='new'){await api.setHelpRequest(r.id,'in_progress',null);await qc.invalidateQueries({queryKey:['tm','help']});}
  notify(`${f.name} opened in the generator.`);
 });
 return <article className="tm-raised stack tm-request">
  <header className="tm-request-head">
   <div><h3>{r.congregation_name}</h3><small className="muted">{when(r.created_at)}{' · ref '}{r.id.slice(0,REF_LENGTH)}</small></div>
   <Chip tone={tone.tone}>{tone.label}</Chip>
  </header>
  <p className="tm-request-contact"><strong>{r.contact_name}</strong>
   <a href={`mailto:${encodeURIComponent(r.contact_email)}?subject=${encodeURIComponent(`Territories for ${r.congregation_name}`)}`}><Mail aria-hidden="true"/>{r.contact_email}</a>
   {r.phone&&<a href={`tel:${r.phone.replace(/[^\d+]/g,'')}`}><Phone aria-hidden="true"/>{r.phone}</a>}</p>
  {tags.length>0&&<p className="tm-chips">{tags.map(t=><Chip key={t} tone="default">{t}</Chip>)}</p>}
  {text&&<p className="tm-request-details">{text}</p>}
  {r.files.length>0?<ul className="tm-request-files" aria-label={'Boundary files'}>{r.files.map(f=><li key={f.id}>
   <FileUp aria-hidden="true"/><span>{f.name}</span><small className="muted">{kb(f.size)}</small>
   <Button busy={busy==='gen'+f.id} disabled={!!busy} onClick={()=>void generate(f)}><Wand2/>{'Open in generator'}</Button>
   <Button busy={busy==='dl'+f.id} disabled={!!busy} onClick={()=>void download(f)} aria-label={`Download ${f.name}`}><Download/></Button>
  </li>)}</ul>:<p className="muted">{'No boundary file attached.'}</p>}
  {naming&&<NamingRow naming={naming} notify={notify}/>}
  <ReviewRow request={r.id} status={r.status} review={review} notify={notify}/>
  <div className="tm-request-edit">
   <Combobox label={'Milestone'} value={stage} options={STAGES} onChange={v=>setStage(STAGES.some(s=>s.value===v)?v:'0')}/>
   <Field label={'Private note'} hint={'Only owners see this.'}>{p=><textarea {...p} rows={2} maxLength={NOTE_MAX} value={note} onChange={e=>setNote(e.target.value)}/>}</Field>
  </div>
  {error&&<p role="alert" className="error">{error}</p>}
  <p className="muted">{'Moving to Accepted, Ready for use or Declined emails the congregation once, with their tracking link.'}</p>
  <div className="actions"><Button className="primary" disabled={!dirty||!!busy} busy={busy==='save'} onClick={()=>void update()}>{'Save'}</Button>{r.track_token&&<Button onClick={copyTrack}><Copy/>{'Copy tracking link'}</Button>}</div>
 </article>;
}

/** How far the congregation has got with naming, its link, and the names sent straight to the generator. */
function NamingRow({naming,notify}:{naming:api.NamingSummary;notify:(m:string)=>void}){
 const [busy,setBusy]=React.useState(false),[editable,setEditable]=React.useState(naming.landmarks_editable);
 const qc=useQueryClient();
 const toggle=(on:boolean)=>{setEditable(on);api.setNamingLandmarks(naming.id,on).then(()=>{notify(on?'They can now move, add and remove landmarks.':'Landmarks locked: they can only rename them.');void qc.invalidateQueries({queryKey:['tm','naming']});},
  (e:Error)=>{setEditable(!on);notify(e.message);});};
 const toGenerator=async()=>{setBusy(true);try{
  await openNamesInGenerator(async()=>({congregation:naming.congregation,names:(await api.namingResults(naming.id)).filter(e=>e.locality.trim()||e.points.length)}));
  notify('Names opened in the generator.');
 }catch(e){notify((e as Error).message);}finally{setBusy(false);}};
 return <div className="tm-inset-box stack">
  <p><strong>{`Names: ${naming.submitted} of ${naming.total} submitted`}</strong></p>
  <progress max={naming.total} value={naming.submitted} aria-label={'Territories named'}/>
  <p className="muted">{'Landmarks on the naming link'}</p>
  <Segmented label={'Landmarks on the naming link'} value={editable?'edit':'rename'} options={[{value:'rename',label:'Rename only'},{value:'edit',label:'Rename, move, add, remove'}]} onChange={v=>toggle(v==='edit')}/>
  <div className="actions"><Button busy={busy} onClick={()=>void toGenerator()}><Wand2/>{'Open names in generator'}</Button>
   <Button onClick={()=>void navigator.clipboard.writeText(api.namingLink(naming.token)).then(()=>notify('Naming link copied.'),()=>notify('Copy failed.'))}><Copy/>{'Copy naming link'}</Button></div>
 </div>;
}

const REVIEW_TEXT:Record<api.RequestWorkspace['review_state'],string>={none:'Cards not sent for review yet',review:'Waiting for the admin to check the cards',changes:'The admin asked for changes',approved:'Cards approved'};
/** The request's workspace: send its cards for review, see the admin's answer, and upload the full map. */
function ReviewRow({request,status,review,notify}:{request:string;status:string;review?:api.RequestWorkspace|null;notify:(m:string)=>void}){
 const run=useRun(notify);
 // Not before the request is accepted; undefined means the review update is not on the server yet.
 if(review===undefined||status==='new'||status==='declined')return null;
 if(!review)return <div className="tm-inset-box stack"><p>{'No workspace yet for this request.'}</p>
  <div className="actions"><Button busy={run.busy==='make'} onClick={()=>void run.go('make',()=>api.workspaceForRequest(request),'Workspace made. Its admin is the contact email.')}>{'Make its workspace'}</Button></div></div>;
 const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
 const resend=review.review_state==='none'||review.review_state==='changes';
 return <div className="tm-inset-box stack">
  <p><strong>{REVIEW_TEXT[review.review_state]}</strong>{review.review_round>1?` · round ${review.review_round}`:''}</p>
  <p className="muted">{plural(review.cards,'card')+' in the workspace'+(review.comments?` · ${plural(review.comments,'comment')} to fix (also emailed to you)`:'')}</p>
  <div className="actions">
   <a className="button" href={`?territory&ws=${encodeURIComponent(review.id)}`}><ExternalLink/>{'Open the workspace'}</a>
   {resend&&<Button className="primary" busy={run.busy==='send'} disabled={!review.cards} onClick={()=>void run.go('send',()=>api.reviewSend(review.id),'Cards sent. The admin is emailed to check them.')}><Send/>{review.review_round?'Send corrected cards':'Send cards for review'}</Button>}
  </div>
  {review.review_state==='approved'&&<MapUpload review={review} run={run}/>}
 </div>;
}
/** Runs one owner action at a time, then refreshes the request list. */
function useRun(notify:(m:string)=>void){
 const qc=useQueryClient(),[busy,setBusy]=React.useState('');
 const go=async(kind:string,fn:()=>Promise<unknown>,done:string)=>{setBusy(kind);try{await fn();notify(done);await qc.invalidateQueries({queryKey:['tm','request-ws']});await qc.invalidateQueries({queryKey:['tm','help']});}catch(e){notify((e as Error).message);}finally{setBusy('');}};
 return {busy,go};
}
function MapUpload({review,run}:{review:api.RequestWorkspace;run:ReturnType<typeof useRun>}){
 const upload=(file?:File)=>{if(file)void run.go('map',()=>api.setFullMap(review.id,file),'Full map uploaded. The admin is emailed and the request is ready for use.');};
 return <>
  <Field label={review.full_map_at?`Full map: ${review.full_map_name} (replace)`:'Upload the full map'} hint={'PDF, PNG or JPEG, up to 50 MB. The admin is emailed and the request becomes Ready for use.'}>
   {p=><input {...p} type="file" accept="application/pdf,image/png,image/jpeg" disabled={run.busy==='map'} onChange={e=>upload(e.target.files?.[0])}/>}</Field>
  {run.busy==='map'&&<p className="muted" aria-live="polite">{'Uploading the full map…'}</p>}
 </>;
}
