import React from 'react';
export function useNetworkStatus(onRecover?:()=>void){
 const [online,setOnline]=React.useState(navigator.onLine);
 React.useEffect(()=>{let alive=true;let controller:AbortController|undefined;const probe=async()=>{controller?.abort();controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),3000);try{const response=await fetch(`${import.meta.env.BASE_URL}version.json`,{method:'HEAD',cache:'no-store',signal:controller.signal});if(alive)setOnline(response.ok);}catch{if(alive)setOnline(false);}finally{clearTimeout(timer);}};const offline=()=>setOnline(false);void probe();window.addEventListener('online',probe);window.addEventListener('offline',offline);const timer=setInterval(()=>{if(!navigator.onLine||!online)void probe();},20000);return()=>{alive=false;controller?.abort();clearInterval(timer);window.removeEventListener('online',probe);window.removeEventListener('offline',offline);};},[online]);
 const previous=React.useRef(online);React.useEffect(()=>{if(online&&!previous.current)onRecover?.();previous.current=online;},[online,onRecover]);return online;
}
export async function fetchWithPatience(input:RequestInfo|URL,init:RequestInit={},onSlow:(level:6|15)=>void=()=>{},retries=2):Promise<Response>{
 const method=(init.method||(input instanceof Request?input.method:'GET')).toUpperCase();const idempotent=['GET','HEAD','OPTIONS'].includes(method);const controller=new AbortController();const cancel=()=>controller.abort(init.signal?.reason);if(init.signal?.aborted)cancel();else init.signal?.addEventListener('abort',cancel,{once:true});const first=setTimeout(()=>onSlow(6),6000),second=setTimeout(()=>onSlow(15),15000);
 try{for(let attempt=0;;attempt++){try{const response=await fetch(input,{...init,signal:controller.signal});if(!idempotent||attempt>=retries||response.status<500)return response;}catch(error){if(controller.signal.aborted||!idempotent||attempt>=retries)throw error;}await new Promise<void>((resolve,reject)=>{const timer=setTimeout(done,250*2**attempt);function abort(){clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));}function done(){controller.signal.removeEventListener('abort',abort);resolve();}controller.signal.addEventListener('abort',abort,{once:true});});}}finally{clearTimeout(first);clearTimeout(second);init.signal?.removeEventListener('abort',cancel);}
}
export const monitoredFetch:typeof fetch=async(input,init={})=>{
 const slow=(level:6|15)=>window.dispatchEvent(new CustomEvent('ca:slow-request',{detail:level}));
 let response:Response;try{response=await fetchWithPatience(input,init,slow);}finally{window.dispatchEvent(new CustomEvent('ca:slow-request',{detail:null}));}
 const states:Record<number,string>={401:'session',403:'forbidden',429:'rateLimit',500:'error',503:'maintenance'};
 if(states[response.status])window.dispatchEvent(new CustomEvent('ca:system-state',{detail:states[response.status]}));
 return response;
};
