import {getUILocale,subscribeUILocale} from '../../../packages/core/i18n';
import {Toast,DismissibleBanner} from '../../../packages/ui/Notices';
import './features/install-runtime';
import {z} from "zod";
import type {SyncStatus} from "../../../packages/core/store";
import React, { useEffect, useState, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider,useQueryClient,useQuery } from "@tanstack/react-query";
import {
  Home,
  CalendarDays,
  Users,
  BarChart3,
  MessageCircle,
  Link2,
  Settings,
  Menu,
  PanelLeftClose,
  LogOut,
  Search,
  ArrowRight,
  BookOpen,
  Plus,
  ShieldCheck,
  Phone,
  ClipboardList,
  Download,
  Printer,
} from "lucide-react";
import {repositories} from "../../../packages/core/repositories";
import {AppShell} from "../../../packages/ui/AppShell";
import {CommandPalette,type Command} from "../../../packages/ui/CommandPalette";
import {t} from "../../../packages/core/i18n";
import {sections,allowedTools,sectionForRoute,type SectionId,type Tool} from "../../../packages/core/navigation";
import {themeIds} from "../../../packages/core/themes";
import {LocalAssistant} from "./features/LocalAssistant";
import {SectionHub} from "./features/SectionHub";
import features from "../../../capabilities.json";
import { Dialog } from "../../../packages/ui/Dialog";
import { config,rpc,client, demo, capabilities,storeFor,clearStores,switchStoreAccount,subscribeStores,syncStores } from "./features/client";
import {ExperienceDefaults} from "./features/ExperienceProfile";
import { useAppearance,activateAppearanceProfile } from "./features/store";
import {authScope,displayFirstName} from "./features/auth-scope.mjs";
import {AdminIdleTimeout} from "./features/Sessions";
import {Subscription,planSchema,type WorkspacePlan} from "./features/Subscription";
import { UpdatePrompt } from "./features/UpdatePrompt";
import { adapt } from "./features/accessibility";
import "./features/styles.css";
import "../../../packages/ui/theme-bridge.css";
import "../../../packages/ui/v3-dialog-layer.css";
import "../../../packages/ui/v3-glass.css";
import "../../../packages/ui/v3-interaction.css";
import "../../../packages/ui/shell.css";
const oldPrefix=import.meta.env.BASE_URL+"v2/";
if(location.pathname.startsWith(oldPrefix))location.replace(import.meta.env.BASE_URL+location.pathname.slice(oldPrefix.length)+location.search+location.hash);
const PublicForm = lazy(() => import("./features/PublicForm").then(m=>({default:m.PublicForm})));
const OwnerConsole=lazy(()=>import("./features/OwnerConsole"));
const Workspace = lazy(() => import("./features/Workspace"));
const routes = [
  {id:"owner",label:"Command centre",icon:ShieldCheck},
  { id: "home", label: "Home", icon: Home },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "people", label: "People", icon: Users },
  {id:"emergency",label:"Emergency Contacts",icon:Phone},
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "access", label: "Access & Links", icon: Link2 },
  { id: "pdf", label: "Print & PDF", icon: Printer },
  { id: "settings", label: "Settings", icon: Settings },
];
export type Context = {
  account?:string;
  onCounts?: (counts:Record<string,number>)=>void;
  cong: string;
  name: string;
  roles: string[];
  caps: any;
  firstName?: string;
  plan?: WorkspacePlan;
  notify: (s: string) => void;
};
function App() {
  React.useSyncExternalStore(subscribeUILocale,getUILocale,getUILocale);
  const [updatesOpen,setUpdatesOpen]=useState(false);
  const [session, setSession] = useState<any>(null),
    [loading, setLoading] = useState(!demo),
    [error, setError] = useState(""),
    [memberships, setMemberships] = useState<any[]>([]),
    [cong, setCong] = useState(demo ? "demo" : ""),
    [caps, setCaps] = useState<any>({}),
    [owner,setOwner]=useState(demo&&new URLSearchParams(location.search).get("demo")==="owner"),
    [plan,setPlan]=useState<WorkspacePlan|null>(null),[planError,setPlanError]=useState(""),
    [route, setRoute] = useState(new URLSearchParams(location.search).get("screen") || "home"),
    [hub,setHub]=useState<SectionId|null>(()=>{const value=new URLSearchParams(location.search).get("section");return sections.some(section=>section.id===value)?value as SectionId:null;}),
    [quick,setQuick]=useState(false),
    [assistantOpen,setAssistantOpen]=useState(false),
    [syncStatus,setSyncStatus]=useState<SyncStatus>({pending:0,conflicts:0,forbidden:0}),
    [hubCounts,setHubCounts]=useState<Record<string,number>>({}),
    [collapsed, setCollapsed] = useState(false),
    [more, setMore] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [email, setEmail] = useState(""),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(navigator.onLine);
  const queryClient=useQueryClient();
  const accountScope=React.useMemo(()=>authScope(queryClient,(account:string|null)=>{switchStoreAccount(account);for(const key of ['ca-quick-action','ca-report-action','ca-person-search','ca-pdf-open','ca-s21-person'])sessionStorage.removeItem(key);setLoading(Boolean(account));setHub(null);setQuick(false);setAssistantOpen(false);setSearch(false);setMemberships([]);setHubCounts({});setSyncStatus({pending:0,conflicts:0,forbidden:0});setCaps({});setPlan(null);setCong("");}),[queryClient]);
  useEffect(()=>setHubCounts({}),[cong]);
  const appearance = useAppearance();
  useEffect(()=>{if(!search)return;const frame=requestAnimationFrame(()=>document.getElementById("tool-search")?.focus());return()=>cancelAnimationFrame(frame);},[search]);
  React.useLayoutEffect(() => adapt(appearance), [appearance]);
  useEffect(()=>{if(!demo&&session?.user?.id&&cong)activateAppearanceProfile(session.user.id,cong,memberships.some(m=>m.cong_id===cong&&m.role==='publisher')&&!memberships.some(m=>m.cong_id===cong&&m.role==='admin'));},[session?.user?.id,cong]);
  React.useLayoutEffect(()=>{document.querySelector(".main-content")?.scrollTo(0,0);},[route,cong]);
  useEffect(() => {
    const handler = () => setOnline(navigator.onLine);
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    };
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (demo) {
      setMemberships([
        {
          cong_id: "demo",
          role: ({publisher:"publisher",group:"group_overseer",attendance:"attendance",field:"field_service"} as Record<string,string>)[new URLSearchParams(location.search).get("demo")||""]||"admin",
          congregations: { name: "River Park Congregation" },
        },
      ]);
      setCaps({
        schema_version: 2,
        groups: true,
        weekend: true,
        setup: true,
        private: false,
      });
      return;
    }
    let active = true;
    client.auth.getSession().then(({ data, error }) => {
      if (active) {
        accountScope(data.session);setSession(data.session);
        if (error) setError(error.message);
        setLoading(false);
      }
    });
    const { data } = client.auth.onAuthStateChange((_event, value) => {
      if (active) {accountScope(value);setSession(value);}
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(()=>{let active=true;if(demo){const value=new URLSearchParams(location.search).get('demo')==='owner';setOwner(value);if(value)setRoute('owner');return;}setOwner(false);if(!session)return;storeFor('').read({source:{kind:'rpc',name:'ca_is_superadmin',args:{}},cacheKey:'account-owner',fresh:true},z.boolean()).then(value=>{if(active){setOwner(value===true);if(value===true&&!cong)setRoute('owner');}}).catch(()=>{if(active)setOwner(false);});return()=>{active=false;};},[session?.user?.id]);
  useEffect(() => {
    if (!session || demo) return;
    let active = true;
    if(!memberships.length)setLoading(true);
    storeFor('').read({source:{kind:'table',name:'congregation_access',columns:'cong_id,role,congregations(name)',filters:[{column:'email',op:'eq',value:session.user.email?.toLowerCase()},{column:'active',op:'eq',value:true}]},cacheKey:'account-membership',fresh:true},z.array(z.object({cong_id:z.string(),role:z.string(),congregations:z.object({name:z.string()}).nullable()}))).then(data=>{if(active){setMemberships(data);setCong(data[0]?.cong_id||'');setLoading(false);}}).catch(error=>{if(active){setError(error.message);setLoading(false);}});
    return () => {
      active = false;
    };
  // Avoid reloading membership on token refresh for the same account.
  }, [session?.user?.id, session?.user?.email]);
  useEffect(() => {
    if (cong && !demo) capabilities(cong).then(setCaps);
  }, [cong]);
  useEffect(()=>{let active=true;setPlan(null);setPlanError('');if(!cong)return;if(demo){const expired=new URLSearchParams(location.search).get('demo')==='expired';setPlan({congregation:cong,name:'River Park Congregation',status:expired?'expired':'active',trialEndsAt:new Date().toISOString(),paymentDate:null,locked:expired,serverTime:new Date().toISOString()});return;}storeFor(cong).read({source:{kind:'rpc',name:'ca_v2_workspace_plan',args:{p_cong_id:cong}},cacheKey:'workspace-plan',fresh:true},planSchema).then(value=>{const parsed=planSchema.parse(value);if(parsed.congregation!==cong)throw Error('Workspace status did not match. Reload before continuing.');if(active)setPlan(parsed);}).catch(e=>{if(active)setPlanError(e.message);});return()=>{active=false;};},[cong,session?.user?.id]);
  const roles = memberships
      .filter((m) => m.cong_id === cong)
      .map((m) => m.role),
    admin = roles.includes("admin");
  const allowed = routes.filter(
    (r) =>
      (r.id==='owner'?owner:admin) ||
      r.id === "home" ||
      r.id === "settings" ||
      (r.id === "access" && roles.some(role=>["field_service","group_overseer","attendance"].includes(role))) ||
      (r.id === "schedule" &&
        roles.some((x) =>
          [
            "oclm",
            "weekend",
            "attendance",
            "attendant",
            "av",
            "cleaning",
            "publisher",
          ].includes(x),
        )) ||
      (r.id === "people" &&
        roles.some((x) => ["field_service", "group_overseer"].includes(x))) ||
      (r.id === "pdf" && roles.some(x=>["field_service","group_overseer","attendance","oclm","weekend","av","attendant","cleaning"].includes(x))) ||
      (r.id === "reports" &&
        roles.some((x) =>
          [
            "field_service",
            "attendance",
            "group_overseer",
            "publisher",
          ].includes(x),
        )),
  );
  const updateCounts=React.useCallback((next:Record<string,number>)=>setHubCounts(previous=>Object.entries(next).every(([key,value])=>previous[key]===value)?previous:{...previous,...next}),[]);
  const context: Context = {
    onCounts:updateCounts,
    account:session?.user?.id,
    cong,
    plan:plan?.congregation===cong?plan:undefined,
    name:owner&&!cong?"Owner account":plan?.congregation===cong?plan.name:
      memberships.find((m) => m.cong_id === cong)?.congregations?.name ||
      "Congregation",
    roles,
    firstName: demo ? "Daniel" : displayFirstName(session?.user?.user_metadata),
    caps,
    notify: setNotice,
  };
  const searchPeople=useQuery({queryKey:['search-people',session?.user?.id,cong],enabled:!owner&&search&&!!cong&&(demo||roles.some(role=>['admin','field_service','group_overseer','publisher'].includes(role))),queryFn:async()=>{if(demo){const names=[{id:'daniel',name:'Daniel Thomas'},{id:'maria',name:'Maria Thomas'},{id:'samuel',name:'Samuel George'},{id:'anna',name:'Anna Joseph'}];return roles.includes('publisher')?names.slice(0,2):names;}const repo=repositories(storeFor(cong,roles),cong);return roles.includes('publisher')&&!admin?await repo.reports.family():await repo.people.names();}});
  const roleScope=[...roles].sort().join(',');
  useEffect(()=>{if(demo||!session?.user?.id||!cong||owner)return;let active=true;const store=storeFor(cong,roles);const update=()=>void store.status().then(status=>{if(active)setSyncStatus(status);}).catch(()=>{});const unsubscribe=subscribeStores(event=>{update();if(['refresh','local','synced'].includes(event.reason))void queryClient.invalidateQueries();});const sync=()=>void syncStores().then(update).catch(()=>{});update();sync();window.addEventListener('online',sync);const interval=setInterval(sync,30000);return()=>{active=false;unsubscribe();window.removeEventListener('online',sync);clearInterval(interval);};},[session?.user?.id,cong,roleScope,owner]);
  async function signOut() {
    setQuick(false);setSearch(false);setAssistantOpen(false);setUpdatesOpen(false);setNotice("");window.dispatchEvent(new Event("ca:after-navigate"));
    const { clearDevice } = await import("./features/device-keys");
    try{await clearDevice();}catch{setError(t("store.clearFailed"));}
    for (const store of [localStorage, sessionStorage]) {
      for (const key of Object.keys(store))
        if (
          (key.startsWith("ca_") ||
          key.startsWith("ca-") ||
          key.startsWith("oclm_")) && !key.startsWith("ca-v2-appearance:")
        )
          store.removeItem(key);
    }
    try{await clearStores();}catch{setError(t("store.clearFailed"));}
    await client.auth.signOut();
    setMemberships([]);
    setCong("");
    setRoute("home");
  }
  if (loading)
    return (
      <main className="login" role="status">
        {t("ui.opening.your.workspace.bed9096c")}</main>
    );
  if (!demo && !session)
    return (
      <main className="login card">
        <div className="brand">
          <span className="brand-mark">
            <BookOpen />
          </span>
          {t("ui.congregation.assistant.e97de372")}</div>
        <span className="eyebrow">{t("ui.welcome.back.66212495")}</span>
        <h1>{t("ui.a.calmer.way.to.keep.things.together.8c1b27b2")}</h1>
        <p>{t("ui.sign.in.with.the.account.your.congregation.bde9d5b7")}</p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          className="primary full"
          onClick={async () => {
            const { error } = await client.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: location.origin + location.pathname },
            });
            if (error) setError(error.message);
          }}
        >
          {t("ui.continue.with.google.639eaf03")}<ArrowRight />
        </button>
        {features.flags.MAGIC_LINK_ENABLED && <form className="stack" onSubmit={async e=>{e.preventDefault();const {error}=await client.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{shouldCreateUser:false,emailRedirectTo:location.origin+import.meta.env.BASE_URL}});if(error)setError(error.message);else setError("Check your email for the sign-in link.");}}><label>{t("ui.email.magic.link.5775d88e")}<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button>{t("ui.email.sign.in.link.7e5c2658")}</button></form>}
        <p className="muted">
          {t("ui.independent.and.unofficial.your.congregati.066e38e2")}</p>
        <div className="actions">
          <a href="?demo=admin">{t("ui.try.the.admin.demo.f0555a09")}</a>
          <a href="?demo=publisher">{t("ui.publisher.demo.dd489e1c")}</a>
        </div>

      </main>
    );
  if (!cong&&!owner)
    return (
      <main className="login card">
        <h1>{t("ui.approval.needed.9928dd82")}</h1>
        <p>
          {t("ui.this.account.has.no.active.congregation.ac.96c928fe")}</p>
        <button onClick={signOut}>{t("ui.sign.out.48f0d3d3")}</button>
        <a href={config.PUBLIC_SITE_URL + "/"}>{t("ui.request.a.workspace.2d70699d")}</a>
      </main>
    );
  const guardNavigation=(action:()=>void)=>{const event=new CustomEvent('ca:before-navigate',{cancelable:true,detail:action});window.dispatchEvent(event);if(!event.defaultPrevented)action();};
  const navigate = (id: string) => {
    const url=new URL(location.href);url.searchParams.set("screen",id);url.searchParams.delete("section");history.replaceState(null,"",url.pathname+url.search);
    window.dispatchEvent(new Event("ca:after-navigate"));
    setRoute(id);setHub(null);
    setMore(false);
    setSearch(false);setQuick(false);setAssistantOpen(false);setUpdatesOpen(false);
  };
  const go=(id:string)=>{if(allowed.some(r=>r.id===id))guardNavigation(()=>navigate(id));};
  const visibleTools=allowedTools(roles,owner);
  const availableSections=sections.filter(section=>section.id==='home'||visibleTools.some(tool=>tool.section===section.id&&tool.available)).map(section=>section.id);
  const activeSection=hub||sectionForRoute(route);
  const selectSection=(section:SectionId)=>{if(!availableSections.includes(section))return;if(section==='home'){go('home');return;}guardNavigation(()=>{window.dispatchEvent(new Event("ca:after-navigate"));setHub(section);setSearch(false);setQuick(false);setAssistantOpen(false);setUpdatesOpen(false);const url=new URL(location.href);url.searchParams.set('section',section);history.replaceState(null,'',url.pathname+url.search);document.querySelector('.main-content')?.scrollTo(0,0);});};
  const openNativeTool=(tool:Tool,afterNavigate?:()=>void)=>{if(!visibleTools.some(item=>item.id===tool.id)||!tool.available||!allowed.some(route=>route.id===tool.route))return;setQuick(false);setSearch(false);guardNavigation(()=>{
    if(tool.route==='reports'&&tool.sub&&!sessionStorage.getItem('ca-report-action'))sessionStorage.setItem('ca-report-action',JSON.stringify({action:tool.sub}));
    if(tool.route==='pdf'&&tool.sub)sessionStorage.setItem('ca-pdf-open',tool.sub);
    if(['people','schedule'].includes(tool.route)&&tool.sub)sessionStorage.setItem('ca-workspace-tool',tool.sub);
    navigate(tool.route);const url=new URL(location.href);url.searchParams.delete('section');url.searchParams.set('tool',tool.id);history.replaceState(null,'',url.pathname+url.search);window.dispatchEvent(new CustomEvent('ca:open-tool',{detail:tool.sub}));afterNavigate?.();});
  };
  const prepareAssistant=async()=>{if(!roles.includes('admin'))return;try{if(!demo){setNotice('Loading authorized records before opening the on-device assistant…');const repo=repositories(storeFor(cong,roles),cong),year=new Date().getFullYear()+(new Date().getMonth()>=8?1:0);const [people,current,previous,meeting]=await Promise.all([repo.people.names(),repo.reports.year(year),repo.reports.year(year-1),rpc('ca_v3_meeting_context',{p_cong_id:cong})]);queryClient.setQueryData(['assistant-meeting',context.account,cong],meeting);queryClient.setQueryData(['assistant-people',context.account,cong],people);queryClient.setQueryData(['assistant-records',context.account,cong],[...current,...previous]);}setNotice('');setAssistantOpen(true);}catch(error){setNotice((error as Error).message);}};
  const commands:Command[]=[...visibleTools.filter(tool=>tool.available).map(tool=>({id:tool.id,label:t(tool.label),description:t(tool.description),run:()=>openNativeTool(tool)})),...(searchPeople.data||[]).map(person=>({id:'person-'+person.id,label:person.name,description:t('purpose.publishers'),run:()=>{const native=visibleTools.find(tool=>tool.id===(roles.includes('publisher')&&!admin?'households':'publishers'));if(native){openNativeTool(native,()=>{sessionStorage.setItem('ca-person-search',person.name);window.dispatchEvent(new CustomEvent('ca:find-person',{detail:person.name}));});}}})),...(roles.some(r=>['admin','field_service','group_overseer'].includes(r))?(searchPeople.data||[]).map(person=>({id:'s21-'+person.id,label:'S-21 · '+person.name,description:'Download publisher record',run:()=>{void import('./features/pdf-download').then(({publisherS21})=>publisherS21(context,person.id,demo?person:undefined)).catch(error=>setNotice((error as Error).message));}})):[]),...themeIds.map(theme=>({id:'theme-'+theme,label:t('theme.gallery')+': '+t(`theme.${theme}`),run:()=>appearance.set({theme})}))];
  const inspector=<section className="stack"><h2>{t('nav.details')}</h2><p>{t('inspector.empty')}</p><button onClick={()=>selectSection(availableSections.includes('people')?'people':'admin')}>{t(availableSections.includes('people')?'nav.people':'nav.admin')}</button></section>;
  return <>
    <ExperienceDefaults key={(session?.user?.id||'demo')+cong} context={context}/><UpdatePrompt/><AdminIdleTimeout enabled={admin} notify={setNotice}/>
    <AppShell onUpdates={()=>setUpdatesOpen(true)} name={context.name} firstName={context.firstName} active={activeSection} available={availableSections} onSection={selectSection} onSearch={()=>setSearch(true)} onQuick={()=>setQuick(true)} onAssistant={!owner&&roles.includes("admin")?()=>void prepareAssistant():undefined} signOut={()=>guardNavigation(()=>void signOut())} demo={demo} inspector={inspector}>
      {!online&&<DismissibleBanner key="offline" stateKey="offline">{t('shell.offline')}</DismissibleBanner>}
      {!demo&&(syncStatus.pending>0||syncStatus.conflicts>0||syncStatus.forbidden>0)&&<DismissibleBanner key={syncStatus.forbidden?'forbidden':syncStatus.conflicts?'conflict':'pending'} stateKey={syncStatus.forbidden?'forbidden':syncStatus.conflicts?'conflict':'pending'}>{t(syncStatus.forbidden?'store.accessChanged':syncStatus.conflicts?'store.conflict':'store.pending')}</DismissibleBanner>}
      {hub&&<SectionHub section={hub} tools={visibleTools} onOpen={openNativeTool} counts={hubCounts}/>}
      <div hidden={hub!==null}><Suspense fallback={<p role="status">{t('common.loading')}</p>}>
            {owner&&route!=="settings"?<OwnerConsole context={context}/>:owner&&route==="settings"?<Workspace key="owner-settings" route="settings" go={go} context={{...context,cong:"",roles:[],caps:{}}}/>:planError?<section className="card"><h1>{t("ui.workspace.status.could.not.load.b6ea4a7c")}</h1><p role="alert">{planError}</p><button onClick={()=>location.reload()}>{t("ui.retry.942087cc")}</button></section>:plan?.congregation!==cong?<p role="status">{t("ui.checking.your.workspace.90719547")}</p>:plan.locked?<Subscription context={context} plan={plan}/>:<Workspace key={cong} route={allowed.some(r=>r.id===route)?route:"home"} go={go} context={context} />}
      </Suspense></div>
    </AppShell>
    <Dialog open={updatesOpen} onClose={()=>setUpdatesOpen(false)} title={t("ui.what.s.new.37e6112e")}><div className="stack"><p><strong>{t("ui.18.october.2026.d6476b3d")}</strong></p><p>{t('refine.updatesForms0')}</p><p>{t('refine.updatesForms1')}</p><p>{t('refine.updatesForms2')}</p><p>{t('refine.updatesLinks0')}</p><p>{t('refine.updatesLinks1')}</p><a href={new URL("updates/#release-2026-10-18",config.PUBLIC_SITE_URL+"/").href} target="_blank" rel="noreferrer">{t("ui.read.the.release.notes.and.how.to.links.40747550")}</a></div></Dialog><CommandPalette open={search} onClose={()=>setSearch(false)} commands={commands}>{searchPeople.isFetching&&<p role="status">{t("search.loadingPeople")}</p>}{searchPeople.error&&<p role="alert">{t("search.failedPeople")} <button onClick={()=>void searchPeople.refetch()}>{t("search.retry")}</button></p>}</CommandPalette>
    <Dialog open={quick} onClose={()=>setQuick(false)} title={t('nav.quickActions')}><div className="more-grid">{([{id:'publishers',label:'quick.addPublisher',action:'add-publisher',allowed:admin},{id:'month',label:'quick.enterReport',action:'entry',allowed:true},{id:'s21',label:'quick.downloadS21',action:'s21',allowed:true},{id:'whatsapp',label:'quick.shareReminder',action:'message',allowed:true}] as const).filter(action=>action.allowed&&visibleTools.some(tool=>tool.id===action.id&&tool.available)).map(action=><button key={action.id} onClick={()=>{const tool=visibleTools.find(tool=>tool.id===action.id)!;openNativeTool(tool,()=>{if(action.action==='entry')sessionStorage.setItem('ca-report-action',JSON.stringify({action:'entry'}));if(action.action==='add-publisher')sessionStorage.setItem('ca-quick-action','add-publisher');window.dispatchEvent(new CustomEvent('ca:quick-action',{detail:action.action}));});}}>{t(action.label)}</button>)}</div></Dialog>
    <Dialog open={assistantOpen} onClose={()=>setAssistantOpen(false)} title={t('assistant.title')}>{assistantOpen&&<LocalAssistant context={context} onExport={()=>{const tool=visibleTools.find(tool=>tool.id==='s21');if(tool){openNativeTool(tool);window.dispatchEvent(new CustomEvent('ca:select-s21'));setAssistantOpen(false);}}}/>}</Dialog>
    {notice&&<Toast message={notice} onClose={()=>setNotice("")}>{notice.includes('Review in Reports')&&<button onClick={()=>go('reports')}>{t("ui.review.aff0766a")}</button>}</Toast>}
  </>;

}
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {new URLSearchParams(location.search).has("form") ? <Suspense fallback={<main>{t("ui.opening.protected.form.e4af4758")}</main>}><PublicForm/></Suspense> : <App />}
    </QueryClientProvider>
  </React.StrictMode>,
);
