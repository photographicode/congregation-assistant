import React from 'react';
import {ArrowRight,CalendarDays,CheckCircle2,ClipboardList,UserRound,BookOpen,ChevronRight} from 'lucide-react';
import {Button} from '../../../../packages/ui/components';
import type {Context} from '../context';
import {usePublisherPortal} from './publisher-workspace';
import {Announcements} from './Announcements';
import { t } from "../../../../packages/core/i18n";

const PREVIEW_ASSIGNMENTS=5;
type Assignment=NonNullable<ReturnType<typeof usePublisherPortal>['data']>['assignments'][number];
function when(assignment:Assignment){return (assignment.date?new Date(assignment.date+'T12:00:00').toLocaleDateString('en',{weekday:'short',day:'numeric',month:'long'}):assignment.week||'')+(assignment.time?' · '+assignment.time:'')+(assignment.isAssistant?' · Assistant':'');}
/** The publisher's own published assignments; shared by Today and the publisher Meetings view. */
export function AssignmentList({assignments,limit=PREVIEW_ASSIGNMENTS}:{assignments:Assignment[];limit?:number}){
 return assignments.length?<ul className="v41-assignments">{assignments.slice(0,limit).map((assignment,i)=><li className="v4-assignment" key={`${assignment.slot||assignment.title}-${assignment.date||assignment.week}-${i}`}><span className="v4-assignment-icon"><BookOpen aria-hidden="true"/></span><div><h3>{assignment.title||assignment.slot||'Meeting assignment'}</h3><p className="muted">{when(assignment)}</p></div><CheckCircle2 aria-label={t('v4.2071bb2aa6')} className="muted"/></li>)}</ul>:<p className="v4-empty">{t('v4.b51a40c568')}</p>;
}
export function PublisherAssignments({context:c}:{context:Context}){
 const home=usePublisherPortal(c);
 return <section className="card stack" aria-labelledby="my-assignments-heading"><div className="v4-section-heading"><h2 id="my-assignments-heading">{t('v41.myAssignments')}</h2>{home.data&&<span className="v4-count">{home.data.assignments.length}</span>}</div>
  {home.isPending&&<p role="status">{t('v4.26629bc466')}</p>}
  {home.error&&<div role="alert" className="stack"><p>{home.error.message}</p><Button onClick={()=>void home.refetch()} type="button">{t('v4.d8b8392e2c')}</Button></div>}
  {home.data&&<AssignmentList assignments={home.data.assignments} limit={home.data.assignments.length}/>}
  <p className="muted">{t('ui.use.the.live.schedule.link.shared.by.your..d2b98718')}</p>
 </section>;
}
function Shortcut({icon:Icon,title,hint,id,onClick}:{icon:typeof CalendarDays;title:string;hint:string;id:string;onClick:()=>void}){
 return <li><button type="button" className="v41-shortcut" aria-label={title} aria-describedby={id} onClick={onClick}><span className="v4-icon-tile"><Icon aria-hidden="true"/></span><span><strong>{title}</strong><small id={id}>{hint}</small></span><ChevronRight aria-hidden="true"/></button></li>;
}
export function PublisherHome({context:c,go}:{context:Context;go:(route:string)=>void}){
 const home=usePublisherPortal(c),data=home.data;
 return <div className="publisher-home v41-today">
  <header className="v41-greeting"><h1>{t('v4.23429bd9ba')}{data?.name.split(' ')[0]||c.firstName||'welcome'}.</h1><p className="muted">{new Date().toLocaleDateString('en',{weekday:'long',day:'numeric',month:'long'})}</p></header>
  {home.isPending&&<p role="status" className="card">{t('v4.26629bc466')}</p>}
  {home.error&&<div role="alert" className="card stack"><h2>{t('v4.9f3290314b')}</h2><p>{home.error.message}</p><Button onClick={()=>void home.refetch()} type="button">{t('v4.d8b8392e2c')}</Button></div>}
  {data&&<>
   <section className="card v41-report" data-state={data.report.submitted?'done':'due'} aria-labelledby="report-heading"><span className="v4-icon-tile">{data.report.submitted?<CheckCircle2 aria-hidden="true"/>:<ClipboardList aria-hidden="true"/>}</span><div><h2 id="report-heading">{t('v41.reportFor')}{data.report.period}</h2><p>{data.report.submitted?t('v41.reportDone'):t('v41.reportDue')}</p></div><Button className="primary" type="button" onClick={()=>go('reports')}>{data.report.submitted?'View report':'Submit report'}<ArrowRight aria-hidden="true"/></Button></section>
   <div className="v41-today-grid">
    <section className="card stack" aria-labelledby="assignment-heading"><div className="v4-section-heading"><h2 id="assignment-heading">{t('v4.e32dc3a582')}</h2><span className="v4-count">{data.assignments.length}</span></div>
     <AssignmentList assignments={data.assignments}/>
     <Button className="v4-text-button" onClick={()=>go('schedule')} type="button">{t('v4.b73580977e')}<ArrowRight aria-hidden="true"/></Button>
    </section>
    <nav className="v41-shortcuts" aria-label={t('v4.81d8155396')}><h2>{t('v4.81d8155396')}</h2><ul>
     <Shortcut id="shortcut-meetings" icon={CalendarDays} title={t('v41.meetingSchedules')} hint={t('v41.meetingSchedulesHint')} onClick={()=>go('schedule')}/>
     <Shortcut id="shortcut-reports" icon={ClipboardList} title={t('v41.householdReports')} hint={t('v41.householdReportsHint')} onClick={()=>go('reports')}/>
     <Shortcut id="shortcut-profile" icon={UserRound} title={t('v4.1c047334ab')} hint={t('v41.profileHint')} onClick={()=>go('settings')}/>
    </ul></nav>
    <Announcements context={c}/>
   </div>
   {data.notice&&<section className="card stack"><h2>{t('v4.34d39a7c24')}</h2><p className="v4-preserve-lines">{data.notice}</p></section>}
  </>}
 </div>;
}
