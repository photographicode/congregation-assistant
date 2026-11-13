// Where the territory manager lives. In production it has its own subdomain, so a person with both
// Congregation Assistant and territory accounts sees two clearly separate apps. Elsewhere (local
// development, preview hosts) the same pages open inside the main app with ?territory.
const TERRITORY_HOST='territory.congregationassistant.com';
const MAIN_HOST='congregationassistant.com';
const MAIN_APP=`https://${MAIN_HOST}/app/`;

export const onTerritoryHost=()=>location.hostname===TERRITORY_HOST;
const onMainHost=()=>location.hostname===MAIN_HOST||location.hostname==='www.'+MAIN_HOST;

/** A territory page URL. `query` is e.g. 'territory-card&demo'; empty means the manager home. */
export function territoryUrl(query=''){
 if(onTerritoryHost())return `${location.origin}/${query?'?'+query:''}`;
 if(onMainHost())return `https://${TERRITORY_HOST}/${query?'?'+query:''}`;
 return `${location.origin}${import.meta.env.BASE_URL}?${query||'territory'}`;
}
/** Back to the main Congregation Assistant app. */
export const mainAppUrl=()=>onTerritoryHost()?MAIN_APP:import.meta.env.BASE_URL;
/** Google sign-in returns here. */
export const signInReturnUrl=()=>onTerritoryHost()?`${location.origin}/`:`${location.origin}${location.pathname}?territory`;
/** The territory generator (KML splitter, cards, full wall map), served by this site's worker at /generator/. */
export const generatorUrl=()=>onTerritoryHost()?`${location.origin}/generator/`:(import.meta.env.VITE_GENERATOR_URL as string|undefined)||`https://${TERRITORY_HOST}/generator/`;
