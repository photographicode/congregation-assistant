import React from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Megaphone,Plus,Archive} from 'lucide-react';
import {z} from 'zod';
import {announcementSchema} from '../../../../packages/core/publisher-workspace';
import {Button} from '../../../../packages/ui/components';
import type {Context} from '../context';
import {demo,rpc} from './client';
import { t } from "../../../../packages/core/i18n";

export function Announcements({context:c}:{context:Context}){
 const admin=c.roles.includes('admin'),cache=useQueryClient(),key=['v4-announcements',c.account||'demo',c.cong],feed=useQuery({queryKey:key,queryFn:async()=>z.array(announcementSchema).parse(demo?[{id:'welcome',title:'Welcome to your congregation workspace',body:'Your published meeting schedules and assignments are here whenever you need them.',created_at:new Date().toISOString()}]:await rpc('ca_v4_announcements',{p_cong_id:c.cong})),staleTime:30_000});
 const [compose,setCompose]=React.useState(false),[title,setTitle]=React.useState(''),[body,setBody]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 async function run(task:()=>Promise<void>){setBusy(true);setError('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Could not save. Try again.');}finally{setBusy(false);}}
 const items=feed.data??[];
 return <section className="card stack" aria-labelledby="announcements-heading"><div className="v4-section-heading"><h2 id="announcements-heading"><Megaphone aria-hidden="true"/>{t('v4.fe02680f24')}</h2>{admin&&<Button type="button" aria-expanded={compose} onClick={()=>setCompose(!compose)}><Plus aria-hidden="true"/>{t('v4.18fdd549b2')}</Button>}</div>
  {feed.isPending&&<p role="status">{t('v4.f0276ba980')}</p>}{feed.error&&<div role="alert"><p>{t('v4.7e9a90c2e2')}</p><Button onClick={()=>void feed.refetch()} type="button">{t('v4.d8b8392e2c')}</Button></div>}{error&&<p role="alert">{error}</p>}
  {compose&&admin&&<form className="stack v4-composer" onSubmit={e=>{e.preventDefault();void run(async()=>{if(!title.trim()||!body.trim())throw Error('Add a title and message.');const item={id:crypto.randomUUID(),title:title.trim(),body:body.trim(),created_at:new Date().toISOString()};if(demo)cache.setQueryData(key,(old:z.infer<typeof announcementSchema>[]|undefined)=>[item,...old||[]]);else{await rpc('ca_v4_publish_announcement',{p_cong_id:c.cong,p_title:item.title,p_body:item.body});await cache.invalidateQueries({queryKey:key});}setTitle('');setBody('');setCompose(false);c.notify(demo?'Announcement added to this demo session.':'Announcement published.');});}}><label>{t('v4.7e8cd2056d')}<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>{t('v4.2f77668a9d')}<textarea required maxLength={4000} rows={4} value={body} onChange={e=>setBody(e.target.value)}/></label><p className="muted">{t('v4.6dc1ab6cb7')}</p><Button type="submit" className="primary" disabled={busy}>{busy?'Publishing…':'Publish announcement'}</Button></form>}
  {items.length?items.map(item=><article className="v4-announcement" key={item.id}><p className="eyebrow">{new Date(item.created_at).toLocaleDateString('en',{day:'numeric',month:'short'})}</p><h3>{item.title}</h3><p className="v4-preserve-lines">{item.body}</p>{admin&&<Button type="button" disabled={busy} aria-label={`Archive announcement ${item.title}`} onClick={()=>void run(async()=>{if(demo)cache.setQueryData(key,(old:z.infer<typeof announcementSchema>[]|undefined)=>old?.filter(row=>row.id!==item.id));else{await rpc('ca_v4_archive_announcement',{p_cong_id:c.cong,p_id:item.id});await cache.invalidateQueries({queryKey:key});}c.notify('Announcement archived.');})}><Archive aria-hidden="true"/>{t('v4.66f4804ee2')}</Button>}</article>):feed.isSuccess&&<p className="v4-empty">{t('v4.2e6445fdda')}</p>}
 </section>;
}
