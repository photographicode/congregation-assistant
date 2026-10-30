import React from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {z} from 'zod';
import {AlertCircle,Info} from 'lucide-react';
import {Button} from '../../../../../packages/ui/components';
import type {ScheduleDraft} from '../../../../../packages/core/repositories';
import {programSchema,monday} from '../../../../../packages/core/meeting';
import type {notificationSchema} from '../../../../../packages/core/publisher-workspace';
import {t} from '../../../../../packages/core/i18n';
import type {Context} from '../../context';
import {navigateRoute} from '../../useRoute';
import {demo,rpc} from '../client';
import {PublisherHome} from '../PublisherHome';
import {CurrentAttendance} from '../CurrentAttendance';
import {previousReportingPeriod} from '../dashboard-model.mjs';
import {TodayHeading} from './TodayHeading';
import {needsAttention,roleCards} from './model';
import {currentWeek,useTodayDepartment,useTodayGroups,useTodayReports,useTodaySchedule} from './data';
import {useInboxFeed} from './inbox';
import {usePendingApprovals} from './approvals';
function LoadState({pending,error,retry}:{pending:boolean;error:Error|null;retry:()=>void}){if(pending)return <p role="status">{t('ux.today.loading')}</p>;if(!error)return null;return <div role="alert"><p>{t('ux.today.loadError')}</p><Button type="button" onClick={retry}>{t('v4.d8b8392e2c')}</Button></div>;}
function PartsCard({context:c,weekend=false}:{context:Context;weekend?:boolean}){return weekend?<WeekendParts context={c}/>:<MidweekParts context={c}/>;}
function MidweekParts({context:c}:{context:Context}){
 const schedule=useTodaySchedule(c),week=currentWeek(),program=programSchema.safeParse(schedule.data?.draft?.programs?.[week]);
 const parts=program.success?program.data.parts:[],assignments=schedule.data?.draft?.assignments[week]||{};
 const assigned=parts.filter(part=>assignments[part.id]?.personId).length;
 return <section className="card stack" data-today-role="oclm"><h2>{t('ux.today.parts')}</h2><p>{t('ux.today.midweek')} · <span className="today-figures">{assigned} / {parts.length}</span> {t('ux.today.assigned')}</p><LoadState pending={schedule.isPending} error={schedule.error} retry={()=>void schedule.refetch()}/>{!program.success&&<p>{t('ux.today.noProgramme')}</p>}<Button type="button" onClick={()=>navigateRoute({screen:'schedule',tab:'midweek',week:monday(week)})}>{t('ux.today.assign')}</Button></section>;
}
function WeekendParts({context:c}:{context:Context}){
 const week=currentWeek(),query=useQuery({queryKey:['today-weekend',c.cong,week],queryFn:async()=>demo?null:z.object({data:z.record(z.string(),z.unknown()).nullable()}).parse(await rpc('ca_v2_get_weekend',{p_cong_id:c.cong,p_week:monday(week)})).data});
 const parts=['chairman','speaker','conductor','reader','prayer'],assigned=parts.filter(key=>query.data?.[key]).length;
 return <section className="card stack" data-today-role="weekend"><h2>{t('ux.today.parts')}</h2><p>{t('ux.today.weekend')} · <span className="today-figures">{assigned} / {parts.length}</span> {t('ux.today.assigned')}</p><LoadState pending={query.isPending} error={query.error} retry={()=>void query.refetch()}/><Button type="button" onClick={()=>navigateRoute({screen:'schedule',tab:'weekend',week:monday(week)})}>{t('ux.today.assign')}</Button></section>;
}
function DutyCard({context:c,department}:{context:Context;department:string}){
 const query=useTodayDepartment(c,department),week=Object.keys(query.data?.assignments||{}).filter(week=>week>=currentWeek()&&Object.values(query.data?.assignments[week]||{}).some(row=>!['cancelled','completed'].includes(row.status||'')&&(row.publisherId||row.personId))).sort()[0];
 return <section className="card stack" data-today-role={department}><h2>{t('ux.today.duty')}</h2><p>{departmentLabel(department)}{week&&<> · <span className="chip" translate="no">{week}</span></>}</p><LoadState pending={query.isPending} error={query.error} retry={()=>void query.refetch()}/>{!query.isPending&&!query.error&&!week&&<p>{t('ux.today.noDuty')}</p>}<Button type="button" onClick={()=>navigateRoute({screen:'schedule',tab:'duties',view:department,week:monday(week||currentWeek())})}>{t('ux.today.roster')}</Button></section>;
}
function GroupCard({context:c,period}:{context:Context;period:string}){
 const query=useTodayGroups(c,period),groups=query.data||[],missing=groups.reduce((sum,group)=>sum+Math.max(0,group.total-group.submitted),0);
 return <section className="card stack" data-today-role="group_overseer"><h2>{t('ux.today.group')}</h2><LoadState pending={query.isPending} error={query.error} retry={()=>void query.refetch()}/>{query.isSuccess&&<p><span className="today-figures">{missing}</span> {t('ux.today.groupMissing')}</p>}<div className="actions"><Button type="button" onClick={()=>navigateRoute({screen:'reports',action:'review',month:period})}>{t('ux.today.remind')}</Button>{groups.filter(group=>group.token).map(group=><Button key={group.id} type="button" onClick={()=>{void navigator.clipboard.writeText(location.origin+import.meta.env.BASE_URL+'?form=report#token='+encodeURIComponent(group.token!)).then(()=>c.notify(t('ux.today.linkCopied'))).catch(()=>c.notify(t('ux.today.copyError')));}}>{t('ux.today.copyGroupLink')} · {group.name}</Button>)}{!groups.some(group=>group.token)&&<Button type="button" onClick={()=>navigateRoute({screen:'access'})}>{t('ux.today.copyGroupLink')}</Button>}</div></section>;
}
function FieldCard({context:c,period}:{context:Context;period:string}){
 const reports=useTodayReports(c,period);
 return <section className="card stack" data-today-role="field_service"><h2>{t('ux.today.reportsIn')}</h2><LoadState pending={reports.pending} error={reports.error} retry={reports.retry}/>{!reports.pending&&!reports.error&&<p className="today-figures">{reports.summary.submitted} / {reports.summary.publishers}</p>}<Button type="button" onClick={()=>navigateRoute({screen:'reports',month:period})}>{t('ux.today.openReports')}</Button></section>;
}
export function OverseerToday({context:c,go,timezone}:{context:Context;go:(route:string)=>void;timezone:string}){
 const period=previousReportingPeriod(new Date(),timezone);
 return <div className="today stack"><TodayHeading/><div className="today-role-cards stack">{roleCards(c.roles).map(role=><RoleCard key={role} role={role} context={c} period={period}/>)}</div>{c.roles.includes('publisher')&&<PublisherHome context={c} go={go} embedded/>}</div>;
}
export function AdminToday({context:c,setupStep,openSetup,addPublisher,timezone,openInbox}:{context:Context;setupStep:number;openSetup:()=>void;addPublisher:()=>void;timezone:string;openInbox:()=>void}){
 const period=previousReportingPeriod(new Date(),timezone),reports=useTodayReports(c,period),schedule=useTodaySchedule(c),approvals=usePendingApprovals(c),cache=useQueryClient(),[showAll,setShowAll]=React.useState(false);
 const notifications=useInboxFeed(c);
 const meeting=useQuery({queryKey:['current-meeting',c.cong],queryFn:async()=>demo?{configured:true,count:null,canSubmit:true,kind:'midweek'}:z.object({configured:z.boolean(),count:z.number().nullable().optional(),canSubmit:z.boolean().optional(),kind:z.string().nullable().optional()}).parse(await rpc('ca_v3_meeting_context',{p_cong_id:c.cong}))});
 const week=currentWeek(),unassigned=unassignedParts(schedule.data?.draft,week);
 const rows=needsAttention({setupStep,requests:approvalCount(approvals.data),missing:missingCount(reports),unassigned,attendance:attendanceMissing(meeting.data),updates:updateCount(notifications.data)});
 const actions:Record<string,()=>void>={setup:openSetup,requests:openInbox,missing:()=>navigateRoute({screen:'reports',action:'review',month:period}),unassigned:()=>navigateRoute({screen:'schedule',tab:'midweek',week:monday(week)}),attendance:()=>navigateRoute({screen:'reports',tab:'attendance'}),updates:openInbox};
 const labels={setup:t('ux.today.finishSetup'),requests:t('ux.today.requests'),missing:t('ux.today.missing'),unassigned:t('ux.today.unassigned'),attendance:t('ux.today.attendanceMissing'),updates:t('ux.today.contactUpdates')};
 const actionLabels={setup:t('ux.today.continue'),requests:t('ux.today.review'),missing:t('ux.today.remind'),unassigned:t('ux.today.assign'),attendance:t('ux.today.record'),updates:t('ux.today.view')};
 const pending=[reports.pending,schedule.isPending,approvals.isPending,notifications.isPending,meeting.isPending].some(Boolean),error=[reports.error,schedule.error,approvals.error,notifications.error,meeting.error].find(Boolean)??null;
 return <div className="today stack"><TodayHeading/>{syncWarning(error)&&<span className="chip today-sync" role="status">{t(!navigator.onLine?'ux.today.offline':'ux.today.syncAttention')}</span>}<div className="today-admin-columns"><section className="card stack"><h2>{t('ux.today.attention')}</h2><LoadState pending={pending} error={error} retry={()=>{reports.retry();void cache.invalidateQueries({queryKey:['today-schedule']});void approvals.refetch();void notifications.refetch();void meeting.refetch();}}/>{rows.slice(0,showAll?rows.length:ATTENTION_LIMIT).map(row=><div className="today-attention-row" key={row.id}>{row.id==='updates'?<Info aria-hidden="true"/>:<AlertCircle aria-hidden="true"/>}<p><span className="today-figures">{attentionCount(row)}</span> {labels[row.id as keyof typeof labels]}{row.id==='missing'&&<> · {period}</>}</p><Button type="button" onClick={actions[row.id]}>{actionLabels[row.id as keyof typeof actionLabels]}</Button></div>)}{rows.length>ATTENTION_LIMIT&&<Button className="v4-text-button" type="button" onClick={()=>setShowAll(!showAll)}>{t(showAll?'ux.today.showLess':'ux.today.seeAll')}</Button>}{!pending&&!error&&!rows.length&&<><p>{t('ux.today.upToDate')}</p><Button type="button" onClick={()=>navigateRoute({screen:'schedule'})}>{t('ux.today.programme')}</Button></>}</section><div className="stack"><MonthSummary reports={reports} period={period}/><section className="card stack"><h2>{t('ux.today.shortcuts')}</h2><div className="today-shortcuts"><Button type="button" onClick={addPublisher}>{t('ux.today.addPublisher')}</Button><Button type="button" onClick={()=>navigateRoute({screen:'reports',action:'entry',month:period})}>{t('ux.today.enterReport')}</Button><Button type="button" onClick={()=>navigateRoute({screen:'schedule',tab:'midweek',week:monday(week)})}>{t('ux.today.assignWeek')}</Button><Button type="button" onClick={()=>navigateRoute({screen:'pdf',doc:'s21'})}>{t('ux.today.s21')}</Button></div></section></div></div></div>;
}

