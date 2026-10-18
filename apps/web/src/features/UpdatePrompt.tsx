import {DismissibleBanner} from '../../../../packages/ui/Notices';
import React from 'react';
export function UpdatePrompt() {
 const [waiting,setWaiting]=React.useState<ServiceWorker|null>(null),[version,setVersion]=React.useState('');
 React.useEffect(()=>{if(!waiting)return;let active=true;const channel=new MessageChannel();channel.port1.onmessage=event=>{if(active&&typeof event.data?.version==='string')setVersion(event.data.version);};waiting.postMessage({type:'GET_VERSION'},[channel.port2]);void fetch(waiting.scriptURL,{cache:'no-store'}).then(response=>response.text()).then(text=>{const match=text.match(/const CACHE=PREFIX\+'([a-f0-9]+)'/);if(active&&match)setVersion(match[1]);}).catch(()=>{});return()=>{active=false;channel.port1.close();};},[waiting]);
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
 return waiting&&version?<DismissibleBanner key={version} stateKey={'update:'+version} untilChanged className="update-prompt"><strong>Update available</strong><p>A new version is ready. Save your work before reloading.</p><button onClick={()=>{sessionStorage.setItem('ca-update-requested','1');waiting.postMessage({type:'ACTIVATE_UPDATE'});}}>Reload app</button></DismissibleBanner>:null;
}
