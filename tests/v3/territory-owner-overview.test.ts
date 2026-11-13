import {describe,expect,it} from 'vitest';
import {helpSummary} from '../../apps/web/src/features/help-summary';
import type {HelpRequest} from '../../apps/web/src/features/territory-api';

const DAY=86_400_000;
const now=Date.parse('2026-11-14T12:00:00Z');
const req=(status:HelpRequest['status'],daysAgo:number,files=0):HelpRequest=>({id:String(Math.random()),contact_name:'A',contact_email:'a@example.invalid',congregation_name:'C',phone:null,
 details:'details here',status,owner_note:null,created_at:new Date(now-daysAgo*DAY).toISOString(),files:Array.from({length:files},(_,i)=>({id:String(i),name:'b.kml',kind:'kml' as const,size:1}))});

describe('territory owner overview',()=>{
 it('counts requests by status, this week and with files',()=>{
  const s=helpSummary([req('new',1,1),req('new',8),req('in_progress',2,2),req('done',30),req('declined',3)],now);
  expect(s).toEqual({newCount:2,inProgress:1,done:1,thisWeek:3,withFiles:2});
 });
 it('handles no requests',()=>{
  expect(helpSummary([],now)).toEqual({newCount:0,inProgress:0,done:0,thisWeek:0,withFiles:0});
 });
});
