import React from 'react';
import {FileDown} from 'lucide-react';
import type {Context} from '../main';
import {demo} from './client';
import {t} from '../../../../packages/core/i18n';
export function S21Button({context,person}:{context:Context;person:{id:string;name:string;[key:string]:unknown}}){const [busy,setBusy]=React.useState(false),[error,setError]=React.useState('');return <div className="stack"><button aria-label={t('s21.downloadFor')+' '+person.name} disabled={busy} onClick={()=>{setBusy(true);setError('');void import('./pdf-download').then(module=>module.publisherS21(context,person.id,demo?person:undefined)).catch(error=>setError(error.message)).finally(()=>setBusy(false));}}><FileDown aria-hidden="true"/>{busy?t('common.loading'):'S-21'}</button>{error&&<p role="alert">{error}</p>}</div>;}
