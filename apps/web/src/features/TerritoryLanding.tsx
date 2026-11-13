// Landing page of territory.congregationassistant.com for visitors who are not signed in:
// what the territory manager does, the Territory Map Card, and the service that makes territories.
// Same soft raised look as congregationassistant.com; text in English and the main Indian languages.
import React from 'react';
import {ArrowRight,Check,ClipboardList,Languages,Map as MapIcon,MapPin,QrCode,Share2,TriangleAlert} from 'lucide-react';
import {LegacySelect} from '../../../../packages/ui/components';
import {mainAppUrl,territoryUrl} from './territory-site';
import {initialLang,LANGUAGES,translate,type Key,type Lang} from './territory-landing-i18n';
import cardImage from './assets/territory-map-card.webp';

const FEATURES:{icon:React.ReactNode;title:Key;text:Key}[]=[
 {icon:<MapIcon aria-hidden="true"/>,title:'f1Title',text:'f1Text'},
 {icon:<ClipboardList aria-hidden="true"/>,title:'f2Title',text:'f2Text'},
 {icon:<Share2 aria-hidden="true"/>,title:'f3Title',text:'f3Text'},
 {icon:<TriangleAlert aria-hidden="true"/>,title:'f4Title',text:'f4Text'},
];
const POINTS:{icon:React.ReactNode;text:Key}[]=[
 {icon:<MapPin aria-hidden="true"/>,text:'cardP1'},{icon:<MapIcon aria-hidden="true"/>,text:'cardP2'},
 {icon:<QrCode aria-hidden="true"/>,text:'cardP3'},{icon:<Languages aria-hidden="true"/>,text:'cardP4'},
];
// Ids match the service choices on the request form, which preselects the one chosen here.
const SERVICES:{id:'scratch'|'cards'|'package';title:Key;text:Key}[]=[
 {id:'scratch',title:'s1Title',text:'s1Text'},{id:'cards',title:'s2Title',text:'s2Text'},{id:'package',title:'s3Title',text:'s3Text'},
];
/** Pointer tilt: offset from the card centre (0.5) times the largest tilt in degrees. */
const HALF=0.5,TILT=8;
const STEPS:Key[]=['st1','st2','st3','st4','st5','st6','st7'];
const CHIPS:Key[]=['chipS13','chipQr','chipShare','chipLangs'];

/** Fades sections in as they scroll into view (skipped when the visitor prefers reduced motion). */
function useReveal(){
 React.useEffect(()=>{
  const items=[...document.querySelectorAll<HTMLElement>('.tl-reveal')];
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window)){items.forEach(el=>el.classList.add('is-in'));return;}
  const seen=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-in');seen.unobserve(entry.target);}}),{threshold:0.15});
  items.forEach(el=>seen.observe(el));
  return()=>seen.disconnect();
 },[]);
}

