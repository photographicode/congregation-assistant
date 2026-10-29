import {useSyncExternalStore} from 'react';
import {formatRoute,parseRoute,type Route} from './router';
let currentURL=typeof location==="undefined"?"/":location.pathname+location.search;
const listeners=new Set<()=>void>();
function notify(){for(const listener of listeners)listener();}
function changed(){window.dispatchEvent(new Event('ca:after-navigate'));notify();}
export function guardRoute(action:()=>void){
 const event=new CustomEvent('ca:before-navigate',{cancelable:true,detail:action});
 window.dispatchEvent(event);
 if(!event.defaultPrevented)action();
}
function commit(route:Route,replace:boolean){
 const previous=parseRoute(currentURL);
 const url=location.pathname+formatRoute(route);
 if(url===currentURL)return;
 if(replace)history.replaceState(null,'',url);else history.pushState(null,'',url);
 currentURL=url;
 changed();
 if(previous.screen!==route.screen){requestAnimationFrame(()=>{const main=document.querySelector<HTMLElement>('#main-content');main?.scrollTo(0,0);main?.focus();});}
}
export function navigateRoute(next:Partial<Route>,options:{replace?:boolean;refine?:boolean}={}){
 const previous=parseRoute(currentURL);
 const route:Route=options.refine?{...previous,...next}:{screen:previous.screen,demo:previous.demo,...next};
 guardRoute(()=>commit(route,Boolean(options.replace)));
}
function onPopState(){
 const target=location.pathname+location.search;
 if(target===currentURL)return;
 const previous=currentURL;
 let accepted=false;
 const action=()=>{accepted=true;history.replaceState(null,'',target);currentURL=target;changed();};
 const event=new CustomEvent('ca:before-navigate',{cancelable:true,detail:action});
 window.dispatchEvent(event);
 if(!event.defaultPrevented)action();
 else if(!accepted)history.pushState(null,'',previous);
}
function subscribe(listener:()=>void){
 if(!listeners.size)window.addEventListener('popstate',onPopState);
 listeners.add(listener);
 return ()=>{listeners.delete(listener);if(!listeners.size)window.removeEventListener('popstate',onPopState);};
}
export function useRoute(){return parseRoute(useSyncExternalStore(subscribe,()=>currentURL,()=>currentURL));}
export function useRouteField(key:'tab'|'week'|'month'|'q'|'doc'|'view',fallback:string){
 const route=useRoute();
 const value=route[key]||fallback;
 const setValue=(next:string)=>navigateRoute({[key]:next},{refine:true,replace:key!=='tab'});
 return [value,setValue] as const;
}

export function clearRouteAction(action:string){
 const route=parseRoute(currentURL);
 if(route.action!==action)return;
 delete route.action;
 currentURL=location.pathname+formatRoute(route);
 history.replaceState(null,'',currentURL);
 notify();
}
