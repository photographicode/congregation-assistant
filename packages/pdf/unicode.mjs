import {subsetName} from './layout.ts';
import * as shapingFontkit from 'fontkit';
import * as hb from 'harfbuzzjs';
/** Font fallback and positioned glyph runs. All text remains selectable PDF text. */
const scripts=[['Devanagari',/\p{Script=Devanagari}/u],['Malayalam',/\p{Script=Malayalam}/u],['Tamil',/\p{Script=Tamil}/u],['Telugu',/\p{Script=Telugu}/u],['Kannada',/\p{Script=Kannada}/u],['Gujarati',/\p{Script=Gujarati}/u],['Bengali',/\p{Script=Bengali}/u],['Gurmukhi',/\p{Script=Gurmukhi}/u],['Oriya',/\p{Script=Oriya}/u]];
export function unicodeFontProvider({library,fontkit,loadFont}) {
 const bytes=new Map();
 return async (pdf,values)=>{
  const all=values.join(' '),families=scripts.filter(([,pattern])=>pattern.test(all)).map(([family])=>family);if(!families.length)return null;
  pdf.registerFontkit(fontkit);
  async function build(weight){const fonts=[];for(const family of ['',...families]){const name=`NotoSans${family}-${weight}.ttf`;if(!bytes.has(name))bytes.set(name,new Uint8Array(await loadFont(name)));const raw=bytes.get(name),parsed=shapingFontkit.create(raw),font=await pdf.embedFont(raw,{subset:true,customName:subsetName(pdf,'NotoSans'+family+'-'+weight)});font.caCharacters=new Set(font.getCharacterSet());font.caFamily=family;const embedded=font.embedder.font;
    const blob=new hb.Blob(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),face=new hb.Face(blob),hbFont=new hb.Font(face);
    embedded.layout=value=>{const buffer=new hb.Buffer();let index=0;for(const char of value){buffer.add(char.codePointAt(0),index);index+=char.length;}buffer.guessSegmentProperties();hb.shape(hbFont,buffer);const infos=buffer.getGlyphInfos(),positions=buffer.getGlyphPositions();if(infos.some(info=>info.codepoint===0))throw Error('Missing PDF glyph in '+value);return {glyphs:infos.map(info=>{const glyph=embedded.getGlyph(info.codepoint);if(!glyph.codePoints?.length){const end=Math.min(...infos.map(other=>other.cluster).filter(cluster=>cluster>info.cluster),value.length);glyph.codePoints=[...value.slice(info.cluster,end)].map(char=>char.codePointAt(0));}return glyph;}),positions};};
    font.caParsed=embedded;fonts.push(font);}
   const main=fonts[0];
   main.caRuns=(text)=>{const result=[];let current=null;for(const char of String(text)){const cp=char.codePointAt(0);const family=scripts.find(([,pattern])=>pattern.test(char))?.[0];const inherited=/[\p{Mark}\u200c\u200d]/u.test(char);const font=family?fonts.find(f=>f.caFamily===family):inherited&&current?current.font:fonts[0];if(!font||!font.caCharacters.has(cp))throw Error('A font glyph is missing for '+char+'. Download the full PDF font pack and retry.');if(current?.font===font)current.text+=char;else{current={font,text:char};result.push(current);}}return result;};
   main.caValidate=text=>{for(const run of main.caRuns(text))run.font.encodeText(run.text);};
   main.widthOfTextAtSize=(text,size)=>main.caRuns(text).reduce((sum,run)=>{const layout=run.font.caParsed.layout(run.text);return sum+layout.positions.reduce((n,p)=>n+p.xAdvance,0)*size/run.font.caParsed.unitsPerEm;},0);
   return main;
  }
  const result={font:await build('Regular'),bold:await build('Bold')};
  const originalAdd=pdf.addPage.bind(pdf),originalGet=pdf.getPage.bind(pdf);
  const patched=new WeakSet();const patch=page=>{if(patched.has(page))return page;patched.add(page);const draw=page.drawText.bind(page);page.drawText=(text,options)=>{
   const font=options?.font;if(!font?.caRuns)return draw(text,options);let x=options.x||0,y=options.y||0;
   for(const run of font.caRuns(text)){const face=run.font,layout=face.caParsed.layout(run.text),hex=face.encodeText(run.text).asString(),unit=(options.size||12)/face.caParsed.unitsPerEm;page.setFont(face);const ops=[library.pushGraphicsState(),library.PDFOperator.of('BDC',[library.PDFName.of('Span'),pdf.context.obj({ActualText:library.PDFHexString.fromText(run.text)})]),library.beginText(),library.setFontAndSize(page.fontKey,options.size||12)];if(options.color)ops.push(library.setFillingColor(options.color));let penX=x,penY=y;layout.positions.forEach((p,i)=>{ops.push(library.setTextMatrix(1,0,0,1,penX+p.xOffset*unit,penY+p.yOffset*unit),library.showText(library.PDFHexString.of(hex.slice(i*4,i*4+4))));penX+=p.xAdvance*unit;penY+=p.yAdvance*unit;});ops.push(library.endText(),library.PDFOperator.of('EMC'),library.popGraphicsState());page.pushOperators(...ops);x=penX;y=penY;}
  };return page;};pdf.addPage=(...args)=>patch(originalAdd(...args));pdf.getPage=(...args)=>patch(originalGet(...args));pdf.getPages().forEach(patch);
  return result;
 };
}
