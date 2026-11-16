// Frequently asked questions for territory.congregationassistant.com (/faq there, ?territory-faq elsewhere).
// Same look as the landing page. The worker adds the matching FAQPage data for search engines.
import React from 'react';
import {Map as MapIcon} from 'lucide-react';
import {config} from './client';
import {territoryUrl} from './territory-site';
import './territory.css';

type Item={q:string;a:React.ReactNode};
const ITEMS=():Item[]=>[
 {q:'How much does it cost?',a:<>
  <p>{'Nothing is charged. This work is hard and has a lot of time and effort behind it: drawing every territory, checking each border against the roads, naming localities, making and printing the cards and the full map, and keeping the software running and safe.'}</p>
  <p>{'Even so, we do not sell it. We accept only voluntary donations, given freely by those who wish to help. No donation is needed to receive any service. To ask about donating, write to '}<a href={'mailto:'+config.SUPPORT_EMAIL}>{config.SUPPORT_EMAIL}</a>{'.'}</p>
 </>},
 {q:'What can we ask for?',a:<p>{'You can start from just the KML file from Hub. Then tick what you need: Territory Cards, a full map with every territory number, the Territory Management Software, or all three.'}</p>},
 {q:'Can we try the software first?',a:<p>{'Yes. '}<a href={territoryUrl('territory&demo')}>{'Open the demo'}</a>{'. It has 25 fictional territory cards and saves nothing. Theme options are available: light, dark or automatic, in a soft or glass style.'}</p>},
 {q:'Who can sign in?',a:<p>{'There are two kinds of access. An admin changes everything: territories, assignments, reports, settings and people. A viewer looks only. The congregation’s official Gmail account is the first admin and adds the others. Everyone signs in with Google from the main page.'}</p>},
 {q:'How do publishers report a house or a place?',a:<p>{'An admin shares a territory card by link. Whoever opens it sees the digital card and can report a house or a place. With the location taken on the phone, the report goes automatically to the territory that holds that place.'}</p>},
 {q:'What is language search?',a:<p>{'Some territories have mixed languages. The admin chooses issue reporting only, or issue reporting with language search. With language search, a publisher who finds a house where a language is spoken marks it and picks the language from a list the admin keeps.'}</p>},
 {q:'Is this an official app?',a:<p>{'No. It is independent and unofficial, made to help congregations keep their territories in order.'}</p>},
];

export function TerritoryFaq(){
 React.useEffect(()=>{document.title='Questions and answers · Territories · Congregation Assistant';},[]);
 return <main className="tl">
  <header className="tl-bar">
   <a className="tl-brand" href={territoryUrl()}><span className="brand-mark"><MapIcon aria-hidden="true"/></span>{'Territories'}<small>{'Congregation Assistant'}</small></a>
   <a className="tl-btn" href={territoryUrl()}>{'Main page'}</a>
  </header>
  <section className="tl-section" aria-labelledby="tl-faq-title">
   <h1 id="tl-faq-title">{'Questions and answers'}</h1>
   <div className="tl-faq">{ITEMS().map(item=><section key={item.q} className="tl-tile" aria-label={item.q}><h2>{item.q}</h2>{item.a}</section>)}</div>
  </section>
  <footer className="tl-foot"><span>{'Independent and unofficial.'}</span><a href={territoryUrl('request=territory')}>{'Request territories'}</a></footer>
 </main>;
}
