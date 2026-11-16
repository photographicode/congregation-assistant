// Frequently asked questions on the territory landing page. The worker adds the matching FAQPage data for search engines.
import React from 'react';
import {config} from './client';
import {territoryUrl} from './territory-site';

type Item={q:string;a:React.ReactNode};
const ITEMS=():Item[]=>[
 {q:'How much does it cost?',a:<>
  <p>{'Nothing is charged. This work is hard and has a lot of time and effort behind it: drawing every territory, checking each border against the roads, naming localities, making and printing the cards and the full map, and keeping the software running and safe.'}</p>
  <p>{'Even so, we do not sell it. We accept only voluntary donations, given freely by those who wish to help. No donation is needed to receive any service. To ask about donating, write to '}<a href={'mailto:'+config.SUPPORT_EMAIL}>{config.SUPPORT_EMAIL}</a>{'.'}</p>
 </>},
 {q:'What can we ask for?',a:<p>{'You can start from just the KML file from Hub. Then tick what you need: Territory Cards, a full map with every territory number, the Territory Management Software, or all three.'}</p>},
 {q:'How do we name the territories?',a:<p>{'After we split your boundary, your congregation gets one private link by email. It shows each territory’s outline and landmarks on a street map. For each one you write the locality name, correct the landmark names and add notes. Everything saves as you type, with no sign-in, and you can come back to the same link at any time. Your names then go on the cards and the full map.'}</p>},
 {q:'Can we try the software first?',a:<p>{'Yes. '}<a href={territoryUrl('territory&demo')}>{'Open the demo'}</a>{'. It has 25 fictional territory cards and saves nothing. Theme options are available: light, dark or automatic, in a soft or glass style.'}</p>},
 {q:'Who can sign in?',a:<p>{'There are two kinds of access. An admin changes everything: territories, assignments, reports, settings and people. A viewer looks only. The congregation’s official Gmail account is the first admin and adds the others. Everyone signs in with Google from the main page.'}</p>},
 {q:'How do publishers report a house or a place?',a:<p>{'An admin shares a territory card by link. Whoever opens it sees the digital card and can report a house or a place. With the location taken on the phone, the report goes automatically to the territory that holds that place.'}</p>},
 {q:'What is language search?',a:<p>{'Some territories have mixed languages. The admin chooses issue reporting only, or issue reporting with language search. With language search, a publisher who finds a house where a language is spoken marks it and picks the language from a list the admin keeps.'}</p>},
 {q:'Is this an official app?',a:<p>{'No. It is independent and unofficial, made to help congregations keep their territories in order.'}</p>},
];

/** Questions and answers, shown on the territory landing page (#tl-faq). */
export function FaqSection(){
 return <section className="tl-section tl-reveal" id="tl-faq" aria-labelledby="tl-faq-title">
  <h2 id="tl-faq-title">{'Questions and answers'}</h2>
  <div className="tl-faq">{ITEMS().map(item=><section key={item.q} className="tl-tile" aria-label={item.q}><h3>{item.q}</h3>{item.a}</section>)}</div>
 </section>;
}
