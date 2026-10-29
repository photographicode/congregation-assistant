import {format} from 'date-fns';
import {monday} from '../../../packages/core/meeting';
import {useRouteField} from './useRoute';
export function useScheduleWeek(){
 const [date,setDate]=useRouteField('week',monday(format(new Date(),"RRRR-'W'II")));
 const week=format(new Date(date+'T12:00:00'),"RRRR-'W'II");
 return [week,(next:string)=>setDate(monday(next))] as const;
}
