// Territory outlines from a KML file: one polygon (or several) per placemark, matched to a territory by the number
// at the start of the placemark name ("12", "No. 12 – Market Street", "Territory 12A"). Coordinates stay [lng, lat].
type Ring=[number,number][];
export type Outline={number:string;boundary:{type:'Polygon';coordinates:Ring[]}|{type:'MultiPolygon';coordinates:Ring[][]}};

const NUMBER=/^\s*(?:no\.?|territory|t)?\s*#?\s*(\d+[a-z]?)\b/i;
/** The territory number a placemark name starts with, or '' when it has none. */
export const outlineNumber=(name:string)=>NUMBER.exec(name)?.[1]?.toUpperCase()??'';

const DIGITS=6,MIN_RING=4;
function ring(text:string):Ring{
 return text.trim().split(/\s+/).map(t=>t.split(',').map(Number)).filter(p=>p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]))
  .map(([lng,lat])=>[+lng!.toFixed(DIGITS),+lat!.toFixed(DIGITS)] as [number,number]);
}

/** Reads every numbered placemark with a polygon. Placemarks sharing a number become one MultiPolygon. */
export function readOutlines(kml:string):Outline[]{
 const doc=new DOMParser().parseFromString(kml,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('This file is not a KML file that can be read.');
 const byNumber=new Map<string,Ring[][]>();
 for(const pm of [...doc.getElementsByTagName('Placemark')]){
  const number=outlineNumber(pm.getElementsByTagName('name')[0]?.textContent||'');
  if(!number)continue;
  for(const poly of [...pm.getElementsByTagName('Polygon')]){
   const outer=ring(poly.getElementsByTagName('outerBoundaryIs')[0]?.getElementsByTagName('coordinates')[0]?.textContent||'');
   if(outer.length<MIN_RING)continue;
   const holes=[...poly.getElementsByTagName('innerBoundaryIs')].map(b=>ring(b.getElementsByTagName('coordinates')[0]?.textContent||'')).filter(r=>r.length>=MIN_RING);
   byNumber.set(number,[...(byNumber.get(number)||[]),[outer,...holes]]);
  }
 }
 return [...byNumber].map(([number,polys])=>({number,boundary:polys.length===1?{type:'Polygon',coordinates:polys[0]!}:{type:'MultiPolygon',coordinates:polys}}));
}
