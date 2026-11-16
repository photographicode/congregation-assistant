// ?territory-names#token=… : the congregation names each split territory and marks its junctions or landmarks.
// One territory at a time; drafts save as they type (on the server and on this device); Submit marks it done.
// The page hides itself when the window is not in use or a screenshot key is pressed, and does not print.
// Browsers cannot stop every screenshot (a phone's own buttons or a camera still work), so this only discourages it.
import React from 'react';
import {Check,MapPin,Trash2} from 'lucide-react';
import {Button,Field,Skeleton} from '../../../../packages/ui/components';
import * as api from './territory-api';
import {useTerritoryTheme} from './territory-prefs';
import {fit,H,latOf,lngOf,path,px,py,TILE,W,type Geometry} from './naming-map';
import './territory.css';

const MAX_POINTS=12,SAVE_MS=1200,SHIELD_MS=3000,DIGITS=6;
const PIN_R=11,PIN_TEXT_DY=4,KEY_CHARS=12,LABEL_DX=PIN_R+PIN_TEXT_DY,LABEL_HALO=3;
/** Street map tiles with the territory outlined (others faint) and the named places. Tap to add a place, unless onAdd is left out. */
function NamingMap({g,others,points,onAdd}:{g:Geometry;others:Geometry[];points:api.NamingPoint[];onAdd?:(p:api.NamingPoint)=>void}){
 const v=React.useMemo(()=>fit(g),[g]);
 const tiles:{x:number;y:number}[]=[];
 for(let x=Math.floor(v.x0/TILE);x<=Math.floor((v.x0+W)/TILE);x++)for(let y=Math.floor(v.y0/TILE);y<=Math.floor((v.y0+H)/TILE);y++)tiles.push({x,y});
 const add=(e:React.MouseEvent<SVGSVGElement>)=>{
  if(!onAdd||points.length>=MAX_POINTS)return;
  const box=e.currentTarget.getBoundingClientRect();
  const x=v.x0+(e.clientX-box.left)/box.width*W,y=v.y0+(e.clientY-box.top)/box.height*H;
  onAdd({name:'',lng:+lngOf(x,v.z).toFixed(DIGITS),lat:+latOf(y,v.z).toFixed(DIGITS)});
 };
 return <div className="nm-map">
  <svg viewBox={`0 0 ${W} ${H}`} onClick={add} role="img" aria-label={onAdd?'Territory map. Tap to mark a junction or landmark.':'Territory map with its marked junctions and landmarks.'}>
   {tiles.map(t=><image key={`${t.x}-${t.y}`} href={`https://tile.openstreetmap.org/${v.z}/${t.x}/${t.y}.png`} x={t.x*TILE-v.x0} y={t.y*TILE-v.y0} width={TILE} height={TILE}/>)}
   {others.map((o,i)=><path key={i} d={path(o,v)} className="nm-other"/>)}
   <path d={path(g,v)} className="nm-this"/>
   {points.map((p,i)=><g key={i} transform={`translate(${px(p.lng,v.z)-v.x0},${py(p.lat,v.z)-v.y0})`}><circle r={PIN_R} className="nm-pin"/><text dy={PIN_TEXT_DY} textAnchor="middle">{i+1}</text>
    {p.name.trim()&&<text x={LABEL_DX} dy={PIN_TEXT_DY} fill="rgb(31 41 55)" stroke="rgb(255 255 255)" strokeWidth={LABEL_HALO} paintOrder="stroke" fontSize={13} fontWeight={700}>{p.name}</text>}</g>)}
  </svg>
  <span className="nm-credit">{'Map data: OpenStreetMap contributors'}</span>
 </div>;
}

/** Hides the page when the window loses focus, a screenshot key is pressed, or it is printed. */
function useShield(){
 const [hidden,setHidden]=React.useState(false);
 React.useEffect(()=>{
  let timer=0;
  const hide=(ms=0)=>{setHidden(true);clearTimeout(timer);if(ms)timer=window.setTimeout(()=>setHidden(false),ms);};
  const key=(e:KeyboardEvent)=>{
   const shot=e.key==='PrintScreen'||(e.metaKey&&e.shiftKey&&['3','4','5','s','S'].includes(e.key))||(e.shiftKey&&(e.key==='s'||e.key==='S')&&e.getModifierState('OS'));
   if(!shot)return;
   hide(SHIELD_MS);
   void navigator.clipboard?.writeText('').catch(()=>undefined);
  };
  const blur=()=>hide();const focus=()=>setHidden(false);
  const visible=()=>document.visibilityState==='visible'?setHidden(false):hide();
  addEventListener('keydown',key);addEventListener('keyup',key);addEventListener('blur',blur);addEventListener('focus',focus);document.addEventListener('visibilitychange',visible);
  return()=>{clearTimeout(timer);removeEventListener('keydown',key);removeEventListener('keyup',key);removeEventListener('blur',blur);removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visible);};
 },[]);
 return hidden;
}

