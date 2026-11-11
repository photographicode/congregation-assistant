// Territory dashboard: headline numbers, status split, monthly activity, service-year coverage and the
// territories left longest. Every chart is tappable: a segment or bar filters or opens what it counts.
import React from 'react';
import {TriangleAlert} from 'lucide-react';
import {Chip} from '../../../../packages/ui/components';
import {addDays,daysBetween,FILTERS,fmt,serviceYearLabel,serviceYearOf,STATUS_LABEL,summarize,today,type Filter,type Status,type Summary,type Territory,type WorkspaceData} from './territory-model';

const DUE_SOON_DAYS=14,DASH_ISSUES=6,MONTHS=12,IDLE_ROWS=5,PERCENT=100,MONTH_END=7;
// Fixed categorical order; colours live in territory.css as --tm-s1..--tm-s4 (validated light and dark).
const STATUS_ORDER:Status[]=['in_use','available','recent','never'];
// Each headline tile carries its chart colour, so the numbers and the charts read as one.
const DOT:Record<Filter,string>={all:'tm-accent',in_use:'tm-s1',overdue:'tm-danger',available:'tm-s2',recent:'tm-s3',never:'tm-s4'};
type Props={d:WorkspaceData;show:(f:Filter)=>void;openTerritory:(id:string)=>void};
type Item={t:Territory;s:Summary};
/** Sizes a mark through a CSS variable, so the stylesheet keeps the layout. */
const sized=(value:number)=>(el:HTMLElement|null)=>{el?.style.setProperty('--v',String(value));};

function useTip(){
 const [tip,setTip]=React.useState('');
 const bind=(text:string)=>({onMouseEnter:()=>setTip(text),onFocus:()=>setTip(text),onMouseLeave:()=>setTip(''),onBlur:()=>setTip(''),'aria-label':text});
 return {tip,bind};
}

function StatusSplit({items,show}:{items:Item[];show:(f:Filter)=>void}){
 const {tip,bind}=useTip(),total=items.length||1;
 const counts=STATUS_ORDER.map((status,i)=>({status,slot:i+1,n:items.filter(x=>x.s.status===status).length}));
 return <section className="tm-raised stack tm-chart">
  <h2>{'Where territories are'}</h2>
  <div className="tm-split" role="group" aria-label={'Territories by status'}>
   {counts.filter(c=>c.n).map(c=><button type="button" key={c.status} ref={sized(c.n)} className={'tm-seg tm-s'+c.slot} onClick={()=>show(c.status)} {...bind(`${STATUS_LABEL[c.status]}: ${c.n} of ${items.length} (${Math.round(c.n/total*PERCENT)}%)`)}/>)}
  </div>
  <p className="tm-tip" aria-live="polite">{tip||'Tap a colour to see those territories.'}</p>
  <ul className="tm-legend">{counts.map(c=><li key={c.status}><button type="button" onClick={()=>show(c.status)}><span className={'tm-swatch tm-s'+c.slot} aria-hidden="true"/>{STATUS_LABEL[c.status]}<strong>{c.n}</strong></button></li>)}</ul>
 </section>;
}

function monthKeys(on:string){
 const [y=0,m=1]=on.split('-').map(Number);
 return Array.from({length:MONTHS},(_,i)=>new Date(Date.UTC(y,m-MONTHS+i,1)).toISOString().slice(0,MONTH_END));
}
function MonthlyActivity({d}:{d:WorkspaceData}){
 const {tip,bind}=useTip(),keys=monthKeys(today());
 const rows=keys.map(k=>({k,out:d.assignments.filter(a=>a.taken_on.startsWith(k)).length,back:d.assignments.filter(a=>a.returned_on?.startsWith(k)).length}));
 const max=Math.max(1,...rows.map(r=>r.out));
 const label=(k:string)=>new Date(k+'-01T00:00:00').toLocaleDateString(undefined,{month:'short'});
 const long=(k:string)=>new Date(k+'-01T00:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'});
 return <section className="tm-raised stack tm-chart">
  <h2>{'Given out each month'}</h2>
  <div className="tm-columns" role="group" aria-label={'Territories given out in the last 12 months'}>
   {rows.map(r=><button type="button" key={r.k} className="tm-col" {...bind(`${long(r.k)}: ${r.out} given out, ${r.back} returned`)}>
    <span ref={sized(r.out/max*PERCENT)} className="tm-col-plot"><span className="tm-col-bar tm-s1"/><span className="tm-col-value">{r.out||''}</span></span>
    <span className="tm-col-label" aria-hidden="true">{label(r.k)}</span>
   </button>)}
  </div>
  <p className="tm-tip" aria-live="polite">{tip||'Tap a month for details.'}</p>
  <table className="sr-only"><caption>{'Given out and returned by month'}</caption><thead><tr><th>{'Month'}</th><th>{'Given out'}</th><th>{'Returned'}</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.k}><td>{long(r.k)}</td><td>{r.out}</td><td>{r.back}</td></tr>)}</tbody></table>
 </section>;
}

