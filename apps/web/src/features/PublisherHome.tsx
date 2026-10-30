import React from 'react';
import type {PublisherPortal} from '../../../../packages/core/publisher-workspace';
import {monday} from '../../../../packages/core/meeting';
import {Button} from '../../../../packages/ui/components';
import type {Context} from '../context';
import {navigateRoute} from '../useRoute';
import {usePublisherPortal} from './publisher-workspace';
import {Announcements} from './Announcements';
import {TodayHeading} from './today/TodayHeading';
import {reportPeriod} from './today/model';
import {previousReportingPeriod} from './dashboard-model.mjs';
import {t} from '../../../../packages/core/i18n';
export function PublisherHome({context:c,go,embedded=false}:{context:Context;go:(route:string)=>void;embedded?:boolean}){
 const home=usePublisherPortal(c,true),data=home.data;
 return <div className="publisher-home today stack">
  {!embedded&&<TodayHeading/>}
  {home.isPending&&<div className="today-skeleton stack" role="status" aria-label={t('ux.today.loading')}>{Array.from({length:4},(_,index)=>index).map(block=><div className="card" key={block}><span className="skeleton-line"/><span className="skeleton-line"/></div>)}</div>}
  {home.error&&<div role="alert" className="card stack"><h2>{t('v4.9f3290314b')}</h2><p>{home.error.message}</p><Button onClick={()=>void home.refetch()} type="button">{t('v4.d8b8392e2c')}</Button></div>}
  {data&&<>
   <AssignmentBlock data={data} go={go}/>
   <ReportBlock data={data} secondary={embedded}/>
   <Announcements context={c} today/>
   {data.notice&&<section className="card stack"><h2>{t('v4.34d39a7c24')}</h2><p className="v4-preserve-lines">{data.notice}</p></section>}
   <MeBlock data={data}/>
  </>}
 </div>;
}

function AssignmentBlock({data,go}:{data:PublisherPortal;go:(route:string)=>void}){
 const assignment=data.assignments[0],locale=document.documentElement.lang||undefined;
 return (<section className="card stack" aria-labelledby="assignment-heading"><h2 id="assignment-heading">{t('ux.today.next')}</h2>
    {assignment?<><h3 translate="no">{assignment.title||assignment.slot||t('ux.today.assignment')}</h3><div className="today-assignment-meta"><span className="chip">{assignment.date?new Date(assignment.date+'T12:00:00').toLocaleDateString(locale,{weekday:'short',day:'numeric',month:'short'}):assignment.week}</span>{assignment.time&&<span translate="no">{assignment.time}</span>}{assignment.isAssistant&&<span className="chip">{t('ux.today.assistant')}</span>}</div><Button type="button" onClick={()=>navigateRoute({screen:'schedule',week:assignment.week?monday(assignment.week):undefined})}>{t('ux.today.programme')}</Button>{data.assignments.length>1&&<Button className="v4-text-button" type="button" onClick={()=>go('schedule')}>{t('ux.today.allAssignments')} ({data.assignments.length})</Button>}</>:<><p>{t('ux.today.noAssignments')}</p><Button className="v4-text-button" onClick={()=>go('schedule')} type="button">{t('ux.today.meetings')}</Button></>}
   </section>);
}
function ReportBlock({data,secondary=false}:{data:PublisherPortal;secondary?:boolean}){
 const period=reportPeriod(data.report,previousReportingPeriod(new Date(),typeof data.timezone==='string'?data.timezone:undefined));
 return (<section className="today-report card stack" aria-labelledby="report-heading"><h2 id="report-heading">{t('ux.today.monthReport')}</h2><p>{data.report.period} · {t(data.report.submitted?'ux.today.sent':'ux.today.notSent')} {reportSentDate(data.report)}</p><Button className={data.report.submitted||secondary?'v4-text-button':'primary'} type="button" onClick={()=>navigateRoute({screen:'reports',month:period,...(!data.report.submitted?{action:'entry'}:{})})}>{t(data.report.submitted?'ux.today.viewReport':'ux.today.reportService')}</Button></section>);
}
function MeBlock({data}:{data:PublisherPortal}){return (<section className="today-me list-row" aria-labelledby="me-heading"><div><h2 id="me-heading">{t('ux.today.me')}</h2><p>{t('ux.today.myDetails')} · {data.away.length?t('ux.today.awayPlanned'):t('ux.today.awayNone')}</p></div><Button className="v4-text-button" onClick={()=>navigateRoute({screen:'settings',tab:'profile'})} type="button">{t('ux.today.update')}</Button></section>);}

function reportSentDate(report:PublisherPortal['report']){
 const record=report.record;
 if(!record||typeof record!=='object'||!('submitted_at' in record)||typeof record.submitted_at!=='string')return '';
 const date=new Date(record.submitted_at);
 return Number.isFinite(date.getTime())?date.toLocaleDateString(document.documentElement.lang||undefined,{day:'numeric',month:'short'}):'';
}
