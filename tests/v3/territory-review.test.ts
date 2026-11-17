import {describe,expect,it} from 'vitest';
import {changedSinceComment,checkedCard,milestoneState,plural,progressNote,reviewer,reviewIntro,safeFileName} from '../../apps/web/src/features/territory-review-model';
import {workspaceDataSchema} from '../../apps/web/src/features/territory-model';

describe('territory card review',()=>{
 it('places each milestone against the request stage',()=>{
  expect([0,1,2,3,4].map(i=>milestoneState(i,2))).toEqual(['done','done','now','next','next']);
  expect([0,1,2,3,4].map(i=>milestoneState(i,4))).toEqual(['done','done','done','done','done']);
  expect(milestoneState(0,0)).toBe('now');
 });
 it('says what comes next under the milestones',()=>{
  expect(progressNote(4,'approved')).toMatch(/Everything is ready/);
  expect(progressNote(3,'approved')).toMatch(/making the full map/);
  expect(progressNote(2,'review')).toBe('We email you at each step.');
 });
 it('lets only the congregation admin decide; owners and viewers look',()=>{
  expect(reviewer('admin',false)).toBe('admin');
  expect(reviewer('admin',true)).toBe('owner');
  expect(reviewer('viewer',false)).toBe('viewer');
  expect(reviewIntro('admin',12)).toMatch(/each of the 12 cards/);
  expect(reviewIntro('owner',12)).toMatch(/Waiting for the congregation/);
  expect(reviewIntro('viewer',12)).toMatch(/only an admin can comment/);
 });
 it('marks a card saved again after its comment',()=>{
  expect(changedSinceComment({review_comment_at:'2026-11-17T10:00:00Z',updated_at:'2026-11-17T11:00:00Z'})).toBe(true);
  expect(changedSinceComment({review_comment_at:'2026-11-17T10:00:00Z',updated_at:'2026-11-17T09:00:00Z'})).toBe(false);
  expect(changedSinceComment({review_comment_at:null,updated_at:'2026-11-17T11:00:00Z'})).toBe(false);
 });
 it('counts a ticked card as checked until it is saved again',()=>{
  expect(checkedCard({review_ok_at:'2026-11-17T10:00:00Z',updated_at:'2026-11-17T09:00:00Z'})).toBe(true);
  expect(checkedCard({review_ok_at:'2026-11-17T10:00:00Z',updated_at:'2026-11-17T11:00:00Z'})).toBe(false);
  expect(checkedCard({review_ok_at:null,updated_at:'2026-11-17T09:00:00Z'})).toBe(false);
 });
 it('makes safe file names and plurals',()=>{
  expect(safeFileName('Territory 4 · Seethapal / East',60)).toBe('Territory-4-Seethapal-East');
  expect(safeFileName('***',60)).toBe('territories');
  expect(safeFileName('abcdef',3)).toBe('abc');
  expect(plural(1,'card')).toBe('1 card');
  expect(plural(3,'card')).toBe('3 cards');
 });
 it('reads workspaces from servers without the review update',()=>{
  const d=workspaceDataSchema.parse({workspace:{id:'w',name:'Hill',due_days:120,recent_days:90,report_token:'t'},role:'admin',members:[],assignments:[],reports:[],
   territories:[{id:'t1',number:'1',name:'A',notes:'',thumb:null,has_image:true,share_token:'s',updated_at:'2026-11-17'}]});
  expect(d.workspace).toMatchObject({review_state:'none',review_round:0,drive_url:null,full_map_url:null,stage:null});
  expect(d.territories[0]).toMatchObject({review_comment:'',review_comment_at:null,review_ok_at:null});
 });
});
