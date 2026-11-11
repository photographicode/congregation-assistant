// Territory pages that open without sign-in: a shared territory card, the issue report form and the workspace request.
import React from 'react';
import {Copy,Crosshair,Download,MapPin,Map as MapIcon} from 'lucide-react';
import {Button,Combobox,Field,Skeleton} from '../../../../packages/ui/components';
import {config} from './client';
import * as api from './territory-api';
import {mapsLink} from './territory-model';
import {cardJpeg,download} from './territory-card';
import {useTerritoryTheme} from './territory-prefs';
import './territory.css';

const tokenFromHash=()=>new URLSearchParams(location.hash.slice(1)).get('token')||'';
function readable(e:unknown){
 const m=(e as Error)?.message||'';
 if(e instanceof TypeError||/failed to fetch|networkerror|load failed/i.test(m))return 'We can’t reach the server. Check your connection and try again.';
 if(/too many|PT429|429/i.test(m))return 'Too many attempts from this connection. Please wait and try again.';
 if(/PGRST202|could not find the function/i.test(m))return 'Territory pages are not open yet. Please ask your territory servant.';
 return m||'Something went wrong. Please try again.';
}
function Page({children}:{children:React.ReactNode}){useTerritoryTheme();return <main className="tm tm-center"><section className="tm-raised tm-login stack">{children}</section></main>;}

/** ?territory-card#token=… : what the publisher holding the territory needs to know before going. */
export function TerritoryCard(){
 const token=tokenFromHash();
 useTerritoryTheme();
 const [data,setData]=React.useState<api.PublicTerritory|null>(null),[error,setError]=React.useState(''),[reporting,setReporting]=React.useState(false);
 React.useEffect(()=>{document.title='Territory · Congregation Assistant';api.publicTerritory(token).then(setData).catch(e=>setError(readable(e)));},[token]);
 if(error)return <Page><h1>{'Territory'}</h1><p role="alert">{error}</p></Page>;
 if(!data)return <Page><Skeleton label={"Opening territory…"}/></Page>;
 const save=async()=>{try{download(await cardJpeg({...data,link:location.href,issues:data.reports}),`territory-${data.number}.jpg`);}catch(e){setError(readable(e));}};
 return <main className="tm tm-public"><article className="tm-raised stack">
  <p className="muted">{data.workspace}</p>
  <h1><span className="tm-number">{data.number}</span>{' '}{data.name}</h1>
  {data.image?<img className="tm-hero" src={data.image} alt={`Map of territory ${data.number}`} width={1200} height={800}/>:<span className="tm-thumb tm-hero"><MapIcon aria-hidden="true"/></span>}
  {data.map_url&&<div className="actions tm-map-actions"><a className="button primary" href={data.map_url} target="_blank" rel="noreferrer"><MapPin/>{'Open map'}</a><Button onClick={()=>void navigator.clipboard.writeText(data.map_url||'').catch(()=>undefined)}><Copy/>{'Copy map link'}</Button></div>}
  {data.notes&&<section className="stack"><h2>{'Notes'}</h2><p className="v4-preserve-lines">{data.notes}</p></section>}
  <section className="stack"><h2>{'Be aware'}</h2>
   {data.reports.length?data.reports.map((r,i)=><div className="tm-issue" key={i}><div><strong>{r.household||'Reported issue'}</strong><p className="v4-preserve-lines">{r.details}</p>
    {r.lat!==null&&r.lng!==null&&<a href={mapsLink(r.lat,r.lng)} target="_blank" rel="noreferrer"><MapPin/>{'Open location'}</a>}</div></div>)
   :<p className="muted">{'No open issues reported in this territory.'}</p>}
  </section>
  <div className="actions"><Button className="primary" onClick={()=>setReporting(true)}>{'Report an issue here'}</Button><Button onClick={()=>void save()}><Download/>{'Save card'}</Button></div>
  {reporting&&<IssueForm token={token} territories={null} onDone={()=>{setReporting(false);void api.publicTerritory(token).then(setData);}}/>}
 </article></main>;
}

