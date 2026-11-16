import {describe,expect,it} from 'vitest';
import {fit,H,latOf,lngOf,path,px,py,W} from '../../apps/web/src/features/naming-map';

const square=(x:number,y:number,d:number)=>({type:'Polygon' as const,coordinates:[[[x,y],[x+d,y],[x+d,y+d],[x,y+d],[x,y]]]});

describe('naming map',()=>{
 it('turns a map position back into the same longitude and latitude',()=>{
  const z=15;
  expect(lngOf(px(76.2673,z),z)).toBeCloseTo(76.2673,6);
  expect(latOf(py(9.9312,z),z)).toBeCloseTo(9.9312,6);
 });
 it('fits a territory inside the view, zooming out for bigger ones',()=>{
  const small=fit(square(76.28,9.96,0.005)),big=fit(square(76.2,9.9,0.2));
  expect(big.z).toBeLessThan(small.z);
  for(const [x,y] of [[76.28,9.96],[76.285,9.965]] as const){
   const sx=px(x,small.z)-small.x0,sy=py(y,small.z)-small.y0;
   expect(sx).toBeGreaterThan(0);expect(sx).toBeLessThan(W);expect(sy).toBeGreaterThan(0);expect(sy).toBeLessThan(H);
  }
 });
 it('draws every part of a territory made of several pieces',()=>{
  const multi={type:'MultiPolygon' as const,coordinates:[square(76.28,9.96,0.002).coordinates,square(76.29,9.96,0.002).coordinates]};
  expect(path(multi,fit(multi)).match(/M/g)).toHaveLength(2);
 });
});
