(() => {
 let installPrompt;
 const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const guidance=()=>{
  const ua=navigator.userAgent,ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  if(ios){const safari=/Safari/.test(ua)&&!/(CriOS|FxiOS|OPiOS|EdgiOS)/.test(ua);return safari?{title:'Add to your Home Screen',steps:['Tap the Share button in Safari.','Choose Add to Home Screen. If needed, scroll down the Share menu.','Tap Add, then open Congregation Assistant from its new icon.']}:{title:'Install on iPhone or iPad',steps:['Open this website in Safari.','Tap Share, then Add to Home Screen.','Tap Add and open the new Congregation Assistant icon.']};}
  if(/Android/.test(ua))return {title:'Install on your Android phone',steps:['Open your browser menu (⋮ or the menu icon).','Choose Install app or Add to Home screen. The wording depends on your browser.','Confirm, then open Congregation Assistant from its icon. If your browser has no install option, try Chrome.']};
  return {title:'Install Congregation Assistant',steps:['Open your browser menu or the install icon in the address bar.','Choose Install Congregation Assistant or Install app.','If this browser has no install option, you can continue using the website.']};
 };
 const renderGuide=()=>{const box=document.getElementById('app-install-guide');if(!box)return;const g=guidance();box.replaceChildren();const heading=document.createElement('h3');heading.textContent=g.title;const list=document.createElement('ol');for(const step of g.steps){const li=document.createElement('li');li.textContent=step;list.append(li);}box.append(heading,list);};
 window.CAInstall={guidance,installed};
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
 window.addEventListener('appinstalled',()=>{installPrompt=null;document.getElementById('ca-install-nudge')?.remove();window.ui?.showToast('Installed. Open Congregation Assistant from its icon.');});
 window.installCongregationApp=async()=>{
  if(installed()){window.ui.showToast('The app is already installed.');return;}
  if(installPrompt){try{await installPrompt.prompt();const choice=await installPrompt.userChoice;installPrompt=null;if(choice.outcome==='accepted')document.getElementById('ca-install-nudge')?.remove();}catch{renderGuide();window.ui.openModal('modal-install-app');}return;}
  renderGuide();window.ui.openModal('modal-install-app');
 };
 const nudge=()=>{
  if(window.CADemo?.active||window.CADemo?.requested||installed()||document.getElementById('ca-install-nudge')||innerWidth>1023||!window.currentCongId||document.body.matches('.public-mode,.overseer-mode,.mws-public-mode'))return;
  let dismissed=0;try{dismissed=Number(localStorage.getItem('ca_install_reminder_after')||0);}catch{}if(Date.now()<dismissed)return;
  const allowed=window.ui?.getAllowedTabs?.()||[];const primary=allowed.includes('dashboard')?'dashboard':allowed.includes('personal')?'personal':allowed[0];const home=document.getElementById('tab-'+primary);if(!home||!home.getClientRects().length)return;
  const box=document.createElement('aside');box.id='ca-install-nudge';box.className='ca-install-nudge';box.setAttribute('aria-label','Install the app');box.innerHTML='<div><strong>Open more easily next time</strong><p>Add Congregation Assistant to your Home Screen. You can keep using the website too.</p></div><button type="button" data-install>Install or see steps</button><button type="button" data-dismiss>Later</button>';box.querySelector('[data-install]').onclick=()=>window.installCongregationApp();box.querySelector('[data-dismiss]').onclick=()=>{try{localStorage.setItem('ca_install_reminder_after',String(Date.now()+7*86400000));}catch{}box.remove();};home.prepend(box);
 };
 window.addEventListener('load',()=>{if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('service-worker.js').catch(()=>{});renderGuide();setTimeout(nudge,12000);if(window.ui?.switchTab){const previous=window.ui.switchTab;window.ui.switchTab=function(...args){const result=previous.apply(this,args);setTimeout(nudge,600);return result;};}});
})();

(() => {
 const status = message => { const el=document.getElementById('notification-status');if(el)el.textContent=message; };
 const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
 async function registration(){
  if(!isSecureContext || !('serviceWorker' in navigator) || !('Notification' in window))throw new Error('Notifications need a supported browser and HTTPS. On iPhone or iPad, open the installed Home Screen app.');
  const reg=await navigator.serviceWorker.register('service-worker.js');
  await navigator.serviceWorker.ready;return reg;
 }
 window.CANotifications={
  guide(){document.getElementById('notification-help')?.scrollIntoView({block:'nearest'});status('Android: browser → Settings → Site settings → Notifications → allow this site. iPhone/iPad: Settings → Notifications → Congregation Assistant → Allow Notifications. Also check Focus / Do Not Disturb.');},
  async enable(){try{
   if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!installed())throw new Error('First add this app to your Home Screen in Safari, then open it from its icon. Requires iOS/iPadOS 16.4 or later.');
   await registration();
   if(Notification.permission==='denied'){this.guide();return;}
   const permission=await Notification.requestPermission();
   if(permission==='granted'&&window.CA_CONFIG?.pushPublicKey){await window.CAPush.enable();return;}
   status(permission==='granted'?'Device permission is enabled. Send a test to check it. Reminders can alert while the app is open. Use calendar reminders when it is closed.':'Notifications are not enabled. Tap Settings help to allow them.');
  }catch(error){status(error.message);}},
  async sendReminder(title,body){const reg=await registration();if(Notification.permission!=='granted')return;await reg.showNotification('Congregation Assistant',{body:title+' — '+body,icon:'assets/icon-192.png',tag:'ca-personal-reminder',data:{url:new URL('./',location.href).href}});},
  async test(){try{
   const reg=await registration();if(Notification.permission!=='granted')throw new Error('Tap Enable notifications first. If previously blocked, use Settings help.');
   await reg.showNotification('Congregation Assistant — test',{body:'Your device can display notifications. This checks device permission; remote delivery is not yet configured.',icon:'assets/icon-192.png',tag:'ca-notification-test',data:{url:new URL('./',location.href).href}});
   status('Test sent. Check your notification centre. If it is missing, use Settings help and check Focus / Do Not Disturb.');
  }catch(error){status(error.message);}}
 };
})();
