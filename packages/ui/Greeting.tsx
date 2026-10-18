import {t} from "../core/i18n";
import React from 'react';
import { greetingModel, nextMinuteDelay } from '../core/greeting.mjs';
export function Greeting({name='', timezone, locale='en', clock='locale', subline}: {name?:string; timezone?:string; locale?:string; clock?:string; subline?:string}) {
 const [now,setNow]=React.useState(()=>new Date());
 React.useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const sync=()=>{clearTimeout(timer);setNow(new Date());timer=setTimeout(sync,nextMinuteDelay(Date.now()));};
  const resume=()=>{if(document.visibilityState==='visible')sync();};
  sync(); document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',sync);window.addEventListener('focus',sync);
  return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('pageshow',sync);window.removeEventListener('focus',sync);};
 },[]);
 let value;try {value=greetingModel(now,{name,timezone,locale,clock});}catch{value=greetingModel(now,{name});}
 const suffix=name?', '+name+'.':'';const named=Boolean(suffix&&value.greeting.endsWith(suffix));
 return <section className="card greeting" data-period={value.period} aria-label={t("ui.your.day.b5b35eb8")}>
  <div><h1>{named?value.greeting.slice(0,-suffix.length):value.greeting}</h1>{named&&<p className="greeting-name">{name}.</p>}<time dateTime={value.dateISO}>{value.date}</time>{subline&&<p>{subline}</p>}</div>
  <div className="greeting-clock"><time dateTime={now.toISOString()} aria-live="off">{value.time}</time>{value.differentZone&&<span className="chip">{value.zoneLabel} {t("ui.congregation.time.9660f7fe")}</span>}</div>
 </section>;
}
