// The congregation admin's side of a territory request: check every card (comment, then send comments or approve all),
// follow the milestones, then download every card (one PDF, or JPEG/PNG images in a ZIP file) and the full map.
// While the cards are in review the workspace opens on this screen; once approved it is used as normal.
import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {Check,CheckCheck,Download,FileText,FolderOpen,Map as MapIcon,MapPin,Send} from 'lucide-react';
import {Button,Chip,Field} from '../../../../packages/ui/components';
import {Dialog} from '../../../../packages/ui/Dialog';
import * as api from './territory-api';
import {byNumber,MILESTONES,type Territory,type WorkspaceData} from './territory-model';
import {download} from './territory-card';
import {CardPlaceholder} from './CardSketch';
import {demo} from './client';
import {SuggestDialog,useReviewNaming} from './ReviewNaming';
import {changedSinceComment,checkedCard,milestoneState,plural,progressNote,reviewer,reviewIntro,safeFileName} from './territory-review-model';

type Ctx={d:WorkspaceData;ws:string;refresh:()=>Promise<unknown>|void;notify:(m:string)=>void};
const JPEG_Q=0.92,PDF_DPI=200,PT_PER_IN=72,NAME_MAX=60;
const LAST_STAGE=MILESTONES.length-1;
// Card bodies left-align their items; the comment box takes the full width (set here: the stylesheet is at its size budget).
const stretch=(el:HTMLElement|null)=>{el?.style.setProperty('justify-self','stretch');el?.style.setProperty('inline-size','100%');};

/** The request's milestones, as on the public tracking page. */
function Progress({d}:{d:WorkspaceData}){
 const stage=d.workspace.stage;
 if(stage===null)return null;
 const state=(i:number)=>milestoneState(i,stage);
 return <section className="tm-raised stack" aria-labelledby="tm-progress">
  <h2 id="tm-progress">{'Progress'}</h2>
  <ol className="tm-track" aria-label={'Milestones'}>{MILESTONES.map((m,i)=><li key={m} className={state(i)} aria-current={state(i)==='now'?'step':undefined}>
   <span className="tm-track-dot" aria-hidden="true">{state(i)==='done'?<Check/>:i+1}</span><span>{m}</span></li>)}</ol>
  <p className="muted">{progressNote(stage,d.workspace.review_state)}</p>
 </section>;
}

/** Cards in review: every card with its comment; the admin sends comments or approves all. */
export function ReviewScreen({d,ws,refresh,notify,owner}:Ctx&{owner:boolean}){
 // Owners count as admins on the server; here they only look, so the congregation's admin decides.
 const who=reviewer(d.role,owner),admin=who==='admin',open=d.workspace.review_state==='review';
 // The demo's sample cards have no images; their sketches stand in.
 const cards=[...d.territories].filter(t=>t.has_image||demo).sort(byNumber);
 const comments=cards.filter(t=>t.review_comment).length,checked=cards.filter(checkedCard).length;
 const intro=reviewIntro(who,cards.length);
 const [busy,setBusy]=React.useState(''),[confirm,setConfirm]=React.useState(false),[view,setView]=React.useState<Territory|null>(null),[naming,setNaming]=React.useState('');
 // Names and landmarks, when the cards were sent with their outlines: only the admin, only while in review.
 const named=useReviewNaming(ws,open&&admin).data;
 const act=async(kind:string,fn:()=>Promise<void>,done:string)=>{setBusy(kind);try{await fn();notify(done);await refresh();}catch(e){notify((e as Error).message);}finally{setBusy('');setConfirm(false);}};
 return <div className="stack">
  <div className="tm-heading"><h1>{'Check your territory cards'}</h1></div>
  <Progress d={d}/>
  <section className="tm-raised stack">
   {open&&cards.length>0&&<><p><strong>{`${checked} of ${plural(cards.length,'card')} checked`}</strong></p><progress max={cards.length} value={checked} aria-label={'Cards checked'}/></>}
   {open?<p>{intro}</p>
    :<p role="status">{`Thank you. We have your ${plural(comments,'comment')} and are correcting the cards. We will email you when they are ready to check again.`}</p>}
   {open&&admin&&<div className="actions">
    <Button busy={busy==='send'} disabled={!comments||Boolean(busy)} onClick={()=>void act('send',()=>api.reviewSubmit(ws),'Comments sent. We will email you when the cards are corrected.')}><Send/>{`Send comments (${comments})`}</Button>
    <Button className="primary" disabled={Boolean(busy)} onClick={()=>setConfirm(true)}><CheckCheck/>{'Approve all cards'}</Button>
   </div>}
  </section>
  <div className="tm-grid">{cards.map(t=><ReviewCard key={t.id+(t.review_ok_at??'')} t={t} editable={open&&admin} onView={()=>setView(t)} notify={notify} refresh={refresh}
   named={named?.naming.entries.find(e=>e.number===t.number)} onName={named?()=>setNaming(t.number):undefined}/>)}</div>
  {confirm&&<ApproveDialog comments={comments} cards={cards.length} busy={busy==='approve'} onCancel={()=>setConfirm(false)} onApprove={()=>void act('approve',()=>api.reviewApprove(ws),'All cards approved. Thank you!')}/>}
  {view&&<CardView t={view} onClose={()=>setView(null)}/>}
  {naming&&<SuggestDialog ws={ws} number={naming} onClose={()=>setNaming('')}/>}
 </div>;
}

