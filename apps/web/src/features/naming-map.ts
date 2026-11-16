// Web Mercator maths for the territory naming map: fit one territory in the view, draw outlines, and turn a tap
// back into a longitude and latitude. Kept apart from the page so it can be tested.
export const W=640,H=440,TILE=256;
const PAD=0.12,MAX_ZOOM=18,MIN_ZOOM=3;
const HALF_TURN=180,TURN=360,HALF=0.5,FOUR=4;
const FOUR_PI=FOUR*Math.PI;
type Ring=[number,number][];
export type Geometry={type:'Polygon'|'MultiPolygon';coordinates:unknown};
const polygons=(g:Geometry)=>(g.type==='Polygon'?[g.coordinates]:g.coordinates) as Ring[][];
// Web Mercator pixels at zoom z.
export const px=(lng:number,z:number)=>(lng+HALF_TURN)/TURN*TILE*2**z;
export const py=(lat:number,z:number)=>{const s=Math.sin(lat*Math.PI/HALF_TURN);return (HALF-Math.log((1+s)/(1-s))/FOUR_PI)*TILE*2**z;};
export const lngOf=(x:number,z:number)=>x/(TILE*2**z)*TURN-HALF_TURN;
export const latOf=(y:number,z:number)=>{const n=Math.PI-2*Math.PI*y/(TILE*2**z);return HALF_TURN/Math.PI*Math.atan(Math.sinh(n));};

/** The view that fits one territory: zoom and the pixel at the top-left corner. */
export function fit(g:Geometry){
 const pts=polygons(g).flat(2);
 const lngs=pts.map(p=>p[0]),lats=pts.map(p=>p[1]);
 const [w,e,s,n]=[Math.min(...lngs),Math.max(...lngs),Math.min(...lats),Math.max(...lats)];
 let z=MAX_ZOOM;
 while(z>MIN_ZOOM&&((px(e,z)-px(w,z))>W*(1-2*PAD)||(py(s,z)-py(n,z))>H*(1-2*PAD)))z--;
 const cx=(px(w,z)+px(e,z))/2,cy=(py(n,z)+py(s,z))/2;
 return {z,x0:cx-W/2,y0:cy-H/2};
}
type View=ReturnType<typeof fit>;
export const path=(g:Geometry,v:View)=>polygons(g).map(poly=>poly.map(r=>'M'+r.map(([lng,lat])=>`${(px(lng,v.z)-v.x0).toFixed(1)},${(py(lat,v.z)-v.y0).toFixed(1)}`).join('L')+'Z').join('')).join('');

