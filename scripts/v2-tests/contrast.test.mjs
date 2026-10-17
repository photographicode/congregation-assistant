import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const css=readFileSync('packages/ui/themes.css','utf8');
const rgb=h=>{h=h.slice(1);if(h.length===3)h=h.split('').map(x=>x+x).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
const blend=(a,b)=>{if(a.startsWith('#'))return rgb(a);const values=a.match(/[\d.]+/g).map(Number);return values.slice(0,3).map((v,i)=>v*values[3]+b[i]*(1-values[3]));};
const lum=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const themes=[...css.matchAll(/\[data-theme="([\w-]+)"\]\{([^}]+)\}/g)];
for(const [,theme,body] of themes)for(const tone of ['soft','standard','sharp'])test(`${theme} ${tone} opaque and base-composited panel contrast`,()=>{const t=Object.fromEntries([...body.matchAll(/--([\w-]+):([^;]+);/g)].map(m=>[m[1],m[2]]));if(tone==='sharp'){t['text-2']=t['text-1'];t['text-3']=t['text-1'];}const panel=blend(t.surface,rgb(t.bg));for(const key of ['text-1','text-2','text-3','link'])for(const surface of [panel,rgb(t['surface-solid']),blend(t['surface-2'],panel)])assert(contrast(rgb(t[key]),surface)>=(key==='text-1'?7:4.5),`${theme} ${key}: ${contrast(rgb(t[key]),surface)}`);assert(contrast(rgb(t['text-on-accent']),rgb(t.accent))>=4.5);});
// This fast pair test does not certify raw gradient canvases. The independent
// Chromium matrix samples actual gradients and is a separate release gate.
