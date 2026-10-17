import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {format} from 'date-fns';
import {client,demo} from './client';
import {repositories,type ScheduleDraft} from '../../../../packages/core/repositories';
import type {Context} from '../main';
const slots=[['Chairman','Chairman'],['OpeningPrayer','Opening prayer'],['TreasuresTalk','Treasures talk'],['SpiritualGems','Spiritual gems'],['BibleReading','Bible reading'],['Conversation','Starting a conversation'],['FollowingUp','Following up'],['Disciples','Making disciples'],['ChristianPart1','Living as Christians'],['BibleStudy','Congregation Bible study'],['BibleStudyReader','Bible study reader'],['ClosingPrayer','Closing prayer']];
const samplePersonnel=[{id:'daniel',name:'Daniel Thomas',gender:'Male',appointment:'Elder',roles:['Chairman','Prayer','TreasuresTalk','SpiritualGems','BibleStudy'],exceptions:{},availability:[]},{id:'samuel',name:'Samuel George',gender:'Male',appointment:'MS',roles:['BibleReading','BibleStudyReader','ChristianParts'],exceptions:{},availability:[]},{id:'maria',name:'Maria Thomas',gender:'Female',appointment:'Sister',roles:['Conversation','FollowingUp','Disciples'],exceptions:{},availability:[]}];
const blank=():ScheduleDraft=>({v:3,personnel:demo?samplePersonnel:[],assignments:{},additionalDuties:[],programs:{},template:'modern'});
export function Midweek({context:c,duties=false}:{context:Context;duties?:boolean}) {
 const repo=React.useMemo(()=>repositories(client,c.cong,demo),[c.cong]);
 const [draft,setDraft]=React.useState<ScheduleDraft>(blank),[revision,setRevision]=React.useState(0),[version,setVersion]=React.useState(0),[week,setWeek]=React.useState(format(new Date(),"RRRR-'W'II")),[busy,setBusy]=React.useState(false),[dirty,setDirty]=React.useState(false),[error,setError]=React.useState(''),[link,setLink]=React.useState(''),[dutyName,setDutyName]=React.useState('');
 const allowed=c.roles.some(r=>['admin','oclm'].includes(r));
 const query=useQuery({queryKey:['midweek',c.cong],queryFn:()=>repo.schedules.get(),enabled:!demo&&allowed});
 const roster=useQuery({queryKey:['midweek-roster',c.cong],queryFn:()=>repo.schedules.roster(),enabled:!demo&&allowed});
 React.useEffect(()=>{if(query.data&&!dirty){setDraft(query.data.draft||blank());setRevision(query.data.revision);setVersion(query.data.publication?.version||0);if(query.data.publication?.token)setLink(location.origin+import.meta.env.BASE_URL+"?form=schedule#token="+encodeURIComponent(query.data.publication.token));}},[query.data]);
 const change=(value:ScheduleDraft)=>{setDraft(value);setDirty(true);};
 const weekSlots=draft.assignments[week]||{};
 const displayed=duties?draft.additionalDuties.flatMap(d=>Array.from({length:d.slots},(_,i)=>[`${d.id}_${i+1}`,`${d.name} ${i+1}`])):slots;
 async function save(publish=false){setBusy(true);setError('');try {
  let rev=revision;if(demo){rev++;setRevision(rev);}else {const saved=await repo.schedules.save(revision,draft);rev=saved.revision;setRevision(rev);setDraft(saved.draft);}
  setDirty(false);
  if(publish){if(demo){setVersion(v=>v+1);c.notify('Fictional schedule published in this demo.');}else {const value=await repo.schedules.publish(week,rev,version);const pubVersion=Number(value.version||0);if(pubVersion)setVersion(pubVersion);if(value.token)setLink(location.origin+import.meta.env.BASE_URL+'?form=schedule#token='+encodeURIComponent(String(value.token)));c.notify('Midweek schedule published.');await query.refetch();}}
  else c.notify('Midweek draft saved.');
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!allowed)return <section className="card"><h2>Your published schedule</h2><p>Use the live schedule link shared by your meeting overseer. Private drafts are available only to approved schedulers.</p></section>;
 return <section className="card stack"><div className="page-heading"><div><h2>{duties?'Additional duties':'Midweek assignments'}</h2><p>Save a draft, review it, then publish the week.</p></div><label>Meeting week<input type="week" required value={week} onChange={e=>setWeek(e.target.value)}/></label></div>
 {(error||query.error||roster.error)&&<p role="alert" className="banner">{error||(query.error||roster.error)?.message}</p>}
 {!demo&&roster.data&&<details><summary>Add people to the scheduling roster</summary><p>Review qualifications with the meeting overseer before assigning parts.</p>{roster.data.filter(p=>!draft.personnel.some(s=>s.id===p.id)).map(p=><div className="list-row" key={p.id}><strong>{p.name}</strong><button onClick={()=>change({...draft,personnel:[...draft.personnel,{id:p.id,publisherId:p.id,name:p.name,gender:p.gender,appointment:p.isElder?'Elder':p.isMS?'MS':p.gender==='Female'?'Sister':'Other',roles:[],exceptions:{},availability:[]}]})}>Add to roster</button></div>)}</details>}
 {displayed.map(([id,label])=><div className="form-grid" key={id}><label>{label}<select value={weekSlots[id]?.personId||''} onChange={e=>change({...draft,assignments:{...draft.assignments,[week]:{...weekSlots,[id]:{...weekSlots[id],personId:e.target.value||null,status:'scheduled'}}}})}><option value="">Needs a person</option>{draft.personnel.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Assignment title<input maxLength={300} value={weekSlots[id]?.customTitle||''} onChange={e=>change({...draft,assignments:{...draft.assignments,[week]:{...weekSlots,[id]:{...weekSlots[id],customTitle:e.target.value,status:'scheduled'}}}})}/></label></div>)}
 {duties&&<form className="actions" onSubmit={e=>{e.preventDefault();change({...draft,additionalDuties:[...draft.additionalDuties,{id:'Duty_'+crypto.randomUUID().replaceAll('-',''),name:dutyName.trim(),slots:1,section:'Additional Duties',enabled:true}]});setDutyName('');}}><label>Custom duty<input required maxLength={100} value={dutyName} onChange={e=>setDutyName(e.target.value)}/></label><button>Add duty</button></form>}
 <div className="actions"><button disabled={busy||query.isLoading} onClick={()=>void save()}>Save draft</button><button disabled={busy||query.isLoading} className="primary" onClick={()=>void save(true)}>Publish midweek</button><button onClick={()=>window.print()}>Print schedule</button></div><p className="muted">Draft revision {revision} · Published version {version}{dirty?' · Unsaved changes':''}</p>
 {link&&<a href={link}>Open published schedule</a>}
 </section>;
}
