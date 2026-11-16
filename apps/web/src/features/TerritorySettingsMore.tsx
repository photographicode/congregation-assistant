// Territory manager settings added 2026-11-16: what publishers may report, territory outlines, and the demo note.
import React from 'react';
import {MapPin} from 'lucide-react';
import {Button,Field,Segmented} from '../../../../packages/ui/components';
import * as api from './territory-api';
import type {ReportMode,WorkspaceData} from './territory-model';
import {readOutlines} from './territory-outlines';
import {territoryUrl} from './territory-site';

type Props={d:WorkspaceData;ws:string;refresh:()=>Promise<void>;notify:(m:string)=>void};
const MAX_LISTED=10;

/** What the shared-card note says anyone with the link can do. */
export const shareNote=(mode:ReportMode)=>mode==='issues_language'
 ?'Anyone with the link can see this card, its notes and open reports, and report an issue or a house where a language is spoken.'
 :'Anyone with the link can see this card, its notes and open issues, and report a new issue.';

/** The fictional demo: what it holds, that the look can change, and where a congregation asks for its own. Sign-in is on the main page only. */
export function DemoBanner({count,onDisplay}:{count:number;onDisplay:()=>void}){
 return <section className="tm-raised stack tm-demo" aria-label={'About this demo'}>
  <p><strong>{`Fictional demo with ${count} territory cards.`}</strong>{' Assign and return territories, open a card, read the issues and language finds, and export the S-13. Nothing here is saved.'}</p>
  <p>{'Theme options are available: light, dark or automatic, in a soft or glass style. '}<button type="button" className="tm-link" onClick={onDisplay}>{'Change the theme'}</button></p>
  <p className="muted">{'To use it for your congregation, go to the '}<a href={territoryUrl()}>{'main page'}</a>{' and sign in or request a workspace there.'}</p>
 </section>;
}

const MODES:{value:ReportMode;label:string}[]=[{value:'issues',label:'Issues only'},{value:'issues_language',label:'Issues and language search'}];
/** What publishers can report from a shared card. Language search marks houses where a language is spoken, picked from this list. */
export function ReportSettings({d,ws,refresh,notify,admin}:Props&{admin:boolean}){
 const [mode,setMode]=React.useState<ReportMode>(d.workspace.report_mode),[langs,setLangs]=React.useState(d.workspace.languages.join('\n')),[busy,setBusy]=React.useState(false);
 const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{await api.saveReportSettings(ws,mode,langs.split(/[\n,]/));await refresh();notify('Report settings saved.');}catch(err){notify((err as Error).message);}finally{setBusy(false);}};
 return <section className="tm-raised stack"><h2>{'Reports from shared cards'}</h2>
  <p className="muted">{'Some territories have mixed languages. With language search on, a publisher who finds a house where a language is spoken can mark it, choosing the language from your list.'}</p>
  <form className="stack" onSubmit={e=>void save(e)}><fieldset className="stack" disabled={!admin||busy}>
   <Segmented label={'Publishers can report'} value={mode} options={MODES} onChange={v=>setMode(v==='issues_language'?'issues_language':'issues')}/>
   {mode==='issues_language'&&<Field label={'Languages'} hint={'One per line, for example Tamil, Hindi, Malayalam. Up to 30.'}>{p=><textarea {...p} className="tm-inset" rows={4} maxLength={1500} value={langs} onChange={e=>setLangs(e.target.value)}/>}</Field>}
  </fieldset>
  {admin?<Button className="primary" type="submit" busy={busy}>{'Save report settings'}</Button>:<p className="muted">{'Only a workspace admin can change these.'}</p>}</form>
 </section>;
}

/** Territory outlines from a KML file (such as the generator's "all territories" KML), matched by territory number. */
export function Outlines({d,ws,refresh,notify}:Props){
 const [busy,setBusy]=React.useState(false);
 const have=d.territories.filter(t=>t.has_boundary).length;
 const pick=async(file?:File)=>{if(!file)return;setBusy(true);try{
  const items=readOutlines(await file.text());
  if(!items.length)throw Error('No territory outlines with a number were found in this file.');
  const r=await api.saveBoundaries(ws,items);await refresh();
  notify(`${r.matched} outline${r.matched===1?'':'s'} saved.`+(r.missing.length?` No territory numbered ${r.missing.slice(0,MAX_LISTED).join(', ')}${r.missing.length>MAX_LISTED?'…':''}.`:''));
 }catch(e){notify((e as Error).message);}finally{setBusy(false);}};
 return <section className="tm-raised stack"><h2>{'Territory outlines'}</h2>
  <p className="muted">{`With outlines, a report sent with a location goes to the territory that holds that location, whichever card it was sent from. ${have} of ${d.territories.length} territories have an outline.`}</p>
  <label className="button"><MapPin/>{busy?'Saving…':'Add outlines from a KML file'}<input type="file" accept=".kml,application/vnd.google-earth.kml+xml" className="sr-only" disabled={busy} onChange={e=>{void pick(e.target.files?.[0]);e.target.value='';}}/></label>
  <p className="muted">{'Each placemark name must start with the territory number, for example “12” or “No. 12 – Market Street”.'}</p>
 </section>;
}
