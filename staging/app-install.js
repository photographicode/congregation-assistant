(() => {
 let installPrompt;
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
 window.installCongregationApp=async()=>{
  if(matchMedia('(display-mode: standalone)').matches){window.ui.showToast('The app is already installed.');return;}
  if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
  window.ui.openModal('modal-install-app');
 };
 window.addEventListener('load',()=>{if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('service-worker.js').catch(()=>{ /* The website remains usable when installation is unavailable. */ });});
})();
