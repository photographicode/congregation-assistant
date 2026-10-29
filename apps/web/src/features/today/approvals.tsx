import React from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {z} from 'zod';
import {Button} from '../../../../../packages/ui/components';
import {t} from '../../../../../packages/core/i18n';
import type {Context} from '../../context';
import {rpc,demo} from '../client';
const schema=z.object({people:z.array(z.object({id:z.string(),name:z.string(),status:z.string()}))});
export function usePendingApprovals(c:Context){return useQuery({queryKey:['today-approvals',c.cong],enabled:c.roles.includes('admin'),queryFn:async()=>demo?[]:(await Promise.all(['av','attendant','cleaning'].map(async department=>schema.parse(await rpc('get_department_workspace',{p_cong_id:c.cong,p_department:department})).people.filter(person=>person.status==='pending').map(person=>({...person,department}))))).flat()});}
export function ApprovalInbox({context:c}:{context:Context}){
 const query=usePendingApprovals(c),cache=useQueryClient(),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 if(!query.data?.length&&!query.error)return null;
 return <section className="stack"><h2>{t('ux.today.requests')}</h2>{(error||query.error)&&<p role="alert">{error||query.error?.message}</p>}{query.data?.map(person=><div className="list-row" key={person.department+person.id}><div><strong translate="no">{person.name}</strong><p>{t('duties.'+person.department as 'duties.av'|'duties.cleaning'|'duties.attendant')}</p></div><div className="actions">{[true,false].map(approve=><Button type="button" key={String(approve)} disabled={busy} onClick={()=>{setBusy(true);setError('');void rpc('decide_department_person',{p_cong_id:c.cong,p_department:person.department,p_publisher_id:person.id,p_approve:approve}).then(async()=>{await query.refetch();await cache.invalidateQueries({queryKey:['department',c.cong,person.department]});}).catch(error=>setError(error instanceof Error?error.message:t('ux.today.loadError'))).finally(()=>setBusy(false));}}>{t(approve?'duties.approve':'duties.reject')}</Button>)}</div></div>)}</section>;
}