const draftKey=(token:string,n:string)=>`tm-naming:${token.slice(0,KEY_CHARS)}:${n}`;
const chipState=(e?:api.NamingEntry)=>{if(e?.submitted)return 'done';return e?.locality?'draft':'';};
const chipClass=(e:api.NamingEntry|undefined,on:boolean)=>chipState(e)+(on?' on':'');
/** Nothing written yet: start from the card's current locality and landmarks. */
const blank=(t:api.Naming['territories'][number]):api.NamingEntry=>({number:t.number,locality:t.locality,points:t.points,note:'',submitted:false});

export function TerritoryNaming(){
 useTerritoryTheme();
 const token=new URLSearchParams(location.hash.slice(1)).get('token')||'';
 const [data,setData]=React.useState<api.Naming|null>(null),[error,setError]=React.useState('');
 const [entries,setEntries]=React.useState<Record<string,api.NamingEntry>>({}),[current,setCurrent]=React.useState('');
 const hidden=useShield();
 React.useEffect(()=>{document.title='Name your territories · Congregation Assistant';api.namingGet(token).then(d=>{
  const byNumber:Record<string,api.NamingEntry>={};
  for(const t of d.territories){
   const saved=d.entries.find(e=>e.number===t.number)??blank(t);
   // A newer draft on this device (for example typed while offline) wins over the saved one.
   let local:api.NamingEntry|null=null;try{local=JSON.parse(localStorage.getItem(draftKey(token,t.number))||'null') as api.NamingEntry|null;}catch{/* no draft */}
   const e=local&&!saved.submitted?{...local,submitted:false}:saved;
   // Landmarks locked by the owner (perhaps after this was written): the card's places, keeping any names given to them.
   byNumber[t.number]=d.landmarks_editable?e:{...e,points:t.points.map((p,i)=>({...p,name:e.points[i]?.name.trim()?e.points[i]!.name:p.name}))};
  }
  setEntries(byNumber);setData(d);setCurrent(d.territories.find(t=>!byNumber[t.number]?.submitted)?.number??d.territories[0]?.number??'');
 }).catch(e=>setError((e as Error).message));},[token]);
 if(error)return <main className="tm tm-center"><section className="tm-raised tm-login stack"><h1>{'Name your territories'}</h1><p role="alert">{error}</p></section></main>;
 if(!data)return <main className="tm tm-center"><Skeleton label={'Opening your territories…'}/></main>;
 const done=data.territories.filter(t=>entries[t.number]?.submitted).length;
 const t=data.territories.find(x=>x.number===current)??data.territories[0]!;
 const next=()=>data.territories.find(x=>!entries[x.number]?.submitted&&x.number!==t.number)?.number;
 return <main className={'tm nm'+(hidden?' nm-hidden':'')}>
  {hidden&&<div className="nm-shield" role="status">{'Hidden while this window is not in use. Click here to continue.'}</div>}
  <header className="tm-raised stack">
   <p className="muted">{data.congregation}</p>
   <h1>{'Name your territories'}</h1>
   <p>{data.landmarks_editable?'For each territory, write the locality name people use, tap the map to mark the main junctions or landmarks, add a note if needed, then press Submit. Everything saves as you type.'
    :'For each territory, write the locality name people use, check the names of the marked junctions or landmarks, add a note if needed, then press Submit. Everything saves as you type.'}</p>
   <div className="rf-progress-text"><strong>{done===data.territories.length?'All territories submitted. Thank you!':`${done} of ${data.territories.length} submitted`}</strong></div>
   <progress max={data.territories.length} value={done} aria-label={'Territories submitted'}/>
   <nav className="nm-list" aria-label={'Territories'}>{data.territories.map(x=>{const e=entries[x.number];return <button key={x.number} type="button" aria-current={x.number===t.number?'true':undefined}
    className={chipClass(e,x.number===t.number)} onClick={()=>setCurrent(x.number)} title={e?.locality||''}>{e?.submitted&&<Check aria-hidden="true"/>}{x.number}</button>;})}</nav>
  </header>
  <Editor key={t.number} token={token} territory={t} editable={data.landmarks_editable} others={data.territories.filter(x=>x.number!==t.number).map(x=>x.geometry)} entry={entries[t.number]??blank(t)}
   onChange={e=>setEntries(all=>({...all,[e.number]:e}))} onSubmitted={()=>{const n=next();if(n)setCurrent(n);}}/>
 </main>;
}

