// Territory manager: a separate workspace kind inside Congregation Assistant, opened at ?territory.
// Admins and managers keep territory cards, assign and return them, read issue reports and export the S-13.
import React from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {ArrowLeft,ArrowRight,Copy,ShieldCheck,Download,FileText,ImagePlus,LayoutDashboard,LogOut,Map as MapIcon,MapPin,Plus,Settings as SettingsIcon,Share2,TriangleAlert,Trash2} from 'lucide-react';
import {Button,Chip,Combobox,Field,Segmented,Skeleton} from '../../../../packages/ui/components';
import {Dialog} from '../../../../packages/ui/Dialog';
import {Toast} from '../../../../packages/ui/Notices';
import {client,demo,config} from './client';
import * as api from './territory-api';
import {Dashboard} from './TerritoryDashboard';
import {addDays,byNumber,canonicalName,FILTERS,fmt,type Filter,serviceYearLabel,serviceYears,publisherNames,isDateOnly,mapsLink,serviceYearOf,STATUS_LABEL,STATUS_TONE,summarize,territoryCsv,today,type Assignment,type Issue,type Status,type Summary,type Territory,type WorkspaceData} from './territory-model';
import {cardJpeg,download,shareLinkOrCopy} from './territory-card';
import {setPrefs,usePrefs,useTerritoryTheme,type Style,type Theme,type View} from './territory-prefs';
import {ImportCsv} from './TerritoryImport';
import {mainAppUrl,signInReturnUrl} from './territory-site';
import {TerritoryOwner} from './TerritoryOwner';
import {TerritoryLanding} from './TerritoryLanding';
import {InstallBanner,InstallTerritories,standalone,useTerritoryInstallable} from './TerritoryInstall';
import './territory.css';

type Tab='dashboard'|'territories'|'issues'|'settings'|'owner';
const SORTS={number:'Number',name:'Name',idle:'Longest unused',due:'Due date'} as const;
const IMAGE_MAX=1600,THUMB_MAX=480,IMAGE_LIMIT=1_400_000,IMAGE_Q=0.82,THUMB_Q=0.7,MIN_SIZE=400,SHRINK=0.8,MIN_Q=0.5,Q_STEP=0.1,EMAIL_MAX=150;
const LAST='9999-12-31',MAP_URL_MAX=500;

type Row={t:Territory;s:Summary;issues:number};
const SORTERS:Record<keyof typeof SORTS,(a:Row,b:Row)=>number>={
 number:(a,b)=>byNumber(a.t,b.t),
 name:(a,b)=>a.t.name.localeCompare(b.t.name),
 // Territories out longest without being worked first; ones in use go last.
 idle:(a,b)=>Number(Boolean(a.s.open))-Number(Boolean(b.s.open))||(a.s.lastReturned||'').localeCompare(b.s.lastReturned||''),
 due:(a,b)=>(a.s.open?.due_on||LAST).localeCompare(b.s.open?.due_on||LAST),
};
function holder(s:Summary){
 if(s.open)return `${s.open.publisher} · due ${fmt(s.open.due_on)}`;
 if(s.lastReturned)return `Returned ${fmt(s.lastReturned)}`;
 return 'Not given out yet';
}

/** Shrinks a photo or map screenshot to WebP (JPEG where WebP is missing) so it fits the row limit. */
async function compress(file:File,max:number,quality:number){
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise<HTMLImageElement>((ok,bad)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>bad(Error('Choose a JPEG, PNG or WebP image.'));i.src=url;});
  for(let size=max,q=quality;size>=MIN_SIZE;size=Math.round(size*SHRINK),q=Math.max(MIN_Q,q-Q_STEP)){
   const scale=Math.min(1,size/Math.max(img.width,img.height)),c=document.createElement('canvas');
   c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
   c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);
   let out=c.toDataURL('image/webp',q);if(!out.startsWith('data:image/webp'))out=c.toDataURL('image/jpeg',q);
   if(out.length<=IMAGE_LIMIT)return out;
  }
  throw Error('This image is too large even after shrinking. Crop it and try again.');
 }finally{URL.revokeObjectURL(url);}
}

export default function TerritoryApp(){
 const [session,setSession]=React.useState<unknown>(demo?{}:undefined);
 useTerritoryInstallable();
 useTerritoryTheme(session!==null);
 React.useEffect(()=>{document.title='Territories · Congregation Assistant';if(demo)return;void client.auth.getSession().then(({data})=>setSession(data.session));const {data}=client.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe();},[]);
 if(session===undefined)return <main className="tm tm-center"><Skeleton label={"Opening territories…"}/></main>;
 // Signed-out visitors see the territory landing page; sign-in starts from it.
 if(!session)return <TerritoryLanding signIn={()=>void client.auth.signInWithOAuth({provider:'google',options:{redirectTo:signInReturnUrl()}})}/>;
 return <Workspaces/>;
}

