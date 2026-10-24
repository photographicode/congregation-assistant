import {afterEach,describe,expect,it,vi} from 'vitest';
import {monitoredFetch} from '../../apps/web/src/system/network';
afterEach(()=>vi.unstubAllGlobals());
function fixture(status:number){const target=new EventTarget(),states:unknown[]=[];target.addEventListener('ca:system-state',event=>states.push((event as CustomEvent).detail));vi.stubGlobal('window',target);const fetcher=vi.fn(async()=>new Response('{}',{status}));vi.stubGlobal('fetch',fetcher);return{states,fetcher};}
describe('handled request failures preserve the submitting form',()=>{
 it.each([401,403,429,500,503])('returns POST %i once without replacing the form',async status=>{const{states,fetcher}=fixture(status);const response=await monitoredFetch('https://localhost/report',{method:'POST',body:'{}'});expect(response.status).toBe(status);expect(fetcher).toHaveBeenCalledTimes(1);expect(states).toEqual([]);});
 it('honors the POST method carried by a Request',async()=>{const{states,fetcher}=fixture(503);expect((await monitoredFetch(new Request('https://localhost/report',{method:'POST'}))).status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(1);expect(states).toEqual([]);});
 it('keeps global forbidden feedback for a page read',async()=>{const{states}=fixture(403);await monitoredFetch('https://localhost/page');expect(states).toEqual(['forbidden']);});
});
