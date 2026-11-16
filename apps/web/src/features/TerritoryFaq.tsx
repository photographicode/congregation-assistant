// Frequently asked questions on the territory landing page. The worker adds the matching FAQPage data for search engines.
import React from 'react';
import {CircleHelp} from 'lucide-react';
import {config} from './client';
import {territoryUrl} from './territory-site';

type Item={q:string;a:React.ReactNode};
// Short answers; the steps above explain the work itself. Keep in step with FAQ in hosting/territory-worker.mjs.
const ITEMS=():Item[]=>[
 {q:'What does it cost?',a:<p>{'Nothing. We accept only voluntary donations, and none is needed for any service. To ask about donating, write to '}<a href={'mailto:'+config.SUPPORT_EMAIL}>{config.SUPPORT_EMAIL}</a>{'.'}</p>},
 {q:'What do we need to start?',a:<p>{'Just the KML file of your boundary from Hub. Then choose Territory Cards, a full map, the territory manager, or all three.'}</p>},
 {q:'How do we name the territories?',a:<p>{'On one private link, with no sign-in. You see each territory on a street map, write its locality name, correct the landmarks and add notes.'}</p>},
 {q:'Who checks the cards?',a:<p>{'Your congregation’s admin signs in with Google, looks at every card, and comments on any that needs a change or approves them all.'}</p>},
 {q:'Can we try it first?',a:<p><a href={territoryUrl('territory&demo')}>{'Open the demo'}</a>{': 25 fictional territory cards. Nothing is saved.'}</p>},
 {q:'Is this an official app?',a:<p>{'No. It is independent and unofficial, made to help congregations keep their territories in order.'}</p>},
];

/** Questions and answers on the territory landing page (#tl-faq): short, flat tiles, two columns on wide screens. */
export function FaqSection(){
 return <section className="tl-section tl-reveal" id="tl-faq" aria-labelledby="tl-faq-title">
  <h2 id="tl-faq-title">{'Questions and answers'}</h2>
  <div className="tl-faq">{ITEMS().map(item=><section key={item.q} className="tl-tile" aria-label={item.q}><span className="tl-icon"><CircleHelp aria-hidden="true"/></span><h3>{item.q}</h3>{item.a}</section>)}</div>
 </section>;
}
