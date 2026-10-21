import React from 'react';
import {SystemStatePage,type SystemState} from './SystemStates';
import {useNetworkStatus} from './network';
export function SystemRuntime({children}:{children:React.ReactNode}){
 const [state,setState]=React.useState<SystemState|null>(null);
 const [recovered,setRecovered]=React.useState(false);
 const [slow,setSlow]=React.useState<6|15|null>(null);
 const [lighter,setLighter]=React.useState(false);
 const online=useNetworkStatus(()=>{setRecovered(true);setTimeout(()=>setRecovered(false),5000);});
 React.useEffect(()=>{const fail=()=>setState('error');const event=(e:Event)=>setState((e as CustomEvent<SystemState>).detail);const slowRequest=(e:Event)=>setSlow((e as CustomEvent<6|15>).detail);window.addEventListener('ca:slow-request',slowRequest);window.addEventListener('error',fail);window.addEventListener('unhandledrejection',fail);window.addEventListener('ca:system-state',event);const connection=(navigator as Navigator&{connection?:{effectiveType?:string;saveData?:boolean}}).connection;setLighter(Boolean(connection?.saveData||['2g','slow-2g'].includes(connection?.effectiveType||'')));return()=>{window.removeEventListener('ca:slow-request',slowRequest);window.removeEventListener('error',fail);window.removeEventListener('unhandledrejection',fail);window.removeEventListener('ca:system-state',event);};},[]);
 React.useEffect(()=>{document.documentElement.dataset.lighter=String(lighter);},[lighter]);

 return <>{state&&<SystemStatePage state={state} onRetry={()=>setState(null)}/>}<div hidden={Boolean(state)}>{slow&&<p role="status">{slow===6?"This is taking longer than usual…":"Still working — your entered values are kept."}<button onClick={()=>setSlow(null)}>{"Keep waiting"}</button></p>}{!online&&!new URLSearchParams(location.search).has("system")&&<SystemStatePage state="offline"/>}{recovered&&<p role="status">{'Back online — review pending changes before sending.'}</p>}{lighter&&<p role="status">{'Lighter mode is on. '}<button onClick={()=>setLighter(false)}>{'Undo lighter mode'}</button></p>}{children}</div></>;
}
