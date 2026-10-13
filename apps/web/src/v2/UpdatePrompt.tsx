import React from 'react';
export function UpdatePrompt() {
 const [waiting,setWaiting]=React.useState<ServiceWorker|null>(null);
 React.useEffect(()=>{
  if(!('serviceWorker' in navigator)||!import.meta.env.PROD)return;
  let active=true;
  navigator.serviceWorker.register(import.meta.env.BASE_URL+'service-worker.js',{scope:import.meta.env.BASE_URL}).then(reg=>{
   if(reg.waiting&&active)setWaiting(reg.waiting);
   reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(active&&worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(worker);});});
  }).catch(()=>{/* Browsers without persistent storage can still use the online app. */});
  const changed=()=>{if(sessionStorage.getItem('ca-update-requested')){sessionStorage.removeItem('ca-update-requested');location.reload();}};
  navigator.serviceWorker.addEventListener('controllerchange',changed);
  return()=>{active=false;navigator.serviceWorker.removeEventListener('controllerchange',changed);};
 },[]);
 return waiting?<aside className="update-prompt" role="status"><strong>Updated — reload</strong><p>A new version is ready. Save your work before reloading.</p><button onClick={()=>{sessionStorage.setItem('ca-update-requested','1');waiting.postMessage({type:'ACTIVATE_UPDATE'});}}>Reload app</button></aside>:null;
}