function Editor({token,territory,editable,others,entry,onChange,onSubmitted}:{token:string;territory:api.Naming['territories'][number];editable:boolean;others:Geometry[];entry:api.NamingEntry;onChange:(e:api.NamingEntry)=>void;onSubmitted:()=>void}){
 const [status,setStatus]=React.useState(entry.submitted?'Submitted':''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const first=React.useRef(true);
 const set=(patch:Partial<api.NamingEntry>)=>onChange({...entry,...patch});
 let hint='The marked places are fixed; you can correct their names below.';
 if(editable)hint=entry.points.length<MAX_POINTS?'Tap the map to mark a junction or landmark, then name it below.':'Up to 12 places can be marked.';
 // Autosave: on this device at once, on the server shortly after typing stops.
 React.useEffect(()=>{
  if(first.current){first.current=false;return;}
  try{localStorage.setItem(draftKey(token,entry.number),JSON.stringify(entry));}catch{/* device storage full */}
  setStatus('Saving…');
  const timer=setTimeout(()=>{api.namingSave(token,entry,false).then(()=>setStatus(entry.submitted?'Submitted · changes saved':'Draft saved'),()=>setStatus('Saved on this device; will retry when you type again'));},SAVE_MS);
  return()=>clearTimeout(timer);
 },[entry,token]);
 const submit=async()=>{setBusy(true);setError('');try{
  if(entry.points.some(p=>!p.name.trim()))throw Error('Give every marked place a name, or remove it.');
  await api.namingSave(token,entry,true);
  try{localStorage.removeItem(draftKey(token,entry.number));}catch{/* nothing kept */}
  onChange({...entry,submitted:true});setStatus('Submitted');onSubmitted();
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <section className="tm-raised stack nm-editor" aria-labelledby="nm-title">
  <h2 id="nm-title"><span className="tm-number">{territory.number}</span>{' Territory '+territory.number}</h2>
  <NamingMap g={territory.geometry as Geometry} others={others as Geometry[]} points={entry.points} onAdd={editable?p=>set({points:[...entry.points,p]}):undefined}/>
  <p className="muted">{hint}</p>
  <Field label={'Locality name'} hint={'The name people use for this area.'}>{p=><input {...p} className="tm-inset" maxLength={150} value={entry.locality} onChange={e=>set({locality:e.target.value})}/>}</Field>
  {entry.points.length>0&&<ol className="nm-points">{entry.points.map((pt,i)=><li key={i}><span className="nm-pin-label" aria-hidden="true">{i+1}</span>
   <input className="tm-inset" aria-label={`Name of marked place ${i+1}`} placeholder={'Junction or landmark name'} maxLength={80} value={pt.name} onChange={e=>set({points:entry.points.map((x,j)=>j===i?{...x,name:e.target.value}:x)})}/>
   {editable&&<Button aria-label={`Remove marked place ${i+1}`} onClick={()=>set({points:entry.points.filter((_,j)=>j!==i)})}><Trash2/></Button>}</li>)}</ol>}
  <Field label={'Notes for this territory (optional)'}>{p=><textarea {...p} className="tm-inset" rows={2} maxLength={1000} value={entry.note} onChange={e=>set({note:e.target.value})}/>}</Field>
  {error&&<p role="alert" className="error">{error}</p>}
  <div className="actions"><Button className="primary" busy={busy} disabled={entry.locality.trim().length<2} onClick={()=>void submit()}><MapPin/>{entry.submitted?'Submit again':'Submit'}</Button>
   <span className="muted" aria-live="polite">{status}</span></div>
 </section>;
}
