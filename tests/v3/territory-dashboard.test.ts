import {expect,test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {Dashboard} from '../../apps/web/src/features/TerritoryDashboard';
import {addDays,today,type WorkspaceData} from '../../apps/web/src/features/territory-model';

const now=today();
const territory=(n:number)=>({id:'t'+n,number:String(n),name:'Area '+n,notes:'',thumb:null,has_image:false,map_url:null,share_token:'s'+n,updated_at:now});
const data:WorkspaceData={
 workspace:{id:'w',name:'Fictional',due_days:120,recent_days:90,report_token:'r'},role:'admin',members:[],
 territories:[1,2,3,4].map(territory),
 assignments:[
  {id:'a1',territory_id:'t1',publisher:'Fictional A',taken_on:addDays(now,-130),due_on:addDays(now,-10),returned_on:null},
  {id:'a2',territory_id:'t2',publisher:'Fictional B',taken_on:addDays(now,-200),due_on:addDays(now,-80),returned_on:addDays(now,-20)},
  {id:'a3',territory_id:'t3',publisher:'Fictional C',taken_on:addDays(now,-500),due_on:addDays(now,-380),returned_on:addDays(now,-400)},
 ],
 reports:[{id:'r1',territory_id:'t2',household:'House 1',details:'Fictional note',reporter:'',lat:null,lng:null,accuracy:null,created_at:new Date().toISOString(),resolved_at:null}],
};

test('dashboard shows every status, the coverage, twelve tappable months and the longest-waiting territories',()=>{
 const html=renderToStaticMarkup(createElement(Dashboard,{d:data,show:()=>undefined,openTerritory:()=>undefined}));
 const {document}=parseHTML(html);
 const legend=[...document.querySelectorAll('.tm-legend li')].map(li=>li.textContent);
 expect(legend).toEqual(['In use1','Available1','Recently used1','Never used1']);
 expect(document.querySelectorAll('.tm-col')).toHaveLength(12);
 expect(document.querySelectorAll('.tm-columns button[aria-label]')).toHaveLength(12);
 expect(document.querySelector('.tm-hero-number')?.textContent).toContain('of 4 territories');
 expect([...document.querySelectorAll('.tm-bar-label')].map(e=>e.textContent)).toEqual(['3 · Area 3','2 · Area 2']);
 expect(document.querySelector('.tm-kpi.tm-alert strong')?.textContent).toBe('1');
 expect(html).toContain('House 1');
 expect(document.querySelector('table caption')?.textContent).toBe('Given out and returned by month');
});
