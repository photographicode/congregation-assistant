import {qualified,available,type Program} from './meeting';
import type {ScheduleDraft} from './repositories';
export function prepareAssignment(draft:ScheduleDraft,week:string,part:Program['parts'][number],personId:string){
 const person=draft.personnel.find(row=>row.id===personId);if(!person)throw Error('This publisher is not in the approved meeting roster.');
 if(!qualified(person,part.type)||!available(person,week))throw Error('This publisher is unavailable or is not qualified for this part.');
 const assigned=draft.assignments[week]||{};
 const duplicate=Object.entries(assigned).filter(([key,value])=>key!==part.id&&value.personId===personId);
 return {draft:{...draft,assignments:{...draft.assignments,[week]:{...assigned,[part.id]:{personId,assignmentType:part.type,customTitle:part.title,status:'scheduled'}}}},caution:duplicate.length?'This publisher already has another part in this meeting. Review timing before confirming.':null};
}
