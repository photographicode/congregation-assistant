import React from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {repositories} from '../../../../packages/core/repositories';
import {LocalAssistant} from './LocalAssistant';
import {demo,rpc,storeFor} from './client';
import type {Context} from '../main';

/** Load authorized context before local command review; never send command text. */
export function HomeAssistant({context:c,go}:{context:Context;go:(route:string)=>void}){
 const cache=useQueryClient();
 const ready=useQuery({queryKey:['assistant-home-ready',c.account,c.cong],enabled:c.roles.includes('admin'),staleTime:60000,queryFn:async()=>{
  if(demo){cache.setQueryData(['assistant-meeting',c.account,c.cong],{date:new Date().toISOString().slice(0,10),kind:'midweek',canSubmit:true,count:null,timezone:'UTC'});return true;}
  const repo=repositories(storeFor(c.cong,c.roles),c.cong),year=new Date().getFullYear()+(new Date().getMonth()>=8?1:0);
  const [people,current,previous,meeting]=await Promise.all([repo.people.names(),repo.reports.year(year),repo.reports.year(year-1),rpc('ca_v3_meeting_context',{p_cong_id:c.cong})]);
  cache.setQueryData(['assistant-people',c.account,c.cong],people);
  cache.setQueryData(['assistant-records',c.account,c.cong],[...current,...previous]);
  cache.setQueryData(['assistant-meeting',c.account,c.cong],meeting);return true;
 }});
 if(!c.roles.includes('admin'))return null;
 return <section className="card stack" aria-label="Admin assistant"><h2>Assistant · Admin</h2><p>Try “S-21 for Maria Thomas” or “record midweek attendance 85”.</p>{ready.isPending?<p role="status">Loading your authorized records…</p>:ready.error?<p role="alert">Assistant context could not load. <button onClick={()=>void ready.refetch()}>Retry</button></p>:<LocalAssistant compact context={c} onExport={()=>{sessionStorage.setItem('ca-pdf-open','s21');go('pdf');}}/>}</section>;
}