function Workspaces(){
 const list=useQuery({queryKey:['tm','mine'],queryFn:api.myWorkspaces});
 const owner=useQuery({queryKey:['tm','am-owner'],queryFn:api.amSuperadmin}).data===true;
 const [chosen,setChosen]=React.useState(()=>new URLSearchParams(location.search).get('ws')||'');
 const signOut=async()=>{if(!demo)await client.auth.signOut();location.href=import.meta.env.BASE_URL+'?territory';};
 if(list.isLoading)return <main className="tm tm-center"><Skeleton label={"Finding your workspaces…"}/></main>;
 if(list.error)return <main className="tm tm-center"><section className="tm-raised tm-login stack"><h1>{'Workspaces could not load'}</h1><p role="alert">{(list.error as Error).message}</p><Button onClick={()=>void list.refetch()}>{'Retry'}</Button></section></main>;
 const rows=list.data||[];
 const ws=rows.find(w=>w.id===chosen)||(rows.length===1?rows[0]:undefined);
 if(!ws)return <main className="tm tm-center"><section className="tm-raised tm-login stack">
  <span className="tm-mark"><MapIcon/></span>
  {rows.length?<><h1>{'Choose a workspace'}</h1>{rows.map(w=><Button key={w.id} className="tm-raised-button" onClick={()=>setChosen(w.id)}>{w.name}<span className="muted">{w.role==='admin'?'Admin':'Manager'}</span></Button>)}</>
  :<><h1>{'Approval needed'}</h1><p>{'This Google account is not in any territory workspace yet. Ask your workspace admin to add it, or request a new workspace.'}</p><a className="button" href="?territory-request">{'Request a territory workspace'}</a></>}
  {owner&&<TerritoryOwner notify={()=>undefined}/>}
  <Button onClick={()=>void signOut()}><LogOut/>{'Sign out'}</Button>
 </section></main>;
 return <Manager key={ws.id} ws={ws.id} owner={owner} onSwitch={rows.length>1?()=>setChosen(''):undefined} onSignOut={()=>void signOut()}/>;
}