/** Signed-out view of the territory site. `signIn` starts Google sign-in. */
export function TerritoryLanding({signIn}:{signIn:()=>void}){
 const [lang,setLang]=React.useState<Lang>(initialLang),[service,setService]=React.useState<typeof SERVICES[number]['id']>('package');
 const say=(key:Key)=>translate(lang,key);
 useReveal();
 React.useEffect(()=>{document.title=translate(lang,'heroTitle')+' · Territory manager · Congregation Assistant';document.querySelector('meta[name=description]')?.setAttribute('content',translate(lang,'heroLead'));document.documentElement.lang=lang;try{localStorage.setItem('ca-territory-lang',lang);}catch{/* the choice just is not remembered */}},[lang]);
 return <main className="tl">
  <header className="tl-bar">
   <span className="tl-brand"><span className="brand-mark"><MapIcon aria-hidden="true"/></span>{'Territories'}<small>{'Congregation Assistant'}</small></span>
   <span className="tl-bar-end">
    <LanguagePicker lang={lang} onChange={setLang} label={say('language')}/>
    <button className="tl-btn" onClick={signIn} type="button">{say('signIn')}</button>
   </span>
  </header>
  <section className="tl-hero" aria-labelledby="tl-title">
   <div className="tl-hero-copy">
    <h1 id="tl-title" className="tl-rise">{say('heroTitle')}</h1>
    <p className="tl-rise">{say('heroLead')}</p>
    <div className="tl-actions tl-rise">
     <a className="tl-btn primary" href="#tl-help">{say('heroHelp')}<ArrowRight aria-hidden="true"/></a>
     <a className="tl-btn" href="?territory&demo">{say('heroDemo')}</a>
    </div>
    <ul className="tl-chips tl-rise">{CHIPS.map(key=><li key={key}><Check aria-hidden="true"/>{say(key)}</li>)}</ul>
   </div>
   <TiltCard src={cardImage} alt={say('cardAlt')} scan={say('scan')}/>
  </section>
  <section className="tl-section tl-reveal" aria-labelledby="tl-features">
   <h2 id="tl-features">{say('featuresTitle')}</h2>
   <div className="tl-grid">{FEATURES.map(f=><article className="tl-tile" key={f.title}><span className="tl-icon">{f.icon}</span><h3>{say(f.title)}</h3><p>{say(f.text)}</p></article>)}</div>
  </section>
  <section className="tl-section tl-split tl-reveal" aria-labelledby="tl-card">
   <div className="tl-section">
    <h2 id="tl-card">{say('cardTitle')}</h2>
    <p>{say('cardLead')}</p>
    <ul className="tl-points">{POINTS.map(p=><li key={p.text}><span className="tl-icon">{p.icon}</span>{say(p.text)}</li>)}</ul>
    <a className="tl-btn" href={cardImage} target="_blank" rel="noreferrer">{say('cardOpen')}<ArrowRight aria-hidden="true"/></a>
   </div>
   <a className="tl-photo" href={cardImage} target="_blank" rel="noreferrer"><img src={cardImage} alt={say('cardAlt')} loading="lazy" width={1200} height={783}/></a>
  </section>
  <section className="tl-section tl-reveal" aria-labelledby="tl-langs">
   <h2 id="tl-langs">{say('langsTitle')}</h2>
   <p>{say('langsLead')}</p>
  </section>
  <section className="tl-section tl-reveal" id="tl-help" aria-labelledby="tl-help-title">
   <h2 id="tl-help-title">{say('helpTitle')}</h2>
   <p>{say('helpLead')}</p>
   <div className="tl-grid" role="group" aria-labelledby="tl-help-title">{SERVICES.map(s=><button key={s.id} type="button" className={'tl-tile tl-choice'+(service===s.id?' on':'')} aria-pressed={service===s.id} onClick={()=>setService(s.id)}>
    {s.id==='package'&&<span className="tl-badge">{say('best')}</span>}<h3>{say(s.title)}</h3><p>{say(s.text)}</p></button>)}</div>
   <ol className="tl-steps" aria-label={say('stepsLabel')}>{STEPS.map((step,i)=><li key={step}><span>{i+1}</span>{say(step)}</li>)}</ol>
   <div className="tl-actions"><a className="tl-btn primary" href={territoryUrl('request=territory&service='+service)}>{say('helpCta')}<ArrowRight aria-hidden="true"/></a></div>
  </section>
  <footer className="tl-foot"><span>{say('unofficial')}</span><a href={mainAppUrl()}>{say('mainSite')}</a></footer>
 </main>;
}

function LanguagePicker({lang,onChange,label}:{lang:Lang;onChange:(lang:Lang)=>void;label:string}){
 return <span className="tl-lang"><Languages aria-hidden="true"/>
  <LegacySelect value={lang} required onChange={e=>onChange(e.target.value as Lang)} aria-label={label}>{LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.name}</option>)}</LegacySelect>
 </span>;
}

/** The real card in a raised frame. It tilts toward the pointer and floats gently; the QR corner pulses. */
function TiltCard({src,alt,scan}:{src:string;alt:string;scan:string}){
 const ref=React.useRef<HTMLDivElement>(null);
 const move=(e:React.PointerEvent)=>{const el=ref.current;if(!el||e.pointerType!=='mouse')return;const box=el.getBoundingClientRect();el.style.setProperty('--rx',String(((e.clientY-box.top)/box.height-HALF)*-TILT));el.style.setProperty('--ry',String(((e.clientX-box.left)/box.width-HALF)*TILT));};
 const reset=()=>{ref.current?.style.removeProperty('--rx');ref.current?.style.removeProperty('--ry');};
 return <div className="tl-stage tl-rise" ref={ref} onPointerMove={move} onPointerLeave={reset}>
  <div className="tl-float"><img src={src} alt={alt} width={1200} height={783}/><span className="tl-scan"><QrCode aria-hidden="true"/>{scan}</span></div>
 </div>;
}
