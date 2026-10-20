import {t} from '../../../../packages/core/i18n';
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
 return <section className="card stack" aria-label={t('assistant.adminLabel')}><h2>{t('assistant.adminTitle')}</h2><p>{t('assistant.adminExamples')}</p>{ready.isPending?<p role="status">{t('assistant.loadingContext')}</p>:ready.error?<p role="alert">{t('assistant.contextError')} <button onClick={()=>void ready.refetch()}>{t('search.retry')}</button></p>:<LocalAssistant compact context={c} onExport={()=>{sessionStorage.setItem('ca-pdf-open','s21');go('pdf');}}/>}</section>;
}