function ApproveDialog({comments,cards,busy,onCancel,onApprove}:{comments:number;cards:number;busy:boolean;onCancel:()=>void;onApprove:()=>void}){
 return <Dialog open onClose={onCancel} title={'Approve all cards?'}><div className="tm-dialog stack">
  <p>{comments?`You still have ${plural(comments,'comment')}. Approving clears them and finalises all ${cards} cards.`:`This finalises all ${cards} cards. Next, we make the full map.`}</p>
  <div className="actions"><Button onClick={onCancel}>{'Cancel'}</Button>
   <Button className="primary" busy={busy} onClick={onApprove}><CheckCheck/>{'Approve all cards'}</Button></div>
 </div></Dialog>;
}

type CardProps={t:Territory;editable:boolean;onView:()=>void;notify:(m:string)=>void;refresh:Ctx['refresh'];named?:api.NamingEntry;onName?:()=>void};
function ReviewCard({t,editable,onView,notify,refresh,named,onName}:CardProps){
 const [text,setText]=React.useState(t.review_comment),[saved,setSaved]=React.useState(t.review_comment);
 const changed=changedSinceComment(t);
 // The card itself: its thumbnail, or the full card when no thumbnail was saved.
 const full=useQuery({queryKey:['tm','image',t.id,t.updated_at],enabled:!t.thumb&&t.has_image,queryFn:()=>api.territoryImage(t.id)});
 const src=t.thumb||full.data;
 const save=async()=>{if(text.trim()===saved.trim())return;try{await api.reviewComment(t.id,text);setSaved(text);await refresh();}catch(e){notify((e as Error).message);}};
 return <article className="tm-raised tm-card">
  <button type="button" className="tm-thumb" onClick={onView} aria-label={`See card ${t.number} full size`}>
   {src?<img src={src} alt={`Territory card ${t.number}`} width={480} height={320} loading="lazy" decoding="async"/>:<CardPlaceholder number={t.number}/>}<span className="tm-number">{t.number}</span></button>
  <span className="tm-card-body stack"><strong>{t.name}</strong>
   {changed&&<Chip tone="ok">{'Changed since your comment'}</Chip>}
   <Tick t={t} editable={editable} notify={notify} refresh={refresh}/>
   {editable?<div ref={stretch}><Field label={'Comment (optional)'}>{p=><textarea {...p} ref={stretch} className="tm-inset" rows={2} maxLength={1000} placeholder={'What should change on this card?'}
     value={text} onChange={e=>setText(e.target.value)} onBlur={()=>void save()}/>}</Field></div>
    :t.review_comment&&<p><small className="muted">{'Your comment: '}</small>{t.review_comment}</p>}
   {onName&&<Naming named={named} onName={onName}/>}
  </span>
 </article>;
}

/** The admin's tick: this card is right. A tick clears the card's comment; a comment clears the tick. */
function Tick({t,editable,notify,refresh}:Pick<CardProps,'t'|'editable'|'notify'|'refresh'>){
 const ok=checkedCard(t),[busy,setBusy]=React.useState(false);
 if(!editable)return ok?<Chip tone="ok">{'Checked'}</Chip>:null;
 const toggle=async()=>{setBusy(true);try{await api.reviewMark(t.id,!ok);await refresh();}catch(e){notify((e as Error).message);}finally{setBusy(false);}};
 return <Button className={ok?'primary':undefined} busy={busy} aria-pressed={ok} onClick={()=>void toggle()}><Check/>{ok?'Checked':'Mark as right'}</Button>;
}
/** What the admin suggested for the territory's name, and the button to the map. */
function Naming({named,onName}:{named?:api.NamingEntry;onName:()=>void}){
 return <>{named?.submitted&&<p><small className="muted">{'Name you gave: '}</small>{named.locality}{named.points.length>0&&<small className="muted">{` · ${plural(named.points.length,'landmark')}`}</small>}</p>}
  <Button onClick={onName}><MapPin/>{named?.submitted?'Change name and landmarks':'Check name and landmarks'}</Button></>;
}

function CardView({t,onClose}:{t:Territory;onClose:()=>void}){
 const image=useQuery({queryKey:['tm','image',t.id,t.updated_at],queryFn:()=>api.territoryImage(t.id)});
 return <Dialog open onClose={onClose} title={`Card ${t.number} · ${t.name}`}><div className="tm-dialog">
  {image.data?<img src={image.data} alt={`Territory card ${t.number}, ${t.name}`} width={1600} height={1067}/>:<p className="muted">{image.isLoading?'Loading the card…':'This card has no image.'}</p>}
 </div></Dialog>;
}