const TABS:{id:Tab;label:string;icon:React.ReactNode}[]=[{id:'dashboard',label:'Dashboard',icon:<LayoutDashboard/>},{id:'territories',label:'Territories',icon:<MapIcon/>},{id:'issues',label:'Issues',icon:<TriangleAlert/>},{id:'settings',label:'Settings',icon:<SettingsIcon/>},{id:'owner',label:'Owner',icon:<ShieldCheck/>}];
function TabButton({tab,active,onClick}:{tab:typeof TABS[number];active:boolean;onClick:()=>void}){
 return <button type="button" className={active?'active':''} aria-current={active?'page':undefined} onClick={onClick}>{tab.icon}<span>{tab.label}</span></button>;
}
function LoadState({loading,error,retry}:{loading:boolean;error:unknown;retry:()=>void}){
 if(loading)return <main className="tm tm-center"><Skeleton label={'Opening territories…'}/></main>;
 return <main className="tm tm-center"><section className="tm-raised tm-login stack"><h1>{'Territories could not load'}</h1><p role="alert">{(error as Error|null)?.message}</p><Button onClick={retry}>{'Retry'}</Button></section></main>;
}
function Header({d,onSwitch,onSignOut}:{d:WorkspaceData;onSwitch?:()=>void;onSignOut:()=>void}){
 const role=d.role==='admin'?'Admin':'Manager';
 return <header className="tm-top">
  <div className="tm-title"><span className="tm-mark"><MapIcon/></span><div><strong>{d.workspace.name}</strong><small>{'Territory manager · '+role+(demo?' · Fictional demo':'')}</small></div></div>
  <div className="tm-top-actions">{onSwitch&&<Button onClick={onSwitch}>{'Switch'}</Button>}{!standalone()&&<a className="button tm-back" href={mainAppUrl()} aria-label={'Back to Congregation Assistant'}><ArrowLeft/><span>{'Congregation Assistant'}</span></a>}<Button onClick={onSignOut} aria-label={'Sign out'}><LogOut/></Button></div>
 </header>;
}
/** Territory images share one shape; cards and the detail image take it from the first image. */
function useImageRatio(territories?:Territory[]){
 const src=territories?.find(t=>t.thumb)?.thumb;
 React.useEffect(()=>{
  if(!src)return;
  const img=new Image();
  img.onload=()=>{if(img.naturalWidth&&img.naturalHeight)document.documentElement.style.setProperty('--tm-ratio',`${img.naturalWidth} / ${img.naturalHeight}`);};
  img.src=src;
 },[src]);
}
function Manager({ws,owner,onSwitch,onSignOut}:{ws:string;owner:boolean;onSwitch?:()=>void;onSignOut:()=>void}){
 const qc=useQueryClient();
 const data=useQuery({queryKey:['tm','ws',ws],queryFn:()=>api.loadWorkspace(ws)});
 const [tab,setTab]=React.useState<Tab>('dashboard'),[filter,setFilter]=React.useState<Filter>('all'),[notice,setNotice]=React.useState('');
 const [open,setOpen]=React.useState<string|null>(null),[adding,setAdding]=React.useState(false);
 const refresh=()=>qc.invalidateQueries({queryKey:['tm','ws',ws]});
 useImageRatio(data.data?.territories);
 if(!data.data)return <LoadState loading={data.isLoading} error={data.error} retry={()=>void data.refetch()}/>;
 const d=data.data;
 const show=(f:Filter)=>{setFilter(f);setTab('territories');};
 const ctx={d,ws,refresh,notify:setNotice,openTerritory:setOpen};
 const current=d.territories.find(t=>t.id===open);
 return <div className="tm tm-shell">
  <Header d={d} onSwitch={onSwitch} onSignOut={onSignOut}/>
  <nav className="tm-tabs" aria-label={"Territory manager"}>{TABS.filter(t=>owner||t.id!=='owner').map(t=><TabButton key={t.id} tab={t} active={tab===t.id} onClick={()=>setTab(t.id)}/>)}</nav>
  <main className="tm-main">
   <InstallBanner/>
   {tab==='dashboard'&&<Dashboard {...ctx} show={show}/>}
   {tab==='territories'&&<Territories {...ctx} filter={filter} setFilter={setFilter} onAdd={()=>setAdding(true)}/>}
   {tab==='issues'&&<Issues {...ctx}/>}
   {tab==='settings'&&<Settings {...ctx}/>}
   {tab==='owner'&&<TerritoryOwner notify={setNotice}/>}
  </main>
  {adding&&<Dialog open onClose={()=>setAdding(false)} title={"Add territory"}><div className="tm-dialog"><TerritoryForm {...ctx} onDone={id=>{setAdding(false);if(id)setOpen(id);}}/></div></Dialog>}
  {current&&<Dialog open onClose={()=>setOpen(null)} title={`Territory ${current.number} · ${current.name}`}><div className="tm-dialog"><Detail {...ctx} t={current} onClose={()=>setOpen(null)}/></div></Dialog>}
  {notice&&<Toast message={notice} onClose={()=>setNotice('')}/>}
 </div>;
}
type Ctx={d:WorkspaceData;ws:string;refresh:()=>Promise<void>;notify:(m:string)=>void;openTerritory:(id:string)=>void};

