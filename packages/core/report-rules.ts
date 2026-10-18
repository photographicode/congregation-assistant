export type ReportPerson={is_rp?:boolean|null;is_sp?:boolean|null;is_fm?:boolean|null};
export function v1PublicReport(person:ReportPerson,values:{shared:boolean;studies:number;hours:number;comments:string}){
 const {shared,studies,hours,comments}=values;
 if(!Number.isInteger(studies)||studies<0||studies>1000)throw Error('Enter a whole number of studies from 0 to 1000.');
 if(!Number.isFinite(hours)||hours<0||hours>744||!Number.isInteger(hours*4))throw Error('Enter hours from 0 to 744 in quarter-hour steps.');
 if(comments.length>2000)throw Error('Keep comments within 2000 characters.');
 return {shared_in_ministry:shared,studies:shared?studies:0,hours:shared?hours:0,comments:shared?comments:'Not Participated',is_ap:shared&&hours>0&&!person.is_rp&&!person.is_sp&&!person.is_fm};
}
export function previousReportingMonth(timezone='UTC',now=new Date()){
 const parts=new Intl.DateTimeFormat('en',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts(now),year=Number(parts.find(p=>p.type==='year')!.value),month=Number(parts.find(p=>p.type==='month')!.value);
 return month===1?`${year-1}-12`:`${year}-${String(month-1).padStart(2,'0')}`;
}
