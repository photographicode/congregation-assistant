import React from 'react';
import {Home,Users,BarChart3,CalendarDays,Settings,Menu,Search,Plus,BookOpen,Bell,PanelLeftClose,LogOut,UserRound,Shield} from 'lucide-react';
import type {NavigationTab} from '../core/navigation';
import {t,type MessageKey} from '../core/i18n';
import {Avatar} from './components';
import {Dialog} from './Dialog';
import {preferenceStorage} from '../core/storage';
const icons={home:Home,people:Users,reports:BarChart3,meetings:CalendarDays,more:Menu,me:UserRound,settings:Settings,owner:Shield};
const labels:Record<NavigationTab['id'],MessageKey>={home:'ux.nav.today',people:'nav.people',reports:'nav.reports',meetings:'nav.meetings',more:'ux.nav.more',me:'ux.nav.me',settings:'tool.settings',owner:'ux.nav.owner'};
type Props={searchRef:React.RefObject<HTMLButtonElement>;accountRef:React.RefObject<HTMLButtonElement>;quickRef:React.RefObject<HTMLButtonElement>;name:string;firstName?:string;active:NavigationTab['id'];tabs:NavigationTab[];onNavigate:(tab:NavigationTab)=>void;onSearch:()=>void;onQuick?:()=>void;onInbox?:()=>void;inboxCount?:number;onUpdates:()=>void;onAccount:()=>void;onDisplay:()=>void;onHelp:()=>void;signOut:()=>void;demo:boolean;children:React.ReactNode;roleLabel?:string};
function useWideNavigation(){
 const [wide,setWide]=React.useState(()=>matchMedia('(min-width:600px)').matches);
 React.useEffect(()=>{const query=matchMedia('(min-width:600px)'),changed=()=>setWide(query.matches);query.addEventListener('change',changed);return()=>query.removeEventListener('change',changed);},[]);
 return wide;
}
export function AppShell({searchRef,accountRef,quickRef,name,firstName,active,tabs,onNavigate,onSearch,onQuick,onInbox,inboxCount=0,onUpdates,onAccount,onDisplay,onHelp,signOut,demo,children,roleLabel}:Props){
 const [collapsed,setCollapsed]=React.useState(()=>preferenceStorage.getItem('ca-v3-sidebar')==='compact'),[accountOpen,setAccountOpen]=React.useState(false);
 const wide=useWideNavigation();
 const afterAccount=React.useRef<(()=>void)|null>(null);
 function nav(tab:NavigationTab){const Icon=icons[tab.id];return <button key={tab.id} className={active===tab.id?'active':''} aria-current={active===tab.id?'page':undefined} aria-label={t(labels[tab.id])} onClick={()=>onNavigate(tab)} type="button"><Icon aria-hidden="true"/><span className="nav-label">{t(labels[tab.id])}</span></button>;}
 function accountAction(action:()=>void){afterAccount.current=action;setAccountOpen(false);}
 return <div className="app v3-shell v4-shell" data-collapsed={collapsed}>
  <a className="v4-skip" href="#main-content">{t('v4.ac576a66d4')}</a>
  <aside className="rail v3-sidebar"><div className="brand"><span className="brand-mark"><BookOpen aria-hidden="true"/></span><span className="brand-name">{t('brand.name')}</span></div><nav aria-label={t('v4.eb355944b9')}>{tabs.map(nav)}</nav>
   <footer className="rail-footer"><button type="button" aria-label={t('nav.account')} onClick={()=>setAccountOpen(true)}><Settings aria-hidden="true"/><span>{t('nav.account')}</span></button><button aria-label={t(collapsed?'ux.nav.expand':'ux.nav.collapse')} type="button" onClick={()=>{setCollapsed(!collapsed);preferenceStorage.setItem('ca-v3-sidebar',collapsed?'expanded':'compact');}}><PanelLeftClose aria-hidden="true"/><span>{t(collapsed?'ux.nav.expand':'ux.nav.collapse')}</span></button>{!demo&&<button onClick={signOut} aria-label={t('nav.signOut')} type="button"><LogOut aria-hidden="true"/><span>{t('nav.signOut')}</span></button>}</footer>
  </aside>
  <div className="main v3-main"><header className="topbar"><div className="v4-workspace-name"><div><strong>{name}</strong><small>{roleLabel}</small></div></div><div className="actions"><button ref={searchRef} className="v4-search" aria-label={t('nav.search')} onClick={onSearch} type="button"><Search aria-hidden="true"/><span>{t('common.search')}</span><kbd>{t('v4.8296d6201a')}</kbd></button>{wide&&onQuick&&<button ref={quickRef} className="icon-button" aria-label={t('nav.quickActions')} onClick={onQuick} type="button"><Plus aria-hidden="true"/></button>}<InboxButton count={inboxCount} onOpen={onInbox}/><button ref={accountRef} className="icon-button" aria-label={t('nav.account')} onClick={()=>setAccountOpen(true)} type="button"><Avatar name={firstName||name}/></button></div></header><div className="v3-content-row"><main className="main-content" id="main-content" tabIndex={-1}>{children}</main></div></div>
  <nav className="bottom-tabs" aria-label={t('v4.2d8e1706af')}>{tabs.map(nav)}</nav>
  <Dialog onAfterCloseFocus={()=>{const action=afterAccount.current;afterAccount.current=null;action?.();}} open={accountOpen} onClose={()=>setAccountOpen(false)} title={t('nav.account')}><div className="stack">{onQuick&&<button type="button" onClick={()=>accountAction(onQuick)}>{t('nav.quickActions')}</button>}<button type="button" onClick={()=>accountAction(onAccount)}>{t('nav.account')}</button><button type="button" onClick={()=>accountAction(onDisplay)}>{t('ux.nav.display')}</button><button type="button" onClick={()=>accountAction(onUpdates)}>{t('ui.what.s.new.37e6112e')}</button><button type="button" onClick={()=>accountAction(onHelp)}>{t('ux.nav.help')}</button>{!demo&&<button type="button" onClick={()=>accountAction(signOut)}>{t('nav.signOut')}</button>}</div></Dialog>
 </div>;
}

function InboxButton({count,onOpen}:{count:number;onOpen?:()=>void}){
 if(!onOpen)return null;
 return <button className="icon-button ux-inbox-button" aria-label={count>0?t('ux.inbox.unread').replace('{count}',String(count)):t('ux.nav.inbox')} onClick={onOpen} type="button"><Bell aria-hidden="true"/>{count>0&&<span className="ux-inbox-count" aria-hidden="true" translate="no">{count}</span>}</button>;
}