const ATTENTION_LIMIT=5;
function departmentLabel(department:string){if(department==='av')return t('duties.av');if(department==='cleaning')return t('duties.cleaning');return t('duties.attendant');}
function RoleCard({role,context:c,period}:{role:string;context:Context;period:string}){
 if(role==='attendance')return <CurrentAttendance context={c} today/>;
 if(role==='oclm'||role==='weekend')return <PartsCard context={c} weekend={role==='weekend'}/>;
 if(role==='group_overseer')return <GroupCard context={c} period={period}/>;
 if(role==='field_service')return <FieldCard context={c} period={period}/>;
 return <DutyCard context={c} department={role}/>;
}
function approvalCount(rows:unknown[]|undefined){return rows?.length||0;}
function updateCount(rows:z.infer<typeof notificationSchema>[]|undefined){return rows?.filter(row=>!row.read_at).length||0;}
function missingCount(reports:ReturnType<typeof useTodayReports>){return reports.pending||reports.error?0:reports.summary.pending;}
function attendanceMissing(meeting:{configured:boolean;canSubmit?:boolean;count?:number|null;kind?:string|null}|undefined){return !!(meeting?.configured&&meeting.canSubmit&&meeting.count===null&&['midweek','weekend'].includes(meeting.kind||''));}
function attentionCount(row:ReturnType<typeof needsAttention>[number]){if(row.id==='setup')return `${row.count} / 10`;return row.id==='attendance'?'':row.count;}
function MonthSummary({reports,period}:{reports:ReturnType<typeof useTodayReports>;period:string}){return <section className="card stack"><h2>{t('ux.today.thisMonth')}</h2><p>{new Date(period+'-01T12:00:00').toLocaleDateString(document.documentElement.lang||undefined,{month:'long',year:'numeric'})}</p>{!reports.pending&&!reports.error&&<><div className="list-row"><span>{t('ux.today.reportsIn')}</span><strong className="today-figures">{reports.summary.submitted} / {reports.summary.publishers}</strong></div><progress aria-label={t('ux.today.reportsIn')} max={Math.max(1,reports.summary.publishers)} value={reports.summary.submitted}/><div className="list-row"><span>{t('home.hours')}</span><strong className="today-figures">{reports.summary.hours}</strong><span>{t('home.studies')}</span><strong className="today-figures">{reports.summary.studies}</strong></div></>}<Button type="button" onClick={()=>navigateRoute({screen:'reports',month:period})}>{t('ux.today.openReports')}</Button></section>;}

function unassignedParts(draft:ScheduleDraft|null|undefined,week:string){const program=programSchema.safeParse(draft?.programs?.[week]);if(!program.success)return 0;return program.data.parts.filter(part=>!draft?.assignments[week]?.[part.id]?.personId).length;}

function syncWarning(error:Error|null){return !navigator.onLine||Boolean(error);}
