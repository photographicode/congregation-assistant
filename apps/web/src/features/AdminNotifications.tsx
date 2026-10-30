import React from 'react';
import {ApprovalInbox,usePendingApprovals} from './today/approvals';
import {useQueryClient} from '@tanstack/react-query';
import {Bell,Check} from 'lucide-react';
import {Button} from '../../../../packages/ui/components';
import type {Context} from '../context';
import {rpc} from './client';
import {useInboxFeed} from './today/inbox';
import { t } from "../../../../packages/core/i18n";

const labels:Record<string,string>={phone:'phone number',address:'address',emergency_name:'emergency contact name',emergency_relationship:'emergency contact relationship',emergency_phone:'emergency contact phone'};
export function AdminNotifications({context:c}:{context:Context}){
 const approvals=usePendingApprovals(c),cache=useQueryClient(),key=['v4-admin-notifications',c.account||'demo',c.cong],feed=useInboxFeed(c),[busy,setBusy]=React.useState(''),[error,setError]=React.useState('');
 const items=[...feed.data??[]].sort((a,b)=>b.created_at.localeCompare(a.created_at)),failure=error||feed.error?.message;
 if(!c.roles.includes('admin'))return null;
 return <section className="card stack"><div className="v4-section-heading"><h2><Bell aria-hidden="true"/>{t('ux.nav.inbox')}</h2><span className="v4-count">{items.filter(item=>!item.read_at).length} {t('v4.2cc1c371db')}</span></div><p className="muted">{t('v4.61f716ed8f')}</p><ApprovalInbox context={c}/>{feed.isPending&&<p role="status">{t('v4.079dcad75e')}</p>}{failure&&<p role="alert">{failure}</p>}{items.length?items.map(item=><article className="list-row" key={item.id}><div><strong>{item.publisher_name}</strong><p>{t('v4.a919c7c2d1')}{item.changed_fields.map(field=>labels[field]||field).join(', ')}.</p><small>{new Date(item.created_at).toLocaleString(document.documentElement.lang||undefined)}</small></div>{!item.read_at?<Button type="button" disabled={!!busy} aria-label={`Mark ${item.publisher_name} contact update as read`} onClick={()=>{setBusy(item.id);setError('');void rpc('ca_v4_read_notification',{p_cong_id:c.cong,p_id:item.id}).then(()=>cache.invalidateQueries({queryKey:key})).catch(e=>setError(e instanceof Error?e.message:'Could not mark as read.')).finally(()=>setBusy(''));}}><Check aria-hidden="true"/>{t('v4.b49c9b6cdf')}</Button>:<span className="chip">{t('v4.9b9a8d05a7')}</span>}</article>):isInboxEmpty(approvals.data,feed.isSuccess)&&<p className="v4-empty">{t('v4.d660270981')}</p>}</section>;
}

function isInboxEmpty(approvals:unknown[]|undefined,feedReady:boolean){return feedReady&&approvals?.length===0;}
