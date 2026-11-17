// A shimmering outline of a Territory Map Card (title, locality, map with the territory, QR code, card note), shown in the
// fictional demo where cards have no image, so visitors see what a real card holds. Drawn in SVG with currentColor, so it
// needs no stylesheet and follows the light and dark themes; the shine stands still for people who ask for less motion.
import React from 'react';

import {Map as MapIcon} from 'lucide-react';
import {demo} from './client';

const W=300,H=200,SHINE=90,DUR='1.8s';
// Thumbnail styles size icons; the sketch fills its box instead (set here: the stylesheet is at its size budget).
const fill=(el:SVGSVGElement|null)=>{el?.style.setProperty('inline-size','100%');el?.style.setProperty('block-size','100%');};
const still=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
// Faint blocks of the card layout: title, locality and number, card note.
const BLOCKS='M99 12h102a4.5 4.5 0 0 1 0 9H99a4.5 4.5 0 0 1 0-9ZM19 32h144a3.5 3.5 0 0 1 0 7H19a3.5 3.5 0 0 1 0-7ZM229 32h52a3.5 3.5 0 0 1 0 7h-52a3.5 3.5 0 0 1 0-7ZM19 172h262a3 3 0 0 1 0 6H19a3 3 0 0 1 0-6ZM47 184h206a3 3 0 0 1 0 6H47a3 3 0 0 1 0-6Z';
const QR='M228 64h9v9h-9zM238 64h9v9h-9zM228 74h9v9h-9zM258 64h9v9h-9zM268 74h9v9h-9zM238 94h9v9h-9zM258 94h9v9h-9zM268 104h9v9h-9zM228 104h9v9h-9zM248 84h9v9h-9z';

function CardSketch({label}:{label:string}){
 const id=React.useId().replace(/:/g,'');
 return <svg ref={fill} viewBox={`0 0 ${W} ${H}`} width={W*2} height={H*2} role="img" aria-label={label} fill="currentColor">
  <defs><linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor="white" stopOpacity="0"/><stop offset="0.5" stopColor="white" stopOpacity="0.35"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient></defs>
  <rect width={W} height={H} rx="10" fillOpacity="0.05"/>
  <path d={BLOCKS} fillOpacity="0.18"/>
  <rect x="16" y="48" width="192" height="114" rx="6" fillOpacity="0.08"/>
  <path d="M48 70 L120 58 L176 84 L168 140 L96 150 L52 128 Z" fillOpacity="0.16" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2"/>
  <rect x="222" y="58" width="62" height="62" rx="4" fillOpacity="0.1"/>
  <path d={QR} fillOpacity="0.28"/>
  <rect x={-SHINE} width={SHINE} height={H} fill={`url(#${id})`}>{!still()&&<animate attributeName="x" from={-SHINE} to={W} dur={DUR} repeatCount="indefinite"/>}</rect>
 </svg>;
}

/** Where a card has no image: the shimmering sample card in the demo, a map icon in a real workspace. */
export function CardPlaceholder({number}:{number:string}){
 return demo?<CardSketch label={`Sample territory card ${number}`}/>:<MapIcon aria-hidden="true"/>;
}
