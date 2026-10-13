export function adapt(preferences: {theme:string;tone:string;size:string;weight:string;solid:boolean;auto:boolean;fit?:string}) {
 const root=document.documentElement;
 let frame=0;
 const update=()=>{
  const media=(q:string)=>matchMedia(q).matches;
  const width=window.innerWidth,height=window.visualViewport?.height||window.innerHeight;
  const scale=parseFloat(getComputedStyle(root).fontSize)/16 * ({S:.875,M:1,L:1.25,XL:1.5}[preferences.size]||1);
  const keyboard=Boolean(window.visualViewport && window.innerHeight-height>150 && /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''));
  root.dataset.caTheme=preferences.theme==='auto'?(media('(prefers-color-scheme: dark)')?'slate':'paper'):preferences.theme;
  root.dataset.tone=preferences.tone;root.dataset.highContrast=String(preferences.auto&&(media('(prefers-contrast: more)')||media('(forced-colors: active)')));
  root.dataset.solid=String(preferences.solid||(preferences.auto&&media('(prefers-reduced-transparency: reduce)')));
  root.dataset.coarse=String(media('(pointer: coarse)'));root.dataset.hover=String(media('(hover: hover)'));
  root.dataset.reducedMotion=String(media('(prefers-reduced-motion: reduce)'));root.dataset.textSize=preferences.size;root.dataset.iconWeight=preferences.weight;
  root.dataset.largeText=String(scale>=1.3||['L','XL'].includes(preferences.size));root.dataset.textBucket=scale>=2?'200':scale>=1.3?'130':'100';
  root.dataset.sizeClass=width<360?'xs':width<480?'sm':width<768?'md':width<1024?'lg':'xl';
  root.dataset.short=String(height<500&&!keyboard);root.dataset.orientation=width>height?'landscape':'portrait';root.dataset.standalone=String(media('(display-mode: standalone)'));
  root.dataset.density=preferences.fit==='auto'||!preferences.fit?(scale>=1.3?'spacious':width<360?'compact':'comfortable'):preferences.fit==='large'?'spacious':preferences.fit;
  root.dataset.keyboardOpen=String(keyboard);root.style.setProperty('--visible-h',height+'px');root.style.setProperty('--viewport-w',width+'px');
  if(keyboard)document.activeElement?.scrollIntoView({block:'nearest',behavior:'instant'});
  const bar=document.querySelector('.bottom-tabs');root.style.setProperty('--nav-h',bar&&getComputedStyle(bar).display!=='none'?bar.getBoundingClientRect().height+'px':'0px');
  const header=document.querySelector('.topbar');root.style.setProperty('--header-h',header?.getBoundingClientRect().height+'px');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',getComputedStyle(root).getPropertyValue('--bg').trim());
  if(import.meta.env.DEV&&new URLSearchParams(location.search).get('layout')==='debug') {
   let overlay=document.getElementById('layout-debug');if(!overlay){overlay=document.createElement('output');overlay.id='layout-debug';overlay.className='layout-debug';document.body.append(overlay);}
   overlay.textContent=`${root.dataset.sizeClass} · ${root.dataset.density} · ${width}×${Math.round(height)} · text ${Math.round(scale*100)}% · keyboard ${keyboard}`;
  }
 };
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
 const queries=['(prefers-color-scheme: dark)','(prefers-contrast: more)','(forced-colors: active)','(prefers-reduced-transparency: reduce)','(prefers-reduced-motion: reduce)','(pointer: coarse)','(hover: hover)','(display-mode: standalone)'].map(q=>matchMedia(q));
 queries.forEach(q=>q.addEventListener('change',schedule));
 for(const event of ['resize','orientationchange','pageshow','focus'])window.addEventListener(event,schedule);
 document.addEventListener('visibilitychange',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);window.visualViewport?.addEventListener('resize',schedule);
 const fontProbe=document.createElement('span');fontProbe.setAttribute('aria-hidden','true');fontProbe.style.cssText='position:fixed;inset:0 auto auto 0;width:1rem;height:1rem;visibility:hidden;pointer-events:none';document.body.append(fontProbe);
 const observer=new ResizeObserver(schedule);observer.observe(root);observer.observe(fontProbe);update();schedule();
 return()=>{cancelAnimationFrame(frame);observer.disconnect();fontProbe.remove();queries.forEach(q=>q.removeEventListener('change',schedule));for(const event of ['resize','orientationchange','pageshow','focus'])window.removeEventListener(event,schedule);document.removeEventListener('visibilitychange',schedule);document.removeEventListener('focusin',schedule);document.removeEventListener('focusout',schedule);window.visualViewport?.removeEventListener('resize',schedule);document.getElementById('layout-debug')?.remove();};
}
