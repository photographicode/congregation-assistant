import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {portalSchema} from '../../packages/core/publisher-workspace';

afterEach(()=>vi.unstubAllGlobals());
describe('Publisher blocks on Today',()=>{
 it('keeps the report action secondary when embedded below staff role cards',async()=>{
  vi.stubGlobal('location',new URL('https://example.invalid/?demo=publisher'));
  vi.stubGlobal('document',{documentElement:{lang:'en'}});
  const {PublisherHome}=await import('../../apps/web/src/features/PublisherHome');
  const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});
  const context={cong:'fictional',name:'Fictional congregation',roles:['attendance','publisher'],caps:{},notify:()=>{}};
  cache.setQueryData(['publisher-portal','demo','fictional'],portalSchema.parse({name:'Fictional publisher',report:{period:'September 2026',submitted:false},assignments:[],contact:{}}));
  cache.setQueryData(['v4-announcements','demo','fictional'],[]);
  const markup=renderToStaticMarkup(React.createElement(QueryClientProvider,{client:cache},React.createElement(PublisherHome,{context,go:()=>{},embedded:true})));
  expect(markup).toContain('Report my service');
  expect(markup).not.toMatch(/class="[^"]*\bprimary\b/);
  const standalone=renderToStaticMarkup(React.createElement(QueryClientProvider,{client:cache},React.createElement(PublisherHome,{context,go:()=>{}})));
  expect(standalone).toMatch(/class="[^"]*\bprimary\b/);
  expect(markup).not.toContain('From your congregation');
  cache.clear();
 });
});
