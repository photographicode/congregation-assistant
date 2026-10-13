import React, { useEffect, useState, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  Download,
} from "lucide-react";
import { Dialog } from "../../../packages/ui/Dialog";
import { client, demo, capabilities } from "./v2/client";
import { useAppearance } from "./v2/store";
import { adapt } from "./v2/accessibility";
import "./v2/styles.css";
const Workspace = lazy(() => import("./v2/Workspace"));
const routes = [
  { id: "home", label: "Home", icon: Home },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "people", label: "People", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "access", label: "Access & Links", icon: Link2 },
  { id: "settings", label: "Settings", icon: Settings },
];
export type Context = {
  cong: string;
  name: string;
  roles: string[];
  caps: any;
  notify: (s: string) => void;
};
function App() {
  const [session, setSession] = useState<any>(null),
    [loading, setLoading] = useState(!demo),
    [error, setError] = useState(""),
    [memberships, setMemberships] = useState<any[]>([]),
    [cong, setCong] = useState(demo ? "demo" : ""),
    [caps, setCaps] = useState<any>({}),
    [route, setRoute] = useState("home"),
    [collapsed, setCollapsed] = useState(false),
    [more, setMore] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(navigator.onLine);
  const appearance = useAppearance();
  useEffect(() => adapt(appearance), [appearance]);
  React.useLayoutEffect(()=>{window.scrollTo(0,0);},[route,cong]);
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
          role: "admin",
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
        setSession(data.session);
        if (error) setError(error.message);
        setLoading(false);
      }
    });
    const { data } = client.auth.onAuthStateChange((_event, value) => {
      if (active) setSession(value);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
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
  // Same-user SIGNED_IN/TOKEN_REFRESHED events also arrive from embedded
  // legacy tools. Reloading access here would unmount and reopen that iframe.
  }, [session?.user?.id, session?.user?.email]);
  useEffect(() => {
    if (cong && !demo) capabilities(cong).then(setCaps);
  }, [cong]);
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
      admin ||
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
    cong,
    name:
      memberships.find((m) => m.cong_id === cong)?.congregations?.name ||
      "Congregation",
    roles,
    caps,
    notify: setNotice,
  };
  async function signOut() {
    const { clearDevice } = await import("./v2/device-keys");
    await clearDevice();
    for (const store of [localStorage, sessionStorage]) {
      for (const key of Object.keys(store))
        if (
          key.startsWith("ca_") ||
          key.startsWith("ca-") ||
          key.startsWith("oclm_")
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
        <p className="muted">
          Independent and unofficial. Your congregation controls access.
        </p>
        <div className="actions">
          <a href="?demo=admin">Try the admin demo</a>
          <a href="../?demo=publisher">Publisher demo</a>
        </div>
        <p>
          <a href="../?ui=legacy">Open existing app</a>
        </p>
      </main>
    );
  if (!cong)
    return (
      <main className="login card">
        <h1>Approval needed</h1>
        <p>
          This account has no active congregation access. Ask your main
          administrator to approve your email.
        </p>
        <button onClick={signOut}>Sign out</button>
        <a href="../site/">Request a workspace</a>
      </main>
    );
  const go = (id: string) => {
    setRoute(id);
    setMore(false);
    setSearch(false);
  };
  return (
    <div className="app">
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
        </nav>
        <footer className="rail-footer">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <PanelLeftClose />
            <span>Collapse</span>
          </button>
          <a href="../?ui=legacy" className="muted">
            Existing app
          </a>
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
          {!demo && caps.schema_version !== 2 && (
            <div className="banner" role="status">
              Update pending. New database tools will appear after the V2
              migration.{" "}
              <a href="../?ui=legacy">Continue with existing tools</a>.
            </div>
          )}
          <Suspense fallback={<p role="status">Loading tools…</p>}>
            <Workspace key={cong} route={route} go={go} context={context} />
          </Suspense>
        </main>
      </div>
      <nav className="bottom-tabs" aria-label="Phone navigation">
        {routes
          .slice(0, 4)
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
        <div className="stack">
          {allowed
            .filter(
              (r) => !["home", "schedule", "people", "reports"].includes(r.id),
            )
            .map((r) => (
              <button key={r.id} onClick={() => go(r.id)}>
                {r.label}
              </button>
            ))}
          <a href="../?ui=legacy">Existing app</a>
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
          {allowed
            .filter((r) => r.label.toLowerCase().includes(query.toLowerCase()))
            .map((r) => (
              <button key={r.id} onClick={() => go(r.id)}>
                {r.label}
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
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
