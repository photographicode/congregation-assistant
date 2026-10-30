const SETUP_COMPLETE=10,MONTHS=12,SERVICE_YEAR_START=8;
export type AttentionInput={setupStep:number;requests:number;missing:number;unassigned:number;attendance:boolean;updates:number};
export function needsAttention(input:AttentionInput){
 return [
  {id:'setup',count:input.setupStep,show:input.setupStep<SETUP_COMPLETE},
  {id:'requests',count:input.requests,show:input.requests>0},
  {id:'missing',count:input.missing,show:input.missing>0},
  {id:'unassigned',count:input.unassigned,show:input.unassigned>0},
  {id:'attendance',count:1,show:input.attendance},
  {id:'updates',count:input.updates,show:input.updates>0},
 ].filter(row=>row.show);
}
export function reportPeriod(report:Record<string,unknown>,fallback:string){
 const month=report.month,year=report.serviceYear;
 return typeof month==='number'&&Number.isInteger(month)&&month>=0&&month<MONTHS&&typeof year==='number'?`${year-(month>=SERVICE_YEAR_START?1:0)}-${String(month+1).padStart(2,'0')}`:fallback;
}
export function roleCards(roles:string[]){return ['attendance','oclm','weekend','group_overseer','field_service','av','cleaning','attendant'].filter(role=>roles.includes(role));}

export function inboxCount(updates:{read_at:string|null}[],approvals:number){return updates.filter(update=>!update.read_at).length+approvals;}
