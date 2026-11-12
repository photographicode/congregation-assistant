// Install the territory manager on its own: the page points the browser at territory.webmanifest,
// whose start_url is ?territory, so the home-screen app opens the territories and nothing else.
import React from 'react';
import {Download,X} from 'lucide-react';
import {Button} from '../../../../packages/ui/components';
import {Dialog} from '../../../../packages/ui/Dialog';
import {installPlatform} from '../../../../packages/core/install-controller';
import {installController} from './install-runtime';
import {onTerritoryHost} from './territory-site';

/** True when opened from the home screen, so links back to the wider app are hidden. */
export const standalone=()=>matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);

export function useTerritoryInstallable(){
 React.useEffect(()=>{
  const link=document.querySelector<HTMLLinkElement>('link[rel=manifest]'),theme=document.querySelector<HTMLMetaElement>('meta[name=theme-color]');
  const before={href:link?.href,theme:theme?.content};
  if(link)link.href=import.meta.env.BASE_URL+(onTerritoryHost()?'territory-site.webmanifest':'territory.webmanifest');
  if(theme)theme.content=getComputedStyle(document.documentElement).getPropertyValue('--tm-bg').trim()||theme.content;
  // The app's service worker is already scoped to BASE_URL; registering again is a no-op when it exists.
  if('serviceWorker' in navigator&&import.meta.env.PROD)void navigator.serviceWorker.register(import.meta.env.BASE_URL+'service-worker.js',{scope:import.meta.env.BASE_URL}).catch(()=>undefined);
  return()=>{if(link&&before.href)link.href=before.href;if(theme&&before.theme)theme.content=before.theme;};
 },[]);
}

const STEPS:Record<string,string>={
 ios:'In Safari, tap the Share button, then "Add to Home Screen".',
 samsung:'Open the browser menu, then tap "Add page to" and "Home screen".',
 firefox:'Open the browser menu, then tap "Install" or "Add to Home screen".',
};
const DEFAULT_STEPS='Open the browser menu (three dots), then choose "Install app" or "Add to Home screen".';

export function InstallTerritories({showInstalled=false}:{showInstalled?:boolean}){
 const [installed,setInstalled]=React.useState(()=>installController.isInstalled()||standalone()),[help,setHelp]=React.useState(false),[busy,setBusy]=React.useState(false);
 React.useEffect(()=>installController.subscribe(()=>setInstalled(installController.isInstalled())),[]);
 if(installed)return showInstalled?<p role="status">{'Installed. Open it from your home screen or app list.'}</p>:null;
 const platform=installPlatform(navigator.userAgent,navigator.platform,navigator.maxTouchPoints);
 const install=()=>{setBusy(true);void installController.install(platform==='ios').then(result=>{if(result==='instructions')setHelp(true);else setInstalled(true);}).finally(()=>setBusy(false));};
 return <>
  <Button className="primary tm-install" busy={busy} onClick={install} aria-label={'Install the territories app'}><Download/><span>{'Install app'}</span></Button>
  {help&&<Dialog open onClose={()=>setHelp(false)} title={'Install Territories'}><div className="tm-dialog stack">
   <p>{STEPS[platform]||DEFAULT_STEPS}</p>
   <p className="muted">{'The app opens straight to your territories and works like any other app on your phone.'}</p>
  </div></Dialog>}
 </>;
}

const DISMISSED='ca-territory-install-dismissed';
/** A one-line, closable suggestion to install; it stays closed on this device. Settings → App keeps the button. */
export function InstallBanner(){
 const [hidden,setHidden]=React.useState(()=>installController.isInstalled()||standalone()||localStorage.getItem(DISMISSED)==='1');
 React.useEffect(()=>installController.subscribe(()=>{if(installController.isInstalled())setHidden(true);}),[]);
 if(hidden)return null;
 return <div className="tm-raised tm-banner" role="region" aria-label={'Install the app'}>
  <p>{'Install Territories for quick access from your home screen.'}</p>
  <div className="actions"><InstallTerritories/><Button onClick={()=>{localStorage.setItem(DISMISSED,'1');setHidden(true);}} aria-label={'Close the install suggestion'}><X/></Button></div>
 </div>;
}
