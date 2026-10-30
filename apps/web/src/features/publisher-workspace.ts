import {useQuery} from '@tanstack/react-query';
import {portalSchema,type PublisherPortal} from '../../../../packages/core/publisher-workspace';
import {demo,rpc} from './client';
import {useDemoReports} from './demo-reports';
import type {Context} from '../context';
const SERVICE_YEAR_START=8;
function publisherDemo():PublisherPortal {
 const now=new Date(),date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+2),previous=new Date(now.getFullYear(),now.getMonth()-1,1),serviceYear=previous.getFullYear()+(previous.getMonth()>=SERVICE_YEAR_START?1:0),record=useDemoReports.getState().rows.find(row=>row.pub_id==='daniel'&&row.month===previous.getMonth()&&row.service_year===serviceYear);
 return portalSchema.parse({name:'Daniel Thomas',publisherId:'daniel',report:{period:previous.toLocaleDateString(document.documentElement.lang||undefined,{month:'long',year:'numeric'}),submitted:Boolean(record),record,month:previous.getMonth(),serviceYear},assignments:[{date:[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'),title:'Congregation Bible study',time:'19:00'}],contact:{phone:'+91 90000 00000',address:'River Park',emergency_name:'Maria Thomas',emergency_relationship:'Spouse',emergency_phone:'+91 90000 00001'},away:[],scheduleRevision:0});
}
export const publisherKey=(c:Context)=>['publisher-portal',c.account||'demo',c.cong];
export function usePublisherPortal(c:Context,fresh=false){return useQuery({queryKey:publisherKey(c),queryFn:async()=>portalSchema.parse(demo?publisherDemo():await rpc('get_my_publisher_portal',{p_cong_id:c.cong})),staleTime:30_000,refetchOnMount:fresh?'always':true});}
