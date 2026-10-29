import {useQuery} from '@tanstack/react-query';
import {z} from 'zod';
import {format} from 'date-fns';
import {repositories} from '../../../../../packages/core/repositories';
import {demoPublishers} from '../../../../../packages/core/demo-publishers';
import {demo,rpc,storeFor} from '../client';
import {useDemoReports} from '../demo-reports';
import {dashboardSummary} from '../dashboard-model.mjs';
import type {Context} from '../../context';
const SERVICE_YEAR_START=9;
export function useTodayReports(c:Context,period:string){
 const repo=repositories(storeFor(c.cong,c.roles),c.cong,demo),[year=0,month=1]=period.split('-').map(Number),serviceYear=year+(month>=SERVICE_YEAR_START?1:0),local=useDemoReports(s=>s.rows);
 const people=useQuery({queryKey:['dashboard-people',c.cong],queryFn:()=>repo.people.list(),enabled:!demo});
 const reports=useQuery({queryKey:['reports',c.cong,serviceYear,month-1],queryFn:()=>repo.reports.list(serviceYear,month-1),enabled:!demo});
 return {summary:dashboardSummary(demo?demoPublishers:people.data||[],demo?local.filter(row=>row.service_year===serviceYear&&row.month===month-1):reports.data||[]),pending:!demo&&(people.isPending||reports.isPending),error:people.error||reports.error,retry:()=>{void people.refetch();void reports.refetch();}};
}
export function useTodaySchedule(c:Context){return useQuery({queryKey:['today-schedule',c.cong],queryFn:()=>demo?{revision:0,draft:null,publication:null}:repositories(storeFor(c.cong,c.roles),c.cong).schedules.get()});}
const groupsSchema=z.array(z.object({id:z.string(),name:z.string(),token:z.string().nullable(),total:z.number(),submitted:z.number(),lastSubmission:z.string().nullable()}));
export function useTodayGroups(c:Context,period:string){
 const [year=0,month=1]=period.split('-').map(Number);
 return useQuery({queryKey:['home-group-links',c.cong,period],queryFn:async()=>demo?[{id:'1',name:'Group 1',token:null,total:2,submitted:1,lastSubmission:null}]:groupsSchema.parse(await rpc('ca_v3_home_group_links',{p_cong_id:c.cong,p_year:year+(month>=SERVICE_YEAR_START?1:0),p_month:month-1}))});
}
const departmentSchema=z.object({people:z.array(z.object({status:z.string()})),assignments:z.record(z.string(),z.record(z.string(),z.object({name:z.string().optional(),status:z.string().optional(),publisherId:z.string().nullable().optional(),personId:z.string().nullable().optional()})))});
export function useTodayDepartment(c:Context,department:string){return useQuery({queryKey:['today-department',c.cong,department],queryFn:async()=>demo?{people:[],assignments:{}}:departmentSchema.parse(await rpc('get_department_workspace',{p_cong_id:c.cong,p_department:department}))});}
export function currentWeek(){return format(new Date(),"RRRR-'W'II");}
