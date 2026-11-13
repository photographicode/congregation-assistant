import {afterEach,describe,expect,it,vi} from 'vitest';
// @ts-expect-error plain JavaScript Cloudflare Worker without type declarations
import worker from '../../hosting/territory-worker.mjs';
// @ts-expect-error plain JavaScript Cloudflare Worker without type declarations
import generatorWorker from '../../hosting/generator-worker.mjs';

const HOST='https://territory.congregationassistant.com';
afterEach(()=>vi.unstubAllGlobals());

describe('territory worker: generator moved to its own origin',()=>{
 it('redirects old /generator links to generator.congregationassistant.com',async()=>{
  const res:Response=await worker.fetch(new Request(HOST+'/generator/assets/app.js?v=1'));
  expect(res.status).toBe(301);
  expect(res.headers.get('Location')).toBe('https://generator.congregationassistant.com/assets/app.js?v=1');
  const bare:Response=await worker.fetch(new Request(HOST+'/generator'));
  expect(bare.headers.get('Location')).toBe('https://generator.congregationassistant.com/');
 });
 it('keeps upstream redirects only for the exact origin, and sets hardened headers',async()=>{
  vi.stubGlobal('fetch',async()=>new Response('<html></html>',{status:302,headers:{Location:'https://congregationassistant.com.evil.example/x','Content-Type':'text/html'}}));
  const res:Response=await worker.fetch(new Request(HOST+'/app/x'));
  expect(res.headers.get('Location')).toBe('https://congregationassistant.com.evil.example/x');
  const csp=res.headers.get('Content-Security-Policy')||'';
  expect(csp).toContain("base-uri 'none'");
  expect(csp).not.toContain('unsafe-inline');
  expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
  expect(res.headers.get('Cache-Control')).toBe('no-store');
 });
 it('refuses writes',async()=>{
  const res:Response=await worker.fetch(new Request(HOST+'/',{method:'POST',body:'x'}));
  expect(res.status).toBe(405);
 });
});

describe('generator worker',()=>{
 const G='https://generator.congregationassistant.com';
 it('serves GitHub Pages with its own policy and no opener policy',async()=>{
  const seen:string[]=[];
  vi.stubGlobal('fetch',async(url:string)=>{seen.push(url);return new Response('<html></html>',{status:200,headers:{'Content-Type':'text/html','Cross-Origin-Opener-Policy':'same-origin'}});});
  const res:Response=await generatorWorker.fetch(new Request(G+'/view.html?x=1'));
  expect(seen).toEqual(['https://photographicode.github.io/territory-manager/view.html?x=1']);
  expect(res.headers.get('Content-Security-Policy')).toContain("connect-src 'self' https://tiles.openfreemap.org");
  expect(res.headers.get('Cross-Origin-Opener-Policy')).toBeNull();
  expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
 });
 it('rewrites only its own upstream redirects',async()=>{
  vi.stubGlobal('fetch',async()=>new Response(null,{status:301,headers:{Location:'https://photographicode.github.io/territory-manager/view.html'}}));
  expect((await generatorWorker.fetch(new Request(G+'/view'))).headers.get('Location')).toBe(G+'/view.html');
  vi.stubGlobal('fetch',async()=>new Response(null,{status:301,headers:{Location:'https://photographicode.github.io/territory-manager-evil/x'}}));
  expect((await generatorWorker.fetch(new Request(G+'/x'))).headers.get('Location')).toBe('https://photographicode.github.io/territory-manager-evil/x');
 });
 it('refuses writes and hides from search',async()=>{
  expect((await generatorWorker.fetch(new Request(G+'/',{method:'POST',body:'x'}))).status).toBe(405);
  expect(await (await generatorWorker.fetch(new Request(G+'/robots.txt'))).text()).toContain('Disallow: /');
 });
});
