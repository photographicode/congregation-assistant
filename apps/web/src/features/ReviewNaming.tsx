// Inside the card review, the congregation's admin also checks each territory's name and landmarks: the naming link's
// editor (street map, locality name, landmarks, note) for one card at a time. Available only while the cards are in
// review; the owner pulls the names into the generator from Requests, as with any naming link.
import React from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Dialog} from '../../../../packages/ui/Dialog';
import * as api from './territory-api';
import {blank,Editor} from './TerritoryNaming';
import type {Geometry} from './naming-map';

const key=(ws:string)=>['tm','review-naming',ws];
/** The workspace's naming list with what the admin has written so far; null when the cards were sent without one. */
export function useReviewNaming(ws:string,on:boolean){
 return useQuery({queryKey:key(ws),enabled:on,retry:false,queryFn:async()=>{
  const token=await api.reviewNaming(ws);
  return token?{token,naming:await api.namingGet(token)}:null;
 }});
}

/** One territory's name and landmarks, in a dialog over the review. */
export function SuggestDialog({ws,number,onClose}:{ws:string;number:string;onClose:()=>void}){
 const q=useReviewNaming(ws,true),client=useQueryClient();
 const [entry,setEntry]=React.useState<api.NamingEntry|null>(null);
 const d=q.data,t=d?.naming.territories.find(x=>x.number===number);
 const close=()=>{void client.invalidateQueries({queryKey:key(ws)});onClose();};
 const saved=t&&d?d.naming.entries.find(e=>e.number===number)??blank(t):null;
 return <Dialog open onClose={close} title={`Territory ${number}: name and landmarks`}><div className="tm-dialog">
  {d&&t&&saved?<Editor token={d.token} territory={t} editable={d.naming.landmarks_editable} others={d.naming.territories.filter(x=>x.number!==number).map(x=>x.geometry as Geometry)}
   entry={entry??saved} onChange={setEntry} onSubmitted={close}/>
   :<p className="muted" role="status">{q.isLoading?'Opening the map…':'This territory has no outline to name. Write a comment on the card instead.'}</p>}
 </div></Dialog>;
}
