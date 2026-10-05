(() => {
 let installPrompt;
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
 window.installCongregationApp=async()=>{
  if(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true){window.ui.showToast('The app is already installed.');return;}
  if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
  window.ui.openModal('modal-install-app');
 };
 window.addEventListener('load',()=>{if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('service-worker.js').catch(()=>{ /* The website remains usable when installation is unavailable. */ });});
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
