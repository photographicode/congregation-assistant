/** Run in a Playwright page. Returns meaningful visible layout failures. */
export function inspectLayout(){
 const width=document.documentElement.clientWidth,height=window.visualViewport?.height||innerHeight;
 const dialog=document.querySelector('[role=dialog]');
 const failures:string[]=[];if(document.documentElement.scrollWidth>width+1)failures.push('Document horizontal overflow');
 for(const el of document.querySelectorAll<HTMLElement>('body *')){if(dialog&&!dialog.contains(el)&&el!==dialog)continue;const r=el.getBoundingClientRect(),s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||!r.width||!r.height||el.closest('.sr-only')||s.position==='absolute'&&r.width<=1)continue;
  if(r.left< -1||r.right>width+1)failures.push('Horizontal overflow: '+el.tagName+' '+el.className);
  if(el.matches('[role=dialog]')&&(r.top< -1||r.bottom>height+1))failures.push('Dialog outside visible viewport');
  let visibleTop=Math.max(r.top,0),visibleBottom=Math.min(r.bottom,height);for(let parent=el.parentElement;parent;parent=parent.parentElement){const style=getComputedStyle(parent);if(['auto','scroll','hidden'].includes(style.overflowY)){const box=parent.getBoundingClientRect();visibleTop=Math.max(visibleTop,box.top);visibleBottom=Math.min(visibleBottom,box.bottom);}}
  if(el.matches('button,input:not([type=hidden]),select,textarea,a[href]')&&visibleTop<=r.top&&visibleBottom>=r.bottom){const min=document.documentElement.dataset.portal==='true'?48:44;if(r.width<min-1||r.height<min-1)failures.push('Small target: '+(el.getAttribute('aria-label')||el.textContent||el.tagName).slice(0,50));
   const bar=document.querySelector('.bottom-tabs');if(!dialog&&bar&&!bar.contains(el)){const b=bar.getBoundingClientRect();if(b.height&&r.bottom>b.top+1&&r.top<b.bottom-1&&r.right>b.left&&r.left<b.right)failures.push('Target under navigation: '+el.tagName);}}
  if(s.overflow==='hidden'&&s.textOverflow!=='ellipsis'&&el.matches('button,h1,h2,h3,p,label')&&(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1))failures.push('Clipped text: '+el.tagName);
 }
 return [...new Set(failures)];
}
