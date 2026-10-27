import {useQuery} from '@tanstack/react-query';
import {portalSchema,type PublisherPortal} from '../../../../packages/core/publisher-workspace';
import {demo,rpc} from './client';
import type {Context} from '../context';
function publisherDemo():PublisherPortal {
 const now=new Date(),date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+2),previous=new Date(now.getFullYear(),now.getMonth()-1,1);
 return portalSchema.parse({name:'Daniel Thomas',report:{period:previous.toLocaleDateString('en',{month:'long',year:'numeric'}),submitted:false},assignments:[{date:[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'),title:'Congregation Bible study',time:'19:00'}],contact:{phone:'+91 90000 00000',address:'River Park',emergency_name:'Maria Thomas',emergency_relationship:'Spouse',emergency_phone:'+91 90000 00001'},away:[],scheduleRevision:0});
}
export const publisherKey=(c:Context)=>['publisher-portal',c.account||'demo',c.cong];
export function usePublisherPortal(c:Context){return useQuery({queryKey:publisherKey(c),queryFn:async()=>portalSchema.parse(demo?publisherDemo():await rpc('get_my_publisher_portal',{p_cong_id:c.cong})),staleTime:30_000});}
