/* Compatibility fixes apply to the existing interface; the V2 default remains gated. */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
if(params.get('ui')==='v2'){const target=new URL('v2/',location.href);for(const [key,value] of params)if(key!=='ui')target.searchParams.set(key,value);location.replace(target.href);return;}
function initialize(){
 const ui=window.ui;if(!ui)return;
 for(const root of document.querySelectorAll('[id^="modal-"].fixed,#assignModal,#personModal')){
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  const heading=root.querySelector('h2,h3');if(heading){if(!heading.id)heading.id=root.id+'-heading';root.setAttribute('aria-labelledby',heading.id)}
  const closes=[...root.querySelectorAll('button')].filter(b=>(b.getAttribute('onclick')||'').includes('closeModal')||/^\s*[✕×]\s*$/.test(b.textContent));
  for(const close of closes){close.setAttribute('aria-label','Close');close.title='Close';close.classList.add('ca-dialog-close');close.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>'}
  if(!closes.length&&root.id.startsWith('modal-')){const close=document.createElement('button');close.type='button';close.className='ca-dialog-close ca-injected-close';close.setAttribute('aria-label','Close');close.title='Close';close.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';close.addEventListener('click',()=>ui.closeModal(root.id));(heading?.parentElement||root.firstElementChild)?.append(close)}
 }
 const labels={'Gender Matrix':'Gender','Hope Designation':'Hope','Ecclesiastical Privileges':'Appointments'};document.querySelectorAll('#form-publisher label').forEach(label=>{const text=label.textContent.trim();if(labels[text])label.textContent=labels[text];if(!label.htmlFor){const field=label.parentElement.querySelector('input:not([type=hidden]),select,textarea');if(field?.id)label.htmlFor=field.id}});
 const section=document.getElementById('pub-login-section'),phone=document.getElementById('pub-phone');if(section){section.querySelector('label').textContent='Email (for sign-in)';const hint=section.querySelector('p');if(hint)hint.textContent='Optional. A shared email grants household reports only; contacts and availability stay separate.';if(phone?.parentElement)phone.parentElement.insertAdjacentElement('afterend',section)}
 const requested=params.get('tab');if(requested){const original=ui.switchTab;let used=false;ui.switchTab=function(tab,...args){const result=original.call(this,tab,...args);if(!used&&window.currentCongId&&ui.getAllowedTabs().includes(requested)){used=true;original.call(this,requested)}return result}}
 const home=document.getElementById('tab-dashboard');if(home){const link=document.createElement('a');link.className='ca-v2-preview-link';link.href='?ui=v2';link.textContent='Try the V2 preview';home.prepend(link)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
