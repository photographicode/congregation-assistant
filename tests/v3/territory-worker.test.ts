import {afterEach,describe,expect,it,vi} from 'vitest';
// @ts-expect-error plain JavaScript Cloudflare Worker without type declarations
import worker from '../../hosting/territory-worker.mjs';

const HOST='https://territory.congregationassistant.com';
afterEach(()=>vi.unstubAllGlobals());

describe('territory worker: generator',()=>{
 it('serves the generator from GitHub Pages with its own policy',async()=>{
  const seen:string[]=[];
  vi.stubGlobal('fetch',async(url:string)=>{seen.push(url);return new Response('<html></html>',{status:200,headers:{'Content-Type':'text/html'}});});
  const res:Response=await worker.fetch(new Request(HOST+'/generator/assets/app.js?v=1'));
  expect(seen).toEqual(['https://photographicode.github.io/territory-manager/assets/app.js?v=1']);
  const csp=res.headers.get('Content-Security-Policy')||'';
  expect(csp).toContain("connect-src 'self' https://tiles.openfreemap.org https://overpass-api.de");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
 });
 it('keeps upstream redirects on this site',async()=>{
  vi.stubGlobal('fetch',async()=>new Response(null,{status:301,headers:{Location:'https://photographicode.github.io/territory-manager/view.html'}}));
  const res:Response=await worker.fetch(new Request(HOST+'/generator/view'));
  expect(res.headers.get('Location')).toBe('/generator/view.html');
 });
 it('adds the trailing slash and hides the generator from search',async()=>{
  const res:Response=await worker.fetch(new Request(HOST+'/generator'));
  expect(res.status).toBe(308);
  expect(res.headers.get('Location')).toBe(HOST+'/generator/');
  const robots=await (await worker.fetch(new Request(HOST+'/robots.txt'))).text();
  expect(robots).toContain('Disallow: /generator/');
 });
 it('refuses writes',async()=>{
  const res:Response=await worker.fetch(new Request(HOST+'/generator/',{method:'POST',body:'x'}));
  expect(res.status).toBe(405);
 });
});
