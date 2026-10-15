import React, { useEffect, useState, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider,useQueryClient } from "@tanstack/react-query";
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
import features from "../../../capabilities.json";
import { Dialog } from "../../../packages/ui/Dialog";
import { rpc,client, demo, capabilities } from "./v2/client";
import {ExperienceDefaults} from "./v2/ExperienceProfile";
import { useAppearance,activateAppearanceProfile } from "./v2/store";
import {authScope,displayFirstName} from "./v2/auth-scope.mjs";
import {AdminIdleTimeout} from "./v2/Sessions";
import {Subscription,planSchema,type WorkspacePlan} from "./v2/Subscription";
import { UpdatePrompt } from "./v2/UpdatePrompt";
import { adapt } from "./v2/accessibility";
import "./v2/styles.css";
const oldPrefix=import.meta.env.BASE_URL+"v2/";
if(location.pathname.startsWith(oldPrefix))location.replace(import.meta.env.BASE_URL+location.pathname.slice(oldPrefix.length)+location.search+location.hash);
const PublicForm = lazy(() => import("./v2/PublicForm").then(m=>({default:m.PublicForm})));
const OwnerConsole=lazy(()=>import("./v2/OwnerConsole"));
const Workspace = lazy(() => import("./v2/Workspace"));
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
  cong: string;
  name: string;
  roles: string[];
  caps: any;
  firstName?: string;
  plan?: WorkspacePlan;
  notify: (s: string) => void;
};
function App() {
  const [session, setSession] = useState<any>(null),
    [loading, setLoading] = useState(!demo),
    [error, setError] = useState(""),
    [memberships, setMemberships] = useState<any[]>([]),
    [cong, setCong] = useState(demo ? "demo" : ""),
    [caps, setCaps] = useState<any>({}),
    [owner,setOwner]=useState(demo&&new URLSearchParams(location.search).get("demo")==="owner"),
    [plan,setPlan]=useState<WorkspacePlan|null>(null),[planError,setPlanError]=useState(""),
    [route, setRoute] = useState(new URLSearchParams(location.search).get("screen") || "home"),
    [collapsed, setCollapsed] = useState(false),
    [more, setMore] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [email, setEmail] = useState(""),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(navigator.onLine);
  const queryClient=useQueryClient();
  const accountScope=React.useMemo(()=>authScope(queryClient,(account:string|null)=>{setLoading(Boolean(account));setMemberships([]);setCaps({});setPlan(null);setCong("");}),[queryClient]);
  const appearance = useAppearance();
  useEffect(() => adapt(appearance), [appearance]);
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
  useEffect(()=>{let active=true;if(demo){const value=new URLSearchParams(location.search).get('demo')==='owner';setOwner(value);if(value)setRoute('owner');return;}setOwner(false);if(!session)return;rpc('ca_is_superadmin').then(value=>{if(active){setOwner(value===true);if(value===true&&!cong)setRoute('owner');}}).catch(()=>{if(active)setOwner(false);});return()=>{active=false;};},[session?.user?.id]);
  useEffect(() => {
    if (!session || demo) return;
    let active = true;
    setLoading(true);
    client
      .from("congregation_access")
      .select("cong_id,role,congregations(name)")
      .eq("email", session.user.email?.toLowerCase())
      .eq("active", true)
      .then(({ data, error }) => {
        if (active) {
          if (error) setError(error.message);
          else {
            setMemberships(data || []);
            setCong(data?.[0]?.cong_id || "");
          }
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  // Avoid reloading membership on token refresh for the same account.
  }, [session?.user?.id, session?.user?.email]);
  useEffect(() => {
    if (cong && !demo) capabilities(cong).then(setCaps);
  }, [cong]);
  useEffect(()=>{let active=true;setPlan(null);setPlanError('');if(!cong)return;if(demo){const expired=new URLSearchParams(location.search).get('demo')==='expired';setPlan({congregation:cong,name:'River Park Congregation',status:expired?'expired':'active',trialEndsAt:new Date().toISOString(),paymentDate:null,locked:expired,serverTime:new Date().toISOString()});return;}rpc('ca_v2_workspace_plan',{p_cong_id:cong}).then(value=>{const parsed=planSchema.parse(value);if(parsed.congregation!==cong)throw Error('Workspace status did not match. Reload before continuing.');if(active)setPlan(parsed);}).catch(e=>{if(active)setPlanError(e.message);});return()=>{active=false;};},[cong,session?.user?.id]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 7000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const roles = memberships
      .filter((m) => m.cong_id === cong)
      .map((m) => m.role),
    admin = roles.includes("admin");
  const allowed = routes.filter(
    (r) =>
      (r.id==='owner'?owner:admin) ||
      r.id === "home" ||
      r.id === "settings" ||
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
      (r.id === "pdf" && roles.some(x=>["field_service","attendance","oclm","weekend"].includes(x))) ||
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
  const context: Context = {
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
  async function signOut() {
    const { clearDevice } = await import("./v2/device-keys");
    await clearDevice();
    for (const store of [localStorage, sessionStorage]) {
      for (const key of Object.keys(store))
        if (
          (key.startsWith("ca_") ||
          key.startsWith("ca-") ||
          key.startsWith("oclm_")) && !key.startsWith("ca-v2-appearance:")
        )
          store.removeItem(key);
    }
    await client.auth.signOut();
    setMemberships([]);
    setCong("");
    setRoute("home");
  }
  if (loading)
    return (
      <main className="login" role="status">
        Opening your workspace…
      </main>
    );
  if (!demo && !session)
    return (
      <main className="login card">
        <div className="brand">
          <span className="brand-mark">
            <BookOpen />
          </span>
          Congregation Assistant
        </div>
        <span className="eyebrow">Welcome back</span>
        <h1>A calmer way to keep things together.</h1>
        <p>Sign in with the account your congregation approved.</p>
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
          Continue with Google <ArrowRight />
        </button>
        {features.flags.MAGIC_LINK_ENABLED && <form className="stack" onSubmit={async e=>{e.preventDefault();const {error}=await client.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{shouldCreateUser:false,emailRedirectTo:location.origin+import.meta.env.BASE_URL}});if(error)setError(error.message);else setError("Check your email for the sign-in link.");}}><label>Email magic link<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button>Email sign-in link</button></form>}
        <p className="muted">
          Independent and unofficial. Your congregation controls access.
        </p>
        <div className="actions">
          <a href="?demo=admin">Try the admin demo</a>
          <a href="?demo=publisher">Publisher demo</a>
        </div>

      </main>
    );
  if (!cong&&!owner)
    return (
      <main className="login card">
        <h1>Approval needed</h1>
        <p>
          This account has no active congregation access. Ask your main
          administrator to approve your email.
        </p>
        <button onClick={signOut}>Sign out</button>
        <a href={import.meta.env.BASE_URL + "site/"}>Request a workspace</a>
      </main>
    );
  const go = (id: string) => {
    if(!allowed.some(r=>r.id===id))return;
    const url=new URL(location.href);url.searchParams.set("screen",id);history.replaceState(null,"",url.pathname+url.search);
    setRoute(id);
    setMore(false);
    setSearch(false);
  };
  const toolShortcuts=[
    {id:'groups',label:'Groups',route:'people',sub:'groups',group:'FIELD SERVICE',icon:Users,roles:['admin','field_service']},
    {id:'attendance',label:'Attendance',route:'reports',sub:'attendance',group:'ATTENDANCE',icon:BarChart3,roles:['admin','attendance']},
    {id:'midweek',label:'Midweek (OCLM)',route:'schedule',sub:'midweek',group:'SCHEDULES',icon:CalendarDays,roles:['admin','oclm']},
    {id:'weekend',label:'Weekend',route:'schedule',sub:'weekend',group:'SCHEDULES',icon:CalendarDays,roles:['admin','weekend']},
    {id:'duties',label:'Duties',route:'schedule',sub:'duties',group:'SCHEDULES',icon:ClipboardList,roles:['admin','oclm','attendant','av','cleaning']},
  ].filter(tool=>tool.roles.some(role=>roles.includes(role))&&allowed.some(r=>r.id===tool.route));
  const openTool=(tool:typeof toolShortcuts[number])=>{if(tool.id==='attendance')sessionStorage.setItem('ca-report-action',JSON.stringify({action:'attendance'}));sessionStorage.setItem('ca-workspace-tool',tool.sub);go(tool.route);window.dispatchEvent(new CustomEvent('ca:open-tool',{detail:tool.sub}));};
  return (
    <div className="app">
      <ExperienceDefaults key={(session?.user?.id||"demo")+cong} context={context}/><UpdatePrompt /><AdminIdleTimeout enabled={admin} notify={setNotice}/>
      <aside className={"rail " + (collapsed ? "collapsed" : "")}>
        <div className="brand">
          <span className="brand-mark">
            <BookOpen />
          </span>
          <span className="brand-name">
            Congregation
            <br />
            Assistant
          </span>
        </div>
        <nav aria-label="Main navigation">
          {allowed.map((r) => (
            <button
              key={r.id}
              className={route === r.id ? "active" : ""}
              onClick={() => go(r.id)}
              title={r.label}
              aria-label={r.label}
              aria-current={route === r.id ? "page" : undefined}
            >
              <r.icon />
              <span className="nav-label">{r.label}</span>
            </button>
          ))}
          {['FIELD SERVICE','ATTENDANCE','SCHEDULES'].map(group=>toolShortcuts.some(t=>t.group===group)&&<React.Fragment key={group}><span className="nav-group nav-label">{group}</span>{toolShortcuts.filter(t=>t.group===group).map(tool=><button key={tool.id} onClick={()=>openTool(tool)} aria-label={tool.label} title={tool.label}><tool.icon/><span className="nav-label">{tool.label}</span></button>)}</React.Fragment>)}
        </nav>
        <footer className="rail-footer">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <PanelLeftClose />
            <span>Collapse</span>
          </button>

          {!demo && (
            <button onClick={signOut}>
              <LogOut />
              <span>Sign out</span>
            </button>
          )}
        </footer>
      </aside>
      <div className="main">
        <header className="topbar">
          <strong>{context.name}</strong>
          <div className="actions">
            {demo && <span className="chip">Fictional demo</span>}
            <button
              className="icon-button"
              aria-label="Search tools"
              title="Search · Ctrl/Cmd+K"
              onClick={() => setSearch(true)}
            >
              <Search />
            </button>
            <button
              className="icon-button"
              aria-label="Appearance and settings"
              title="Settings"
              onClick={() => go("settings")}
            >
              <Settings />
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content">
          {!online && (
            <div className="banner" role="status">
              Offline. Cloud changes cannot be saved. Keep this page open to
              retain unsaved work.
            </div>
          )}
          {!demo && cong && route!=="owner" && Number(caps.schema_version||0)<2&&!plan?.locked && (
            <div className="banner" role="status">
              Update pending. New database tools will appear after the V2
              migration.{" "}
              Contact your administrator to apply the database update.
            </div>
          )}
          <Suspense fallback={<p role="status">Loading tools…</p>}>
            {owner&&(route==="owner"||!cong&&route!=="settings")?<OwnerConsole context={context}/>:owner&&!cong&&route==="settings"?<Workspace key="owner-settings" route="settings" go={go} context={context}/>:planError?<section className="card"><h1>Workspace status could not load.</h1><p role="alert">{planError}</p><button onClick={()=>location.reload()}>Retry</button></section>:plan?.congregation!==cong?<p role="status">Checking your workspace…</p>:plan.locked?<Subscription context={context} plan={plan}/>:<Workspace key={cong} route={allowed.some(r=>r.id===route)?route:"home"} go={go} context={context} />}
          </Suspense>
        </main>
      </div>
      <nav className="bottom-tabs" aria-label="Phone navigation">
        {routes
          .filter(r=>["home","schedule","people","reports"].includes(r.id)).slice(0, 4)
          .filter((r) => allowed.some((a) => a.id === r.id))
          .map((r) => (
            <button
              key={r.id}
              className={route === r.id ? "active" : ""}
              onClick={() => go(r.id)}
              aria-current={route === r.id ? "page" : undefined}
            >
              <r.icon />
              <span>{r.label}</span>
            </button>
          ))}
        <button onClick={() => setMore(true)}>
          <Menu />
          <span>More</span>
        </button>
      </nav>
      <Dialog open={more} onClose={() => setMore(false)} title="More tools">
        <div className="more-grid">
          {toolShortcuts.map(tool=><button key={tool.id} onClick={()=>openTool(tool)}><tool.icon/>{tool.label}</button>)}
          {allowed
            .filter(
              (r) => !["home", "schedule", "people", "reports"].includes(r.id),
            )
            .map((r) => (
              <button key={r.id} onClick={() => go(r.id)}>
                <r.icon/>{r.label}
              </button>
            ))}

          {!demo && <button onClick={signOut}>Sign out</button>}
        </div>
      </Dialog>
      <Dialog
        open={search}
        onClose={() => setSearch(false)}
        title="Find a tool"
      >
        <label>
          Search
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Schedule, people, reports…"
          />
        </label>
        <div className="list">
          {toolShortcuts.filter(t=>t.label.toLowerCase().includes(query.toLowerCase())).map(tool=><button key={tool.id} onClick={()=>openTool(tool)}><tool.icon/>{tool.label}</button>)}
          {allowed
            .filter((r) => r.label.toLowerCase().includes(query.toLowerCase()))
            .map((r) => (
              <button key={r.id} onClick={() => go(r.id)}>
                <r.icon/>{r.label}
              </button>
            ))}
        </div>
      </Dialog>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {new URLSearchParams(location.search).has("form") ? <Suspense fallback={<main>Opening protected form…</main>}><PublicForm/></Suspense> : <App />}
    </QueryClientProvider>
  </React.StrictMode>,
);
