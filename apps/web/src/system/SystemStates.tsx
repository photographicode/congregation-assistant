import React from 'react';
import {SystemPage} from '../../../../packages/ui/SystemPage';
import {t} from '../../../../packages/core/i18n';
export const stateKeys=['notFound','offline','error','session','forbidden','inactive','maintenance','rateLimit','expired','browser','storage'] as const;
export type SystemState=typeof stateKeys[number];
export function SystemStatePage({state,onHome=()=>location.assign(import.meta.env.BASE_URL),onRetry=()=>location.reload()}:{state:SystemState;onHome?:()=>void;onRetry?:()=>void}){
 const [seconds,setSeconds]=React.useState(state==='rateLimit'?30:0);
 const reference=React.useMemo(()=>`CA-${Math.floor(Math.random()*1679616).toString(36).toUpperCase().padStart(4,'0')}`,[]);
 React.useEffect(()=>{if(state!=='rateLimit')return;const timer=setInterval(()=>setSeconds(n=>Math.max(0,n-1)),1000);return()=>clearInterval(timer);},[state]);
 React.useEffect(()=>{if(state!=='maintenance')return;const timer=setInterval(onRetry,30000);return()=>clearInterval(timer);},[state,onRetry]);
 const primary={label:t(state==='session'?'system.signIn':state==='notFound'||state==='forbidden'?'system.home':'system.retry'),run:state==='notFound'||state==='forbidden'?onHome:onRetry,disabled:seconds>0};
 const secondary=state==='error'?{label:t('system.copy'),run:()=>void navigator.clipboard.writeText(JSON.stringify({reference,state,version:1}))}:state==='notFound'?{label:t('system.search'),run:()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}))}:{label:t('system.home'),run:onHome};
 return <SystemPage key={state} title={t(`system.${state}.title`)} description={t(`system.${state}.body`).replace('{n}',String(seconds))} primary={primary} secondary={secondary} reference={state==='error'?reference:undefined} status={state==='offline'||state==='maintenance'}/>;
}
export class SystemBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<SystemStatePage state="error" onRetry={()=>this.setState({failed:false})}/>:this.props.children;}
}
