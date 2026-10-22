import { handleError } from "./errors";

/** A tab-local draft, never a send queue. Submission always requires a user retry. */
export const offlineReportMessage="You're offline — your report is kept on this device and will not be sent until you reconnect. Keep this tab open; reconnect and choose Submit report to retry.";
export const offlineUnstoredMessage="You're offline. Keep this page open to retain your report, then reconnect and choose Submit report to retry.";
export type ReportDraft={shared:boolean;studies:number;hours:number;comments:string;auxiliary:boolean;publisherId?:string;period?:string;group?:string};
async function key(scope:string){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));return 'ca-report-draft:'+Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}
export async function keepReportDraft(scope:string,draft:ReportDraft){try{sessionStorage.setItem(await key(scope),JSON.stringify({expires:Date.now()+86400000,draft}));return true;}catch{return false;}}
export async function loadReportDraft(scope:string):Promise<ReportDraft|null>{try{const name=await key(scope),value=JSON.parse(sessionStorage.getItem(name)||'null');if(!value)return null;if(value.expires<Date.now()){sessionStorage.removeItem(name);return null;}const d=value.draft;return typeof d.shared==='boolean'&&typeof d.auxiliary==='boolean'&&Number.isFinite(d.studies)&&Number.isFinite(d.hours)&&typeof d.comments==='string'?d:null;}catch{return null;}}
export async function clearReportDraft(scope:string){try{sessionStorage.removeItem(await key(scope));}catch (error) { handleError(error, {scope:"../../../packages/core/report-draft.ts",severity:'warning'}); }}
