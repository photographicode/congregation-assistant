// Counts behind the territory owner overview. Pure, so it is tested without a browser.
import type {HelpRequest,HelpStatus} from './territory-api';

const DAY_MS=86_400_000,WEEK_DAYS=7;
/** Counts for the overview tiles; `now` is passed in so the week boundary is testable. */
export function helpSummary(rows:HelpRequest[],now:number){
 const count=(s:HelpStatus)=>rows.filter(r=>r.status===s).length;
 return {newCount:count('new'),inProgress:count('in_progress'),done:count('done'),
  thisWeek:rows.filter(r=>now-Date.parse(r.created_at)<WEEK_DAYS*DAY_MS).length,
  withFiles:rows.filter(r=>r.files.length>0).length};
}