function StatusChips({s,issues}:{s:Summary;issues:number}){
 return <span className="tm-chips"><Chip tone={s.overdue?'danger':STATUS_TONE[s.status]}>{s.overdue?'Overdue':STATUS_LABEL[s.status]}</Chip>{issues>0&&<Chip tone="danger">{issues===1?'1 issue':`${issues} issues`}</Chip>}</span>;
}
/** Cards or a compact list, as chosen in Settings → Display. */
function TerritoryList({rows,onOpen}:{rows:Row[];onOpen:(id:string)=>void}){
 const {view}=usePrefs();
 if(view==='list')return <ul className="tm-raised tm-list">{rows.map(({t,s,issues})=><li key={t.id}><button type="button" onClick={()=>onOpen(t.id)}>
  <span className="tm-number">{t.number}</span>
  <span className="tm-list-main"><strong>{t.name}</strong><small>{holder(s)}</small></span>
  <StatusChips s={s} issues={issues}/>
 </button></li>)}</ul>;
 return <div className="tm-grid">{rows.map(({t,s,issues})=><button type="button" key={t.id} className="tm-raised tm-card" onClick={()=>onOpen(t.id)}>
  <span className="tm-thumb">{t.thumb?<img src={t.thumb} alt="" width={480} height={320} loading="lazy" decoding="async"/>:<MapIcon aria-hidden="true"/>}<span className="tm-number">{t.number}</span></span>
  <span className="tm-card-body"><strong>{t.name}</strong><StatusChips s={s} issues={issues}/><small>{holder(s)}</small></span>
 </button>)}</div>;
}
const VIEWS:{value:View;label:string}[]=[{value:'cards',label:'Cards'},{value:'list',label:'List'}];
const STYLES:{value:Style;label:string}[]=[{value:'soft',label:'Neumorphism'},{value:'glass',label:'Glass'}];
const THEMES:{value:Theme;label:string}[]=[{value:'auto',label:'Auto'},{value:'light',label:'Light'},{value:'dark',label:'Dark'}];
function Display(){
 const prefs=usePrefs();
 return <section className="tm-raised stack"><h2>{'Display'}</h2>
  <p className="muted">{'Saved on this device.'}</p>
  <h3>{'Territory view'}</h3>
  <Segmented label={'Territory view'} value={prefs.view} options={VIEWS} onChange={v=>setPrefs({view:v==='list'?'list':'cards'})}/>
  <h3>{'Theme'}</h3>
  <Segmented label={'Theme'} value={prefs.theme} options={THEMES} onChange={v=>setPrefs({theme:THEMES.find(x=>x.value===v)?.value||'auto'})}/>
  <h3>{'Style'}</h3>
  <Segmented label={'Style'} value={prefs.style} options={STYLES} onChange={v=>setPrefs({style:v==='glass'?'glass':'soft'})}/>
 </section>;
}
function Territories({d,filter,setFilter,onAdd,openTerritory,notify}:Ctx&{filter:Filter;setFilter:(f:Filter)=>void;onAdd:()=>void}){
 const [query,setQuery]=React.useState(''),[sort,setSort]=React.useState<keyof typeof SORTS>('number'),[year,setYear]=React.useState(()=>serviceYearOf(today())),[busy,setBusy]=React.useState(false);
 const now=today();
 const rows=d.territories.map(t=>({t,s:summarize(t.id,d.assignments,d.workspace.recent_days,now),issues:d.reports.filter(r=>r.territory_id===t.id&&!r.resolved_at).length}))
  .filter(({t,s})=>(filter==='all'||(filter==='overdue'?s.overdue:s.status===filter))&&(t.number+' '+t.name+' '+(s.open?.publisher||'')).toLowerCase().includes(query.trim().toLowerCase()))
  .sort(SORTERS[sort]);
 const exportCsv=()=>download(new Blob([territoryCsv(d.territories,d.assignments,d.workspace.recent_days)],{type:'text/csv;charset=utf-8'}),`territories-${now}.csv`);
 const exportS13=async()=>{setBusy(true);try{const {s13Pdf}=await import('./territory-s13');download(await s13Pdf(d.territories,d.assignments,year),`S-13-${serviceYearLabel(year)}.pdf`);}catch(e){notify((e as Error).message);}finally{setBusy(false);}};
 return <div className="stack">
  <div className="tm-heading"><h1>{'Territories'}</h1><div className="actions"><Button className="primary" onClick={onAdd}><Plus/>{'Add territory'}</Button></div></div>
  <div className="tm-raised tm-toolbar">
   <Field label={"Search"}>{p=><input {...p} type="search" className="tm-inset" placeholder={"Number, name or publisher"} value={query} onChange={e=>setQuery(e.target.value)}/>}</Field>
   <Combobox label={'Sort by'} value={sort} options={Object.entries(SORTS).map(([value,label])=>({value,label}))} onChange={v=>setSort(v as keyof typeof SORTS)}/>
   <div className="tm-export"><Combobox label={'Service year'} value={String(year)} options={serviceYears(d.assignments).map(y=>({value:String(y),label:serviceYearLabel(y)}))} onChange={v=>setYear(+v)}/>
    <Button onClick={exportCsv}><Download/>{'CSV'}</Button><Button busy={busy} onClick={()=>void exportS13()}><FileText/>{'S-13 PDF'}</Button></div>
  </div>
  <div className="tm-filters" role="group" aria-label={"Show"}>{FILTERS.map(f=><button key={f.value} type="button" aria-pressed={filter===f.value} className={filter===f.value?'active':''} onClick={()=>setFilter(f.value)}>{f.label}</button>)}</div>
  {rows.length?<TerritoryList rows={rows} onOpen={openTerritory}/>
  :<p className="tm-raised muted">{d.territories.length?'No territory matches this filter.':'No territories yet. Add the first one.'}</p>}
 </div>;
}

