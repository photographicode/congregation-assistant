// Per-device display choices for the territory manager: card or list view, and light/dark/auto theme.
import React from 'react';

export type View='cards'|'list';
export type Theme='auto'|'light'|'dark';
export type Style='soft'|'glass';
type Prefs={view:View;theme:Theme;style:Style};
const KEY='ca-territory-prefs',listeners=new Set<()=>void>();
const DEFAULTS:Prefs={view:'cards',theme:'auto',style:'soft'};
function read():Prefs{
 try{const v=JSON.parse(localStorage.getItem(KEY)||'{}') as Partial<Prefs>;return {view:v.view==='list'?'list':'cards',theme:v.theme==='light'||v.theme==='dark'?v.theme:'auto',style:v.style==='glass'?'glass':'soft'};}
 catch{return DEFAULTS;}
}
let current=read();
export function setPrefs(next:Partial<Prefs>){current={...current,...next};try{localStorage.setItem(KEY,JSON.stringify(current));}catch{/* private mode: keep for this visit */}listeners.forEach(fn=>fn());}
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const usePrefs=()=>React.useSyncExternalStore(subscribe,()=>current);

/** Applies the chosen theme to the page; the shared dialogs follow through the app's mono themes. */
/** Territory theme for signed-in screens; the signed-out landing page uses the main site's Eclipse light theme. */
export function useTerritoryTheme(active=true){
 const {theme,style}=usePrefs();
 React.useEffect(()=>{
  const media=matchMedia('(prefers-color-scheme: dark)'),root=document.documentElement,before=root.dataset.theme;
  const apply=()=>{if(!active){delete root.dataset.tmTheme;delete root.dataset.tmStyle;root.dataset.theme='mono-light';return;}const dark=theme==='dark'||(theme==='auto'&&media.matches);root.dataset.tmTheme=dark?'dark':'light';root.dataset.tmStyle=style;root.dataset.theme=dark?'mono-dark':'mono-light';};
  apply();media.addEventListener('change',apply);
  return()=>{media.removeEventListener('change',apply);delete root.dataset.tmTheme;delete root.dataset.tmStyle;if(before)root.dataset.theme=before;else delete root.dataset.theme;};
 },[theme,style,active]);
}
