import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {AppShell} from '../../packages/ui/AppShell';
import {inboxCount} from '../../apps/web/src/features/today/model';
describe('Today Inbox',()=>{
 it('counts unread updates and outstanding approvals only',()=>{
  expect(inboxCount([{read_at:null},{read_at:'2026-10-29'}],2)).toBe(3);
 });
 it('keeps a visible count in the single header Inbox control',()=>{
  vi.stubGlobal('matchMedia',()=>({matches:false}));
  const markup=renderToStaticMarkup(React.createElement(AppShell,{searchRef:{current:null},accountRef:{current:null},quickRef:{current:null},name:'Fictional congregation',active:'home',tabs:[],onNavigate:()=>{},onSearch:()=>{},onInbox:()=>{},inboxCount:3,onUpdates:()=>{},onAccount:()=>{},onDisplay:()=>{},onHelp:()=>{},signOut:()=>{},demo:true,children:'Today'}));
  expect(markup).toContain('Inbox, 3 unread');
  expect(markup).toContain('class="ux-inbox-count"');
  vi.unstubAllGlobals();
 });
});