type Picked={image:string;thumb:string}|'remove'|undefined;
/** undefined keeps the saved image; '' tells the server to remove it. */
function imagePayload(image:Picked){
 if(image==='remove')return {image:'',thumb:''};
 return image?{image:image.image,thumb:image.thumb}:{};
}
function previewOf(image:Picked,t?:Territory){
 if(image==='remove')return null;
 return image?image.thumb:t?.thumb||null;
}
function ImagePick({preview,onPick,onRemove}:{preview:string|null;onPick:(file?:File)=>void;onRemove:()=>void}){
 return <div className="tm-image-pick">{preview?<img src={preview} alt={'Territory map preview'} width={140} height={93}/>:<span className="tm-thumb"><MapIcon aria-hidden="true"/></span>}
  <label className="button"><ImagePlus/>{preview?'Replace image':'Upload map image'}<input type="file" accept="image/*" className="sr-only" onChange={e=>onPick(e.target.files?.[0])}/></label>
  {preview&&<Button onClick={onRemove}>{'Remove image'}</Button>}</div>;
}
function TerritoryForm({d,ws,t,refresh,notify,onDone}:Ctx&{t?:Territory;onDone:(id?:string)=>void}){
 const [form,setForm]=React.useState({number:t?.number||String(Math.max(0,...d.territories.map(x=>+x.number||0))+1),name:t?.name||'',notes:t?.notes||'',mapUrl:t?.map_url||''});
 const [image,setImage]=React.useState<Picked>(),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const pick=async(file?:File)=>{if(!file)return;setError('');try{setImage({image:await compress(file,IMAGE_MAX,IMAGE_Q),thumb:await compress(file,THUMB_MAX,THUMB_Q)});}catch(e){setError((e as Error).message);}};
 const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const id=await api.saveTerritory(ws,{id:t?.id,...form,...imagePayload(image)});await refresh();notify(t?'Territory saved.':'Territory added.');onDone(id);}catch(err){setError((err as Error).message);}finally{setBusy(false);}};
 return <form className="stack" onSubmit={e=>void save(e)}>
  <div className="tm-form-row"><Field label={"Number"}>{p=><input {...p} className="tm-inset" required maxLength={20} value={form.number} onChange={e=>setForm({...form,number:e.target.value})}/>}</Field>
   <Field label={"Name"}>{p=><input {...p} className="tm-inset" required maxLength={150} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>}</Field></div>
  <Field label={'Map link'} hint={'Google My Maps link (or any https map link). It opens in whichever map app the phone has.'}>{p=><input {...p} className="tm-inset" type="url" inputMode="url" pattern="https://.+" maxLength={MAP_URL_MAX} placeholder={'https://www.google.com/maps/d/…'} value={form.mapUrl} onChange={e=>setForm({...form,mapUrl:e.target.value})}/>}</Field>
  <Field label={"Notes"} hint="Shown on the shared card. For example: gated flats, dogs, best time to call.">{p=><textarea {...p} className="tm-inset" rows={4} maxLength={5000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>}</Field>
  <ImagePick preview={previewOf(image,t)} onPick={file=>void pick(file)} onRemove={()=>setImage('remove')}/>
  {error&&<p role="alert" className="error">{error}</p>}
  <Button className="primary" type="submit" busy={busy}>{t?'Save territory':'Add territory'}</Button>
 </form>;
}

function Detail({d,ws,t,refresh,notify,onClose,openTerritory}:Ctx&{t:Territory;onClose:()=>void}){
 const s=summarize(t.id,d.assignments,d.workspace.recent_days);
 const issues=d.reports.filter(r=>r.territory_id===t.id);
 const image=useQuery({queryKey:['tm','image',t.id,t.updated_at],enabled:t.has_image,queryFn:()=>api.territoryImage(t.id)});
 const [editing,setEditing]=React.useState(false),[record,setRecord]=React.useState<Partial<Assignment>|null>(null),[busy,setBusy]=React.useState(false);
 const run=async(fn:()=>Promise<unknown>,done:string)=>{setBusy(true);try{await fn();await refresh();notify(done);}catch(e){notify((e as Error).message);}finally{setBusy(false);}};
 const link=api.shareLink(t.share_token);
 const card=()=>run(async()=>download(await cardJpeg({number:t.number,name:t.name,workspace:d.workspace.name,notes:t.notes,image:image.data||null,link,issues:issues.filter(r=>!r.resolved_at)}),`territory-${t.number}.jpg`),'Card downloaded.');
 if(editing)return <TerritoryForm d={d} ws={ws} t={t} refresh={refresh} notify={notify} openTerritory={openTerritory} onDone={()=>setEditing(false)}/>;
 if(record)return <AssignmentForm d={d} t={t} a={record} refresh={refresh} notify={notify} onDone={()=>setRecord(null)}/>;
 return <div className="stack tm-detail">
  <Hero t={t} full={image.data||null}/>
  {t.map_url&&<MapLink url={t.map_url} notify={notify}/>}
  <div className="tm-chips"><Chip tone={s.overdue?'danger':STATUS_TONE[s.status]}>{s.overdue?'Overdue':STATUS_LABEL[s.status]}</Chip>{s.lastReturned&&<span className="muted">{'Last returned '+fmt(s.lastReturned)}</span>}</div>
  <NowSection s={s} busy={busy} onReturn={a=>void run(()=>api.saveAssignment(t.id,{id:a.id,publisher:a.publisher,taken:a.taken_on,due:a.due_on,returned:today()}),'Marked returned today.')} onEdit={setRecord}/>
  {t.notes&&<section className="stack"><h3>{'Notes'}</h3><p className="v4-preserve-lines">{t.notes}</p></section>}
  <section className="stack"><h3>{'Issues reported here'}</h3>
   {issues.length?issues.map(r=><IssueRow key={r.id} r={r} run={run}/>):<p className="muted">{'None reported.'}</p>}
  </section>
  <HistorySection history={s.history} onEdit={setRecord} onDelete={a=>{if(confirm('Delete this record?'))void run(()=>api.deleteAssignment(a.id),'Record deleted.');}}/>
  <section className="stack"><h3>{'Share'}</h3>
   <div className="actions"><Button onClick={()=>void shareLinkOrCopy(`Territory ${t.number} · ${t.name}`,link).then(r=>r!=='cancelled'&&notify(r==='copied'?'Link copied.':'Shared.'))}><Share2/>{'Share link'}</Button>
    <Button busy={busy||image.isLoading} onClick={()=>void card()}><Download/>{'Download card (JPEG)'}</Button>
    <Button onClick={()=>setEditing(true)}>{'Edit territory'}</Button>
    {d.role==='admin'&&<Button className="danger" onClick={()=>{if(confirm(`Delete territory ${t.number} with its history and issues? This cannot be undone.`))void run(async()=>{await api.deleteTerritory(t.id);onClose();},'Territory deleted.');}}><Trash2/>{'Delete'}</Button>}</div>
   <p className="muted">{'Anyone with the link can see this card, its notes and open issues, and report a new issue.'}</p>
  </section>
 </div>;
}