/** ?territory-issue#token=… : the workspace link; the publisher picks the territory. */
export function TerritoryIssue(){
 const token=tokenFromHash();
 const [data,setData]=React.useState<{workspace:string;territories:{id:string;number:string;name:string}[]}|null>(null),[error,setError]=React.useState('');
 React.useEffect(()=>{document.title='Report a territory issue · Congregation Assistant';api.publicForm(token).then(setData).catch(e=>setError(readable(e)));},[token]);
 if(error)return <Page><h1>{'Report an issue'}</h1><p role="alert">{error}</p></Page>;
 if(!data)return <Page><Skeleton label={"Opening form…"}/></Page>;
 return <Page><p className="muted">{data.workspace}</p><h1>{'Report a territory issue'}</h1>
  <p>{'Let the next publisher know about a house or street. Stand at the place and tap Get my location.'}</p>
  <IssueForm token={token} territories={data.territories}/></Page>;
}

type Spot={lat:number;lng:number;accuracy:number};
const REFERENCE_LENGTH=8,LOCATE_TIMEOUT=20000;
const where=(spot:Spot|null)=>spot?{lat:spot.lat,lng:spot.lng,accuracy:spot.accuracy}:{lat:null,lng:null,accuracy:null};
function locateLabel(locating:boolean,spot:Spot|null){
 if(locating)return 'Finding you…';
 return spot?'Get location again':'Get my location';
}
function IssueForm({token,territories,onDone}:{token:string;territories:{id:string;number:string;name:string}[]|null;onDone?:()=>void}){
 const [f,setF]=React.useState({territory:'',household:'',details:'',reporter:'',website:''});
 const [spot,setSpot]=React.useState<Spot|null>(null),[locating,setLocating]=React.useState(false),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[sent,setSent]=React.useState(false);
 const locate=()=>{
  if(!navigator.geolocation){setError('This browser cannot share a location. Describe the place instead.');return;}
  setLocating(true);setError('');
  navigator.geolocation.getCurrentPosition(p=>{setSpot({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy});setLocating(false);},
   e=>{setLocating(false);setError(e.code===e.PERMISSION_DENIED?'Location permission was refused. Allow location for this site in the browser settings, or describe the place instead.':'The location could not be found. Move outside and try again.');},
   {enableHighAccuracy:true,timeout:LOCATE_TIMEOUT,maximumAge:0});
 };
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;if(territories&&!f.territory){setError('Choose the territory first.');return;}setBusy(true);setError('');
  try{await api.submitIssue(token,{...f,territory:territories?f.territory:null,...where(spot)});setSent(true);onDone?.();}
  catch(err){setError(readable(err));}finally{setBusy(false);}};
 if(sent)return <div role="status" className="stack"><h2>{'Thank you'}</h2><p>{'The issue was added to the territory. The territory servant and the next publisher will see it.'}</p><Button onClick={()=>{setSent(false);setSpot(null);setF({...f,household:'',details:''});}}>{'Report another'}</Button></div>;
 return <form className="stack" onSubmit={e=>void submit(e)} aria-busy={busy}>
  <fieldset className="stack" disabled={busy}>
   {territories&&<Combobox label={'Territory'} value={f.territory} options={territories.map(t=>({value:t.id,label:t.number+' · '+t.name}))} clearLabel={'Choose a territory'} onChange={v=>setF({...f,territory:v})}/>}
   <div className="tm-inset-box stack">
    <Button onClick={locate} busy={locating}><Crosshair/>{locateLabel(locating,spot)}</Button>
    {spot?<p>{`Location saved (±${Math.round(spot.accuracy)} m). `}<a href={mapsLink(spot.lat,spot.lng)} target="_blank" rel="noreferrer">{'Check on the map'}</a></p>:<p className="muted">{'Optional, but it helps the next publisher find the exact house.'}</p>}
   </div>
   <Field label={"House or household"} hint="For example: House 14, blue gate.">{p=><input {...p} className="tm-inset" maxLength={150} value={f.household} onChange={e=>setF({...f,household:e.target.value})}/>}</Field>
   <Field label={"What should others know?"}>{p=><textarea {...p} className="tm-inset" required minLength={3} maxLength={2000} rows={4} value={f.details} onChange={e=>setF({...f,details:e.target.value})}/>}</Field>
   <Field label={"Your name (optional)"}>{p=><input {...p} className="tm-inset" maxLength={120} autoComplete="name" value={f.reporter} onChange={e=>setF({...f,reporter:e.target.value})}/>}</Field>
   <label className="sr-only" aria-hidden="true">{'Leave this empty'}<input tabIndex={-1} autoComplete="off" value={f.website} onChange={e=>setF({...f,website:e.target.value})}/></label>
  </fieldset>
  {error&&<p role="alert" className="error">{error}</p>}
  <Button className="primary full" type="submit" busy={busy}>{'Send report'}</Button>
 </form>;
}

