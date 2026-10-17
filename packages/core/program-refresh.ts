import type {Program} from './meeting';

/** Source text may change; persisted assignment slot identities must not. */
export function refreshProgram(previous:Program|null,incoming:Program):Program {
 if(!previous)return incoming;
 const group=(part:Program['parts'][number])=>part.section+':'+part.type;
 const used=new Set<string>();
 const matches=incoming.parts.map(part=>{
  const prior=previous.parts.filter(old=>group(old)===group(part));
  const peers=incoming.parts.filter(other=>group(other)===group(part));
  const exact=prior.filter(old=>old.title===part.title);
  const match=prior.find(old=>old.id===part.id&&!used.has(old.id))
   ||(exact.length===1&&!used.has(exact[0].id)?exact[0]:undefined)
   ||(prior.length===peers.length?prior[peers.indexOf(part)]:undefined);
  if(!match||used.has(match.id))return null;
  used.add(match.id);return match.id;
 });
 const reserved=new Set(matches.filter((id):id is string=>id!==null));
 const parts=incoming.parts.map((part,index)=>{
  let id=matches[index]||part.id;
  if(!matches[index]){let suffix=0;while(reserved.has(id))id='Source'+part.id+(++suffix);reserved.add(id);}
  return {...part,id};
 });
 return {...incoming,meetingDate:previous.meetingDate,startTime:previous.startTime,parts};
}