/** A card image (data URL) as JPEG or PNG bytes, with its size in pixels. */
async function encode(src:string,type:'image/jpeg'|'image/png'){
 const img=new Image();img.src=src;await img.decode();
 const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
 const g=c.getContext('2d')!;if(type==='image/jpeg'){g.fillStyle='white';g.fillRect(0,0,c.width,c.height);}g.drawImage(img,0,0);
 const blob=await new Promise<Blob|null>(done=>c.toBlob(done,type,JPEG_Q));
 if(!blob)throw Error('This browser could not convert the card image.');
 return {bytes:new Uint8Array(await blob.arrayBuffer()),w:c.width,h:c.height};
}
const fileName=(text:string)=>safeFileName(text,NAME_MAX);

/** Every card at once: one PDF (one card per page) or the images in a ZIP file. */
function CardDownloads({d,notify}:{d:WorkspaceData;notify:(m:string)=>void}){
 // The demo's sample cards have no images; their sketches stand in.
 const cards=[...d.territories].filter(t=>t.has_image||demo).sort(byNumber);
 const [progress,setProgress]=React.useState('');
 if(!cards.length)return null;
 const base=fileName(d.workspace.name);
 const each=async(type:'image/jpeg'|'image/png')=>{
  const out:{t:Territory;bytes:Uint8Array;w:number;h:number}[]=[];
  for(const [i,t] of cards.entries()){
   setProgress(`Preparing card ${i+1} of ${cards.length}…`);
   const src=await api.territoryImage(t.id);
   if(src)out.push({t,...await encode(src,type)});
  }
  return out;
 };
 const run=async(kind:'pdf'|'jpg'|'png')=>{try{let saved=0;
  if(kind==='pdf'){
   const [{PDFDocument},items]=await Promise.all([import('pdf-lib'),each('image/jpeg')]);saved=items.length;
   if(!saved)throw Error('No card images were found.');
   setProgress('Making the PDF…');
   const pdf=await PDFDocument.create();pdf.setTitle(`${d.workspace.name} territory cards`);
   for(const x of items){const img=await pdf.embedJpg(x.bytes),w=x.w/PDF_DPI*PT_PER_IN,h=x.h/PDF_DPI*PT_PER_IN;pdf.addPage([w,h]).drawImage(img,{x:0,y:0,width:w,height:h});}
   download(new Blob([(await pdf.save()).slice()],{type:'application/pdf'}),`${base}-territory-cards.pdf`);
  }else{
   const type=kind==='jpg'?'image/jpeg':'image/png';
   const [{zipSync},items]=await Promise.all([import('fflate'),each(type)]);saved=items.length;
   if(!saved)throw Error('No card images were found.');
   setProgress('Making the ZIP file…');
   const files=Object.fromEntries(items.map(x=>[`${fileName(`territory-${x.t.number}-${x.t.name}`)}.${kind}`,x.bytes]));
   download(new Blob([new Uint8Array(zipSync(files,{level:0}))],{type:'application/zip'}),`${base}-territory-cards-${kind}.zip`);
  }
  notify(`${plural(saved,'card')} downloaded.`);
 }catch(e){notify((e as Error).message);}finally{setProgress('');}};
 return <section className="tm-raised stack" aria-labelledby="tm-all-cards">
  <h2 id="tm-all-cards">{'Download all cards'}</h2>
  <p className="muted">{`All ${cards.length} Territory Map Cards, ready to print or share.`}</p>
  <div className="actions">
   <Button className="primary" disabled={Boolean(progress)} onClick={()=>void run('pdf')}><FileText/>{'One PDF'}</Button>
   <Button disabled={Boolean(progress)} onClick={()=>void run('jpg')}><Download/>{'JPEG images (ZIP)'}</Button>
   <Button disabled={Boolean(progress)} onClick={()=>void run('png')}><Download/>{'PNG images (ZIP)'}</Button>
  </div>
  {progress&&<p className="muted" aria-live="polite">{progress}</p>}
 </section>;
}

/** Dashboard panels for a request's workspace: milestones until ready, the full map, and every card at once. */
export function ReadyPanels({d,notify}:{d:WorkspaceData;notify:(m:string)=>void}){
 const stage=d.workspace.stage;
 return <>{stage!==null&&stage<LAST_STAGE&&<Progress d={d}/>}<FullMap d={d}/><CardDownloads d={d} notify={notify}/></>;
}

/** The full map and the congregation's Google Drive folder (cards, boundary, guide), once we share them. */
function FullMap({d}:{d:WorkspaceData}){
 const {full_map_url:map,drive_url:folder,full_map_at:at,review_state:state}=d.workspace;
 if(!map&&!folder&&state!=='approved')return null;
 return <section className="tm-raised stack" aria-labelledby="tm-full-map">
  <h2 id="tm-full-map">{'Full map and files'}</h2>
  <p className="muted">{map&&at?`The full map is ready since ${new Date(at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}.`:'We are making the full map of every territory. We will email you when it is ready.'}</p>
  <div className="actions">
   {map&&<a className="button primary" href={map} target="_blank" rel="noopener noreferrer"><MapIcon/>{'Open the full map'}</a>}
   {folder&&<a className="button" href={folder} target="_blank" rel="noopener noreferrer"><FolderOpen/>{'Open all files in Google Drive'}</a>}
  </div>
 </section>;
}