/** ?territory-request : a congregation asks the owner for a territory workspace. */
export function TerritoryRequest(){
 const [f,setF]=React.useState({name:'',email:'',admin:'',congregation:'',phone:'',website:''}),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[reference,setReference]=React.useState('');
 React.useEffect(()=>{document.title='Request a territory workspace · Congregation Assistant';},[]);
 const set=(k:keyof typeof f)=>(e:React.ChangeEvent<HTMLInputElement>)=>setF({...f,[k]:e.target.value});
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{setReference(await api.submitApplication(f));}catch(err){setError(readable(err));}finally{setBusy(false);}};
 if(reference)return <Page><h1>{'Request received'}</h1><p role="status">{'Thank you. We will email the admin when the territory workspace is ready.'}</p>{reference.length>REFERENCE_LENGTH&&<p className="muted">{'Reference: '+reference.slice(0,REFERENCE_LENGTH)}</p>}<a className="button" href={config.PUBLIC_SITE_URL+'/'}>{'Back to the website'}</a></Page>;
 return <Page><h1>{'Request a territory workspace'}</h1>
  <p>{'A territory workspace keeps your territory cards, who has each one, due dates, history and reported issues. The admin signs in with Google.'}</p>
  <form className="stack" onSubmit={e=>void submit(e)} aria-busy={busy}><fieldset className="stack" disabled={busy}>
   <Field label={"Your name"}>{p=><input {...p} className="tm-inset" required minLength={2} maxLength={100} autoComplete="name" value={f.name} onChange={set('name')}/>}</Field>
   <Field label={"Your email"} hint="We reply to this address.">{p=><input {...p} className="tm-inset" type="email" required maxLength={150} autoComplete="email" value={f.email} onChange={set('email')}/>}</Field>
   <Field label={"Congregation name"}>{p=><input {...p} className="tm-inset" required minLength={2} maxLength={150} value={f.congregation} onChange={set('congregation')}/>}</Field>
   <Field label={"Admin's Google account"} hint="The person who will manage territories and add other managers.">{p=><input {...p} className="tm-inset" type="email" required maxLength={150} value={f.admin} onChange={set('admin')}/>}</Field>
   <Field label={"Phone (optional)"}>{p=><input {...p} className="tm-inset" type="tel" maxLength={30} autoComplete="tel" value={f.phone} onChange={set('phone')}/>}</Field>
   <label className="sr-only" aria-hidden="true">{'Leave this empty'}<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')}/></label>
  </fieldset>
  {error&&<p role="alert" className="error">{error}</p>}
  <Button className="primary full" type="submit" busy={busy}>{'Send request'}</Button></form>
  <p className="muted">{'Already approved? '}<a href="?territory">{'Sign in'}</a></p>
 </Page>;
}
