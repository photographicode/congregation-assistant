// Owner overview: what needs attention across territory requests and workspaces, at a glance.
import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {ArrowRight,Building2,FileUp,Inbox,Wand2} from 'lucide-react';
import {Chip} from '../../../../packages/ui/components';
import * as api from './territory-api';
import {generatorUrl} from './territory-site';
import {helpSummary} from './help-summary';

const RECENT=5;
type Go=(tab:'requests'|'workspaces')=>void;
const STATUS_TEXT:Record<api.HelpStatus,string>={new:'New',in_progress:'In progress',done:'Done',declined:'Declined'};
const STATUS_TONE:Record<api.HelpStatus,'default'|'warn'|'ok'|'danger'>={new:'warn',in_progress:'default',done:'ok',declined:'danger'};

const headline=(n:number)=>n?`${n} new ${n===1?'request':'requests'} waiting`:'No new requests';
function workspaceSummary(o:Awaited<ReturnType<typeof api.ownerOverview>>|undefined){
 const ws=o?.workspaces||[];
 return {workspaces:ws.length,territories:ws.reduce((n,w)=>n+w.territories,0),pendingWs:(o?.applications||[]).filter(a=>a.status==='pending').length};
}

export function TerritoryOwnerOverview({go}:{go:Go}){
 const help=useQuery({queryKey:['tm','help'],queryFn:api.helpRequests});
 const owner=useQuery({queryKey:['tm','owner'],queryFn:api.ownerOverview});
 const rows=help.data||[];
 const s=helpSummary(rows,Date.now());
 const {workspaces:wsCount,territories,pendingWs}=workspaceSummary(owner.data);
 return <section className="stack tm-overview">
  <div className="tm-ov-hero tm-raised">
   <div><p className="tm-eyebrow">{'Territory owner'}</p><h2>{headline(s.newCount)}</h2>
    <p className="muted">{`${s.thisWeek} this week · ${s.inProgress} in progress · ${s.done} done`}</p></div>
   <div className="actions"><button type="button" className="button primary" onClick={()=>go('requests')}><Inbox/>{'Open requests'}</button><a className="button" href={generatorUrl()} target="tm-generator"><Wand2/>{'Generator'}</a></div>
  </div>
  <div className="tm-ov-kpis">
   <Tile label={'New requests'} value={s.newCount} warn={s.newCount>0}/>
   <Tile label={'In progress'} value={s.inProgress}/>
   <Tile label={'With boundary files'} value={s.withFiles}/>
   <Tile label={'Workspaces'} value={wsCount} note={pendingWs?`${pendingWs} waiting for approval`:undefined}/>
   <Tile label={'Territories kept'} value={territories}/>
  </div>
  {(help.error||owner.error)&&<p role="alert">{'Some figures could not load. Open Requests or Workspaces to retry.'}</p>}
  <Recent rows={rows} loading={help.isLoading} go={go}/>
  {pendingWs>0&&<button type="button" className="tm-raised tm-ov-alert" onClick={()=>go('workspaces')}><Building2/>{`${pendingWs} territory workspace ${pendingWs===1?'request is':'requests are'} waiting for approval`}<ArrowRight/></button>}
 </section>;
}

function Recent({rows,loading,go}:{rows:api.HelpRequest[];loading:boolean;go:Go}){
 const recent=rows.slice(0,RECENT);
 return <div className="tm-raised stack">
  <div className="tm-section-head"><h3>{'Latest requests'}</h3><button type="button" className="button" onClick={()=>go('requests')}>{'All requests'}<ArrowRight/></button></div>
  {loading&&<p className="muted">{'Loading…'}</p>}
  {!loading&&!recent.length&&<p className="muted">{'No requests yet. They arrive from the territory request form.'}</p>}
  <ul className="tm-ov-list">{recent.map(r=><li key={r.id}><button type="button" onClick={()=>go('requests')}>
   <span className="tm-ov-main"><strong>{r.congregation_name}</strong><small className="muted">{`${r.contact_name} · ${new Date(r.created_at).toLocaleDateString(undefined,{dateStyle:'medium'})}`}</small></span>
   {r.files.length>0&&<span className="tm-ov-file" aria-label={`${r.files.length} boundary files`}><FileUp/>{r.files.length}</span>}
   <Chip tone={STATUS_TONE[r.status]}>{STATUS_TEXT[r.status]}</Chip>
  </button></li>)}</ul>
 </div>;
}

function Tile({label,value,note,warn}:{label:string;value:number;note?:string;warn?:boolean}){
 return <div className={'tm-raised tm-ov-tile'+(warn?' warn':'')}><span className="muted">{label}</span><strong>{value.toLocaleString()}</strong>{note&&<small className="muted">{note}</small>}</div>;
}