function Coverage({d,items}:{d:WorkspaceData;items:Item[]}){
 const year=serviceYearOf(today()),start=`${year-1}-09-01`;
 const worked=items.filter(({t})=>d.assignments.some(a=>a.territory_id===t.id&&(a.taken_on>=start||(a.returned_on||'')>=start))).length;
 const share=items.length?Math.round(worked/items.length*PERCENT):0;
 return <section className="tm-raised stack tm-chart">
  <h2>{'Covered this service year'}</h2>
  <p className="tm-hero-number"><strong>{worked}</strong>{` of ${items.length} territories`}</p>
  <div className="tm-meter" role="meter" aria-valuemin={0} aria-valuemax={PERCENT} aria-valuenow={share} aria-label={`Coverage ${share}%`}><span ref={sized(share)} className="tm-s1"/></div>
  <p className="muted">{`${share}% · Service year ${serviceYearLabel(year)}`}</p>
 </section>;
}

function LongestIdle({items,open}:{items:Item[];open:(id:string)=>void}){
 const now=today();
 const rows=items.filter(x=>!x.s.open&&x.s.lastReturned).map(x=>({...x,days:daysBetween(x.s.lastReturned!,now)})).sort((a,b)=>b.days-a.days).slice(0,IDLE_ROWS);
 const never=items.filter(x=>x.s.status==='never').length,max=Math.max(1,...rows.map(r=>r.days));
 return <section className="tm-raised stack tm-chart">
  <h2>{'Waiting longest since last worked'}</h2>
  {rows.length?<ul className="tm-bars">{rows.map(r=><li key={r.t.id}><button type="button" onClick={()=>open(r.t.id)}>
   <span className="tm-bar-label">{`${r.t.number} · ${r.t.name}`}</span>
   <span className="tm-bar-track"><span ref={sized(r.days/max*PERCENT)} className="tm-bar tm-s1"/></span>
   <span className="tm-bar-value">{`${r.days} days`}</span>
  </button></li>)}</ul>:<p className="muted">{'Nothing returned yet.'}</p>}
  {never>0&&<p className="muted">{never===1?'1 territory has never been given out.':`${never} territories have never been given out.`}</p>}
 </section>;
}

export function Dashboard({d,show,openTerritory}:Props){
 const now=today();
 const items=d.territories.map(t=>({t,s:summarize(t.id,d.assignments,d.workspace.recent_days,now)}));
 const count=(f:Filter)=>items.filter(({s})=>f==='all'||(f==='overdue'?s.overdue:s.status===f)).length;
 const openIssues=d.reports.filter(r=>!r.resolved_at);
 const due=items.filter(({s})=>s.open&&s.open.due_on<=addDays(now,DUE_SOON_DAYS)).sort((a,b)=>a.s.open!.due_on.localeCompare(b.s.open!.due_on));
 const name=(id:string)=>{const t=d.territories.find(x=>x.id===id);return t?`${t.number} · ${t.name}`:'';};
 return <div className="stack">
  <h1>{'Dashboard'}</h1>
  <div className="tm-kpis">{FILTERS.map(f=><button key={f.value} type="button" className={'tm-raised tm-kpi'+(f.value==='overdue'&&count('overdue')?' tm-alert':'')} onClick={()=>show(f.value)}><span><i className={'tm-dot '+DOT[f.value]} aria-hidden="true"/>{f.value==='all'?'Total':f.label}</span><strong>{count(f.value)}</strong></button>)}</div>
  <div className="tm-charts">
   <StatusSplit items={items} show={show}/>
   <Coverage d={d} items={items}/>
   <MonthlyActivity d={d}/>
   <LongestIdle items={items} open={openTerritory}/>
  </div>
  <div className="tm-two">
   <section className="tm-raised stack"><h2>{'Due soon and overdue'}</h2>
    {due.length?due.map(({t,s})=><button type="button" key={t.id} className="tm-row" onClick={()=>openTerritory(t.id)}><strong>{t.number}</strong><span>{t.name}<small>{s.open!.publisher}</small></span><Chip tone={s.overdue?'danger':'warn'}>{(s.overdue?'Overdue ':'Due ')+fmt(s.open!.due_on)}</Chip></button>)
    :<p className="muted">{`Nothing is due in the next ${DUE_SOON_DAYS} days.`}</p>}
   </section>
   <section className="tm-raised stack"><h2>{'Open issues'}</h2>
    {openIssues.length?openIssues.slice(0,DASH_ISSUES).map(r=><button type="button" key={r.id} className="tm-row" onClick={()=>openTerritory(r.territory_id)}><TriangleAlert/><span>{r.household||'Issue'}<small>{name(r.territory_id)+' · '+r.details}</small></span></button>)
    :<p className="muted">{'No open issues. Publishers report them with the issue link in Settings.'}</p>}
   </section>
  </div>
 </div>;
}
