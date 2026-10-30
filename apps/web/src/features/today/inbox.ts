import {useQuery} from '@tanstack/react-query';
import {z} from 'zod';
import {notificationSchema} from '../../../../../packages/core/publisher-workspace';
import type {Context} from '../../context';
import {demo,rpc} from '../client';
import {inboxCount} from './model';
import {usePendingApprovals} from './approvals';
export function useInboxFeed(c:Context){return useQuery({queryKey:['v4-admin-notifications',c.account||'demo',c.cong],enabled:!!c.cong&&c.roles.includes('admin'),refetchInterval:60_000,queryFn:async()=>z.array(notificationSchema).parse(demo?[]:await rpc('ca_v4_admin_notifications',{p_cong_id:c.cong}))});}
export function useInboxCount(c:Context){const feed=useInboxFeed(c),approvals=usePendingApprovals(c);return inboxCount(feed.data||[],approvals.data?.length||0);}
