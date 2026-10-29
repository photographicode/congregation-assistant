import React from 'react';
import {t} from '../../../../../packages/core/i18n';
export function TodayHeading(){return <header className="v4-page-heading"><div><h1>{t('ux.today.title')}</h1><p className="muted">{new Date().toLocaleDateString(document.documentElement.lang||undefined,{weekday:'long',day:'numeric',month:'long'})}</p></div></header>;}