/** The territory image comes first; the small copy shows at once while the full image loads. */
function Hero({t,full}:{t:Territory;full:string|null}){
 const src=full||t.thumb;
 return <div className="tm-hero">{src?<img src={src} alt={`Map of territory ${t.number}`} width={1200} height={800}/>:<MapIcon aria-hidden="true"/>}</div>;
}
function MapLink({url,notify}:{url:string;notify:(m:string)=>void}){
 return <div className="actions tm-map-actions">
  <a className="button primary" href={url} target="_blank" rel="noreferrer"><MapPin/>{'Open map'}</a>
  <Button onClick={()=>void navigator.clipboard.writeText(url).then(()=>notify('Map link copied.'),()=>notify('Copy failed. Long-press Open map to copy.'))}><Copy/>{'Copy map link'}</Button>
 </div>;
}
function NowSection({s,busy,onReturn,onEdit}:{s:Summary;busy:boolean;onReturn:(a:Assignment)=>void;onEdit:(a:Partial<Assignment>)=>void}){
 const open=s.open;
 return <section className="tm-inset-box stack"><h3>{'Now'}</h3>
  {open?<><p><strong>{open.publisher}</strong>{` took it on ${fmt(open.taken_on)}. Due ${fmt(open.due_on)}.`}</p>
   <div className="actions"><Button className="primary" busy={busy} onClick={()=>onReturn(open)}>{'Mark returned today'}</Button><Button onClick={()=>onEdit(open)}>{'Edit dates'}</Button></div></>
  :<><p>{'Available to assign.'}</p><Button className="primary" onClick={()=>onEdit({})}>{'Assign to a publisher'}</Button></>}
 </section>;
}
function HistorySection({history,onEdit,onDelete}:{history:Assignment[];onEdit:(a:Partial<Assignment>)=>void;onDelete:(a:Assignment)=>void}){
 return <section className="stack"><div className="tm-heading"><h3>{'History'}</h3><Button onClick={()=>onEdit({returned_on:today()})}><Plus/>{'Add past record'}</Button></div>
  {history.length?<ul className="tm-history">{history.map(a=><li key={a.id}><span><strong>{a.publisher}</strong><small>{fmt(a.taken_on)+' → '+(a.returned_on?fmt(a.returned_on):'not returned')}</small></span>
   <Button onClick={()=>onEdit(a)}>{'Edit'}</Button><Button aria-label={`Delete record for ${a.publisher}`} onClick={()=>onDelete(a)}><Trash2/></Button></li>)}</ul>:<p className="muted">{'Never given out.'}</p>}
 </section>;
}
function IssueRow({r,run,territory}:{r:Issue;run:(fn:()=>Promise<unknown>,done:string)=>Promise<void>;territory?:string}){
 return <article className={'tm-issue'+(r.resolved_at?' tm-resolved':'')}>
  <div><strong>{r.household||'Issue'}</strong>{territory&&<small>{territory}</small>}<p className="v4-preserve-lines">{r.details}</p>
   <small>{fmt(r.created_at)}{r.reporter?' · '+r.reporter:''}{r.resolved_at?' · Resolved':''}</small>
   {r.lat!==null&&r.lng!==null&&<a href={mapsLink(r.lat,r.lng)} target="_blank" rel="noreferrer"><MapPin/>{'Open location'}{r.accuracy?` (±${Math.round(r.accuracy)} m)`:''}</a>}</div>
  <div className="actions"><Button onClick={()=>void run(()=>api.resolveIssue(r.id,!r.resolved_at),r.resolved_at?'Issue reopened.':'Issue resolved.')}>{r.resolved_at?'Reopen':'Resolve'}</Button>
   <Button aria-label={"Delete issue"} onClick={()=>{if(confirm('Delete this issue?'))void run(()=>api.deleteIssue(r.id),'Issue deleted.');}}><Trash2/></Button></div>
 </article>;
}

