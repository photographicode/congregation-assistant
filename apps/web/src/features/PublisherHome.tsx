import React from 'react';
import {ArrowRight,CalendarDays,CheckCircle2,ClipboardList,UserRound,Sun,BookOpen} from 'lucide-react';
import {Button} from '../../../../packages/ui/components';
import type {Context} from '../context';
import {usePublisherPortal} from './publisher-workspace';
import {Announcements} from './Announcements';
import { t } from "../../../../packages/core/i18n";

const PREVIEW_ASSIGNMENTS=5;
export function PublisherHome({context:c,go}:{context:Context;go:(route:string)=>void}){
 const home=usePublisherPortal(c),data=home.data;
 return <div className="publisher-home stack">
  <header className="v4-page-heading"><div><p className="eyebrow">{t('v4.317ec74b9b')}</p><h1>{t('v4.23429bd9ba')}{data?.name.split(' ')[0]||c.firstName||'welcome'}.</h1><p className="muted">{t('v4.d002cbca2b')}</p></div><span className="v4-date"><Sun aria-hidden="true"/>{new Date().toLocaleDateString('en',{weekday:'long',day:'numeric',month:'long'})}</span></header>
  {home.isPending&&<p role="status" className="card">{t('v4.26629bc466')}</p>}
  {home.error&&<div role="alert" className="card stack"><h2>{t('v4.9f3290314b')}</h2><p>{home.error.message}</p><Button onClick={()=>void home.refetch()} type="button">{t('v4.d8b8392e2c')}</Button></div>}
  {data&&<>
   <section className="v4-report-banner" aria-labelledby="report-heading"><div className="v4-banner-icon"><ClipboardList aria-hidden="true"/></div><div><p className="eyebrow">{t('v4.cf76f8d63a')}</p><h2 id="report-heading">{data.report.submitted?'Thank you. Your report is in.':'A small task. A meaningful record.'}</h2><p>{data.report.period} · {data.report.submitted?'Submitted':'Ready when you are'}</p></div><Button className="primary" type="button" onClick={()=>go('reports')}>{data.report.submitted?'View report':'Submit report'}<ArrowRight aria-hidden="true"/></Button></section>
   <div className="v4-home-columns"><div className="stack">
    <section className="card stack" aria-labelledby="assignment-heading"><div className="v4-section-heading"><h2 id="assignment-heading">{t('v4.e32dc3a582')}</h2><span className="v4-count">{data.assignments.length}</span></div>
     {data.assignments.length?data.assignments.slice(0,PREVIEW_ASSIGNMENTS).map((assignment,i)=><article className="v4-assignment" key={`${assignment.slot||assignment.title}-${assignment.date||assignment.week}-${i}`}><div className="v4-assignment-icon"><BookOpen aria-hidden="true"/></div><div><h3>{assignment.title||assignment.slot||'Meeting assignment'}</h3><p className="muted">{assignment.date?new Date(assignment.date+'T12:00:00').toLocaleDateString('en',{weekday:'short',day:'numeric',month:'long'}):assignment.week}{assignment.time?' · '+assignment.time:''}{assignment.isAssistant?' · Assistant':''}</p></div><CheckCircle2 aria-label={t('v4.2071bb2aa6')} className="muted"/></article>):<p className="v4-empty">{t('v4.b51a40c568')}</p>}
     <Button className="v4-text-button" onClick={()=>go('schedule')} type="button">{t('v4.b73580977e')}<ArrowRight aria-hidden="true"/></Button>
    </section>
    <Announcements context={c}/>
   </div><aside className="stack" aria-label={t('v4.81d8155396')}><section className="card v4-next-meeting"><span className="v4-icon-tile"><CalendarDays aria-hidden="true"/></span><p className="eyebrow">{t('v4.910dfd02ac')}</p><h2>{t('v4.d0bc59fad8')}</h2><p>{t('v4.1de3eac317')}</p><Button onClick={()=>go('schedule')} type="button">{t('v4.d59937b302')}<ArrowRight aria-hidden="true"/></Button></section><section className="card stack"><UserRound aria-hidden="true"/><h2>{t('v4.421f87e18a')}</h2><p>{t('v4.4beaa7a73f')}</p><Button onClick={()=>go('settings')} type="button">{t('v4.1c047334ab')}<ArrowRight aria-hidden="true"/></Button></section></aside></div>
   {data.notice&&<section className="card stack"><h2>{t('v4.34d39a7c24')}</h2><p className="v4-preserve-lines">{data.notice}</p></section>}
  </>}
 </div>;
}
