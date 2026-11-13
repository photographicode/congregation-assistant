// Command centre panel: approve territory workspace requests, or create a workspace directly for a congregation.
import React from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Button,Field} from '../../../../packages/ui/components';
import * as api from './territory-api';
import {demo} from './client';
import {territoryUrl} from './territory-site';

export function TerritoryOwner({notify}:{notify:(m:string)=>void}){
 const qc=useQueryClient();
 const data=useQuery({queryKey:['tm','owner'],queryFn:api.ownerOverview});
 const [f,setF]=React.useState({name:'',email:''}),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const run=async(fn:()=>Promise<unknown>,done:string)=>{setBusy(true);setError('');try{await fn();if(demo)qc.setQueryData(['tm','owner'],await api.ownerOverview());else await qc.invalidateQueries({queryKey:['tm','owner']});notify(done);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const pending=(data.data?.applications||[]).filter(a=>a.status==='pending');
 return <section className="card stack">
  <h2>{'Territory workspaces'}</h2>
  <p>{'Territory-only workspaces. Requests come from '}<a href={territoryUrl('territory-request')} target="_blank" rel="noreferrer">{'the territory request form'}</a>{'. Approving creates the workspace and emails the admin.'}</p>
  {data.error&&<p role="alert">{/PGRST202|could not find/i.test((data.error as Error).message)?'Territory workspaces turn on after the 2026-11-11 database update is run.':'Territory workspaces could not load. '}<Button onClick={()=>void data.refetch()}>{'Retry'}</Button></p>}
  {error&&<p role="alert" className="error">{error}</p>}
  <h3>{pending.length===1?'1 request':`${pending.length} requests`}</h3>
  {pending.map(a=><article className="list-row" key={a.id}><div><strong>{a.congregation_name}</strong><p>{a.contact_name}{' · '}<a href={'mailto:'+encodeURIComponent(a.contact_email)}>{a.contact_email}</a>{' · admin '}{a.admin_email}{a.phone?' · '+a.phone:''}</p></div>
   <div className="actions"><Button className="primary" busy={busy} onClick={()=>void run(()=>api.reviewApplication(a.id,true),'Workspace created. The admin can sign in now.')}>{'Approve'}</Button><Button busy={busy} onClick={()=>void run(()=>api.reviewApplication(a.id,false),'Request declined.')}>{'Decline'}</Button></div></article>)}
  <form className="stack" onSubmit={e=>{e.preventDefault();void run(async()=>{await api.createWorkspace(f.name,f.email);setF({name:'',email:''});},'Workspace created. The admin can sign in now.');}}>
   <h3>{'Create a workspace'}</h3>
   <Field label={"Congregation name"}>{p=><input {...p} required minLength={2} maxLength={150} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>}</Field>
   <Field label={"Admin's Google account"}>{p=><input {...p} type="email" required maxLength={150} value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>}</Field>
   <Button type="submit" busy={busy}>{'Create workspace'}</Button>
  </form>
  <h3>{'Workspaces'}</h3>
  {(data.data?.workspaces||[]).map(w=><article className="list-row" key={w.id}><div><strong>{w.name}</strong><p>{w.admins.join(', ')||'No admin'}{' · '}{w.territories===1?'1 territory':`${w.territories} territories`}</p></div><a className="button" href={territoryUrl(`territory${demo?'&demo':''}&ws=${w.id}`)}>{'Open'}</a></article>)}
 </section>;
}