function AssignmentForm({d,t,a,refresh,notify,onDone}:{d:WorkspaceData;t:Territory;a:Partial<Assignment>;refresh:()=>Promise<void>;notify:(m:string)=>void;onDone:()=>void}){
 const taken0=a.taken_on||today();
 const [f,setF]=React.useState({publisher:a.publisher||'',taken:taken0,due:a.due_on||addDays(taken0,d.workspace.due_days),returned:a.returned_on||''});
 const [busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[dueTouched,setDueTouched]=React.useState(Boolean(a.due_on));
 const names=React.useMemo(()=>publisherNames(d.assignments),[d.assignments]),listId=React.useId();
 const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{await api.saveAssignment(t.id,{id:a.id,...f,publisher:canonicalName(f.publisher,names)});await refresh();notify('Saved.');onDone();}catch(err){setError((err as Error).message);}finally{setBusy(false);}};
 return <form className="stack" onSubmit={e=>void save(e)}>
  <h3>{a.id?'Edit record':'Assign territory '+t.number}</h3>
  <Field label={"Publisher"}>{p=><input {...p} className="tm-inset" required maxLength={120} autoComplete="off" list={listId} value={f.publisher} onChange={e=>setF({...f,publisher:e.target.value})}/>}</Field><datalist id={listId}>{names.map(n=><option key={n} value={n}/>)}</datalist>
  <div className="tm-form-row"><Field label={"Date taken"}>{p=><input {...p} className="tm-inset" type="date" required value={f.taken} onChange={e=>setF({...f,taken:e.target.value,due:dueTouched||!e.target.value?f.due:addDays(e.target.value,d.workspace.due_days)})}/>}</Field>
   <Field label={"Due date"} hint={`Default: ${d.workspace.due_days} days after taken.`}>{p=><input {...p} className="tm-inset" type="date" required min={f.taken} value={f.due} onChange={e=>{setDueTouched(true);setF({...f,due:e.target.value});}}/>}</Field>
   <Field label={"Date returned"} hint="Leave empty while the publisher has it.">{p=><input {...p} className="tm-inset" type="date" min={f.taken} value={f.returned} onChange={e=>setF({...f,returned:e.target.value})}/>}</Field></div>
  {error&&<p role="alert" className="error">{error}</p>}
  <div className="actions"><Button className="primary" type="submit" busy={busy}>{'Save'}</Button><Button onClick={onDone}>{'Cancel'}</Button></div>
 </form>;
}

function Issues({d,refresh,notify}:Ctx){
 const [show,setShow]=React.useState<'open'|'resolved'>('open');
 const run=async(fn:()=>Promise<unknown>,done:string)=>{try{await fn();await refresh();notify(done);}catch(e){notify((e as Error).message);}};
 const rows=d.reports.filter(r=>show==='open'?!r.resolved_at:r.resolved_at);
 const name=(id:string)=>{const t=d.territories.find(x=>x.id===id);return t?`Territory ${t.number} · ${t.name}`:'';};
 return <div className="stack">
  <h1>{'Issues'}</h1>
  <div className="tm-filters" role="group" aria-label={"Show"}>{(['open','resolved'] as const).map(v=><button key={v} type="button" aria-pressed={show===v} className={show===v?'active':''} onClick={()=>setShow(v)}>{v==='open'?'Open':'Resolved'}</button>)}</div>
  {rows.length?<div className="tm-raised stack">{rows.map(r=><IssueRow key={r.id} r={r} run={run} territory={name(r.territory_id)}/>)}</div>:<p className="tm-raised muted">{show==='open'?'No open issues.':'No resolved issues.'}</p>}
 </div>;
}

