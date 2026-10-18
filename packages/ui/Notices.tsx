import React from 'react';
import {t} from '../core/i18n';
// One app notice is mounted at a time. A paused timer retains its remaining time.
export function Toast({message,onClose,children,duration=5000,className='notice'}:{message:string;onClose:()=>void;children?:React.ReactNode;duration?:number;className?:string}){
 const [hover,setHover]=React.useState(false),[focused,setFocused]=React.useState(false),remaining=React.useRef(duration),close=React.useRef(onClose);close.current=onClose;
 React.useEffect(()=>{remaining.current=duration;},[message,duration]);
 React.useEffect(()=>{if(hover||focused)return;const start=performance.now(),timer=setTimeout(()=>close.current(),remaining.current);return()=>{clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(performance.now()-start));};},[message,duration,hover,focused]);
 return <div className={className} role="status" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocus={()=>setFocused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}><span>{message}</span>{children}<button type="button" onClick={onClose} aria-label={t('polish.dismissNotice')}>{t('common.close')}</button></div>;
}
export function DismissibleBanner({stateKey,children,className='banner',untilChanged=false}:{stateKey:string;children:React.ReactNode;className?:string;untilChanged?:boolean}){
 const key='ca-banner:'+stateKey;
 const [dismissed,setDismissed]=React.useState(()=>{try{const at=Number(localStorage.getItem(key));return at>0&&(untilChanged||Date.now()-at<86400000);}catch{return false;}});
 if(dismissed)return null;
 return <aside className={className} role="status"><div>{children}</div><button type="button" aria-label={t('polish.dismissBanner')} onClick={()=>{try{localStorage.setItem(key,String(Date.now()));}catch{/* Dismiss for this visit when storage is unavailable. */}setDismissed(true);}}>{t('common.close')}</button></aside>;
}
