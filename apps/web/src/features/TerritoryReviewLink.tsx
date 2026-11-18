// ?territory-review#token=… : the congregation's admin checks the territory cards from one private link, with no sign-in.
// The same review screen as in the workspace; the link's token stands in for the sign-in (see setReviewLink).
import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {CheckCheck} from 'lucide-react';
import {Skeleton} from '../../../../packages/ui/components';
import {Toast} from '../../../../packages/ui/Notices';
import * as api from './territory-api';
import {useTerritoryTheme} from './territory-prefs';
import {ReviewScreen} from './TerritoryReview';
import {territoryUrl} from './territory-site';
import './territory.css';

export function TerritoryReviewLink(){
 useTerritoryTheme();
 const [token]=React.useState(()=>{const t=new URLSearchParams(location.hash.slice(1)).get('token')||'';api.setReviewLink(t);return t;});
 const [notice,setNotice]=React.useState('');
 const q=useQuery({queryKey:['tm','review-link',token],queryFn:()=>api.reviewLinkData(token),retry:false});
 React.useEffect(()=>{document.title='Check your territory cards · Congregation Assistant';},[]);
 if(q.error)return <main className="tm tm-center"><section className="tm-raised tm-login stack"><h1>{'Check your territory cards'}</h1><p role="alert">{(q.error as Error).message}</p></section></main>;
 if(!q.data)return <main className="tm tm-center"><Skeleton label={'Opening your cards…'}/></main>;
 const d=q.data,approved=d.workspace.review_state==='approved';
 return <main className="tm"><div className="tm-main stack">
  <p className="muted">{d.workspace.name}</p>
  {approved?<section className="tm-raised stack" role="status"><h1><CheckCheck aria-hidden="true"/>{' All cards approved'}</h1>
   <p>{'Thank you. We are making the full map now, and we will email you when everything is ready to download.'}</p>
   <p><a className="button" href={territoryUrl('territory')}>{'Open the territory manager'}</a></p></section>
  :<ReviewScreen d={d} ws={d.workspace.id} refresh={()=>q.refetch()} notify={setNotice} owner={false}/>}
  {notice&&<Toast message={notice} onClose={()=>setNotice('')}/>}
 </div></main>;
}