function Settings({d,ws,refresh,notify}:Ctx){
 const admin=d.role==='admin';
 const [f,setF]=React.useState({name:d.workspace.name,dueDays:d.workspace.due_days,recentDays:d.workspace.recent_days}),[email,setEmail]=React.useState(''),[role,setRole]=React.useState<'manager'|'admin'>('manager'),[busy,setBusy]=React.useState(false);
 const run=async(fn:()=>Promise<unknown>,done:string)=>{setBusy(true);try{await fn();await refresh();notify(done);}catch(e){notify((e as Error).message);}finally{setBusy(false);}};
 const link=api.issueLink(d.workspace.report_token);
 return <div className="stack">
  <h1>{'Settings'}</h1>
  <Display/>
  <section className="tm-raised stack"><h2>{'Import territories'}</h2><p className="muted">{'Add territories and their history from a CSV file, such as one exported from this app or a spreadsheet.'}</p><div><ImportCsv d={d} ws={ws} refresh={refresh} notify={notify}/></div></section>
  <section className="tm-raised stack"><h2>{'App'}</h2><p className="muted">{'Install Territories on this phone or computer. It opens straight to your territories.'}</p><InstallTerritories showInstalled/></section>
  <section className="tm-raised stack"><h2>{'Issue report link'}</h2>
   <p>{'Give this link to publishers. It opens a form that takes their GPS location and the household details, and adds the issue to the chosen territory.'}</p>
   <input className="tm-inset" readOnly value={link} aria-label={"Issue report link"} onFocus={e=>e.target.select()}/>
   <div className="actions"><Button onClick={()=>void shareLinkOrCopy('Report a territory issue',link).then(r=>r!=='cancelled'&&notify(r==='copied'?'Link copied.':'Shared.'))}><Share2/>{'Share link'}</Button>
    {admin&&<Button busy={busy} onClick={()=>{if(confirm('Make a new link? The old link stops working.'))void run(()=>api.saveSettings(ws,{...f,rotate:true}),'New link made.');}}>{'Make a new link'}</Button>}</div>
  </section>
  <section className="tm-raised stack"><h2>{'Workspace'}</h2>
   <form className="stack" onSubmit={e=>{e.preventDefault();void run(()=>api.saveSettings(ws,{...f,rotate:false}),'Settings saved.');}}>
    <fieldset className="stack" disabled={!admin||busy}>
     <Field label={"Congregation name"}>{p=><input {...p} className="tm-inset" required minLength={2} maxLength={150} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>}</Field>
     <div className="tm-form-row"><Field label={"Days until due"} hint="Used for every new assignment. Default 120.">{p=><input {...p} className="tm-inset" type="number" required min={1} max={3650} value={f.dueDays} onChange={e=>setF({...f,dueDays:+e.target.value})}/>}</Field>
      <Field label={"Recently used for"} hint="Days after return a territory shows as recently used.">{p=><input {...p} className="tm-inset" type="number" required min={1} max={3650} value={f.recentDays} onChange={e=>setF({...f,recentDays:+e.target.value})}/>}</Field></div>
    </fieldset>
    {admin?<Button className="primary" type="submit" busy={busy}>{'Save settings'}</Button>:<p className="muted">{'Only a workspace admin can change these.'}</p>}
   </form>
  </section>
  <section className="tm-raised stack"><h2>{'People with access'}</h2>
   <ul className="tm-history">{d.members.map(m=><li key={m.email}><span><strong>{m.email}</strong><small>{m.role==='admin'?'Admin: everything, including people and settings':'Manager: territories, assignments and issues'}</small></span>
    {admin&&<Button aria-label={`Remove ${m.email}`} busy={busy} onClick={()=>{if(confirm(`Remove ${m.email}?`))void run(()=>api.setMember(ws,m.email,null),'Removed.');}}><Trash2/></Button>}</li>)}</ul>
   {admin&&<form className="tm-form-row" onSubmit={e=>{e.preventDefault();void run(async()=>{await api.setMember(ws,email,role);setEmail('');},'Access given. They sign in with Google at this page.');}}>
    <Field label={"Google account email"}>{p=><input {...p} className="tm-inset" type="email" required maxLength={EMAIL_MAX} value={email} onChange={e=>setEmail(e.target.value)}/>}</Field>
    <Combobox label={'Role'} value={role} options={[{value:'manager',label:'Manager'},{value:'admin',label:'Admin'}]} onChange={v=>setRole(v==='admin'?'admin':'manager')}/>
    <Button className="primary" type="submit" busy={busy}><Plus/>{'Add'}</Button></form>}
   <p className="muted">{'Sign-in page: '}{location.origin+import.meta.env.BASE_URL+'?territory'}{' · Help: '}<a href={'mailto:'+config.SUPPORT_EMAIL}>{config.SUPPORT_EMAIL}</a></p>
  </section>
 </div>;
}
