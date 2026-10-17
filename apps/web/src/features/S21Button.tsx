import React from 'react';
import {FileDown,ChevronDown} from 'lucide-react';
import type {Context} from '../main';
import {t} from '../../../../packages/core/i18n';
import {demo} from './client';
import {publisherS21} from './pdf-download';
export function S21Button({context,person}:{context:Context;person:{id:string;name:string;[key:string]:unknown};onOpen?:()=>void}){const [year,setYear]=React.useState(new Date().getFullYear()+(new Date().getMonth()>=8?1:0)),[busy,setBusy]=React.useState(false);async function save(action:'download'|'print'|'share'='download'){setBusy(true);try{await publisherS21(context,person.id,demo?person:undefined,year,action);}catch(error){context.notify((error as Error).message);}finally{setBusy(false);}}return <div className="actions"><button disabled={busy||!Number.isInteger(year)||year<1900||year>2200} aria-label={t('s21.downloadFor')+' '+person.name} onClick={()=>void save()}><FileDown aria-hidden="true"/>{busy?'Preparing…':'S-21'}</button><details><summary aria-label={'S-21 options for '+person.name}><ChevronDown aria-hidden="true"/>Options</summary><label>Service year<input type="number" min={1900} max={2200} value={year} onChange={e=>setYear(Number(e.target.value))}/></label><button disabled={busy} onClick={()=>void save('print')}>Print</button><button disabled={busy} onClick={()=>void save('share')}>Share</button></details></div>;}
