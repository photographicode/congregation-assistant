import {toolById, type SectionId} from '../../../packages/core/navigation';
const screens=['home','schedule','people','eligibility','emergency','reports','messages','access','pdf','settings','owner','more','notFound'] as const;
export type Screen=typeof screens[number];
export type Route={screen:Screen;tab?:string;week?:string;month?:string;q?:string;person?:string;action?:string;doc?:string;demo?:string;view?:string;section?:SectionId};
const sectionScreens:Record<SectionId,Screen>={home:'home',people:'people',reports:'reports',meetings:'schedule',messages:'messages',forms:'pdf',admin:'settings'};
const routeKeys=['tab','week','month','q','person','action','doc','demo','view'] as const;
export function routeForTool(id:string):Partial<Route>{
 const tool=toolById(id);
 if(!tool)return {};
 const route:Partial<Route>={screen:tool.route as Screen};
 if(tool.route==='pdf')route.doc=tool.sub;
 else route.tab=tool.sub;
 return route;
}
function validPeriod(key:string,value:string){
 if(key==='month')return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
 if(key==='week'){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().split('T')[0]===value;}
 return true;
}
function legacySection(value:string|null){
 if(value&&Object.hasOwn(sectionScreens,value))return value as SectionId;
 return null;
}
export function parseRoute(input:string):Route{
 const params=new URL(input,'https://app.invalid').searchParams;
 const legacy=routeForTool(params.get('tool')||'');
 const section=legacySection(params.get('section'));
 const candidate=params.get('screen')||legacy.screen||sectionScreens[section||'home']||'home';
 const screen:Screen=screens.find(value=>value===candidate)||'notFound';
 const route:Route={...legacy,screen};
 if(section)route.section=section;
 for(const key of routeKeys){const value=params.get(key);if(value!==null&&validPeriod(key,value))route[key]=value;}
 return route;
}
export function formatRoute(route:Route){
 const params=new URLSearchParams({screen:route.screen});
 for(const key of routeKeys){const value=route[key];if(value!==undefined&&value!=='')params.set(key,value);}
 if(route.section)params.set('section',route.section);
 return '?'+params.toString();
}
