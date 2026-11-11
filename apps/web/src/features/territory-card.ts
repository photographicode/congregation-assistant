// One territory as a downloadable JPEG card: map image, number, name, notes, open issues and a QR to its link.
// JPEG, not PDF: a single photo-like page is smallest as an image and opens in every phone gallery.
export type CardInput={number:string;name:string;workspace:string;notes:string;image:string|null;link:string;issues:{household:string;details:string}[]};

const W=1200,PAD=56,FONT='"Noto Sans",Arial,sans-serif',INNER=W-2*PAD;
const QR=220,IMG_MAX_H=900,GAP=32,HEAD_H=120,FOOT_H=260,BLOCK_HEAD=60,LINE_H=40,TITLE_GAP=50,AFTER_BLOCK=10,MAX_ISSUES=8;
const NUMBER_FONT=`700 64px ${FONT}`,NAME_FONT=`600 40px ${FONT}`,SUB_FONT=`400 26px ${FONT}`,TITLE_FONT=`700 30px ${FONT}`,BODY_FONT=`400 28px ${FONT}`,FOOT_FONT=`400 24px ${FONT}`;
const NAME_GAP=28,NAME_DROP=14,SUB_Y=80,FOOT_TEXT_UP=40,QR_ROOM=250,FRAME=2,JPEG_QUALITY=0.82,REVOKE_MS=1000;
const INK='#111',MUTED='#555',RULE='#ccc',PAPER='#fff';
function loadImage(src:string){return new Promise<HTMLImageElement>((ok,bad)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=()=>bad(Error('The image could not be read'));img.src=src;});}
function wrap(g:CanvasRenderingContext2D,text:string,max:number){
 const lines:string[]=[];
 for(const para of text.split('\n')){let line='';for(const word of para.split(/\s+/)){const next=line?line+' '+word:word;if(g.measureText(next).width>max&&line){lines.push(line);line=word;}else line=next;}lines.push(line);}
 return lines;
}
const blockHeight=(lines:string[])=>lines.length?BLOCK_HEAD+lines.length*LINE_H:0;
export async function cardJpeg(c:CardInput):Promise<Blob>{
 const {toDataURL}=await import('qrcode');
 const [qr,img]=await Promise.all([loadImage(await toDataURL(c.link,{margin:1,width:QR})),c.image?loadImage(c.image):Promise.resolve(null)]);
 const imgH=img?Math.min(IMG_MAX_H,Math.round(img.height*INNER/img.width)):0;
 const measure=document.createElement('canvas').getContext('2d')!;
 measure.font=BODY_FONT;
 const notes=c.notes.trim()?wrap(measure,c.notes.trim(),INNER):[];
 const issues=c.issues.slice(0,MAX_ISSUES).flatMap(i=>wrap(measure,'• '+[i.household,i.details].filter(Boolean).join(': '),INNER));
 const H=PAD+HEAD_H+(img?imgH+GAP:0)+blockHeight(notes)+blockHeight(issues)+FOOT_H;
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const g=canvas.getContext('2d')!;
 g.fillStyle=PAPER;g.fillRect(0,0,W,H);g.fillStyle=INK;g.textBaseline='top';
 let y=PAD;
 g.font=NUMBER_FONT;g.fillText(c.number,PAD,y);
 const numberW=g.measureText(c.number).width+NAME_GAP;
 g.font=NAME_FONT;g.fillText(c.name,PAD+numberW,y+NAME_DROP,INNER-numberW);
 g.font=SUB_FONT;g.fillStyle=MUTED;g.fillText(c.workspace,PAD,y+SUB_Y);
 y+=HEAD_H;
 if(img){g.drawImage(img,PAD,y,INNER,imgH);g.strokeStyle=RULE;g.lineWidth=FRAME;g.strokeRect(PAD,y,INNER,imgH);y+=imgH+GAP;}
 const block=(title:string,lines:string[])=>{if(!lines.length)return;g.fillStyle=INK;g.font=TITLE_FONT;g.fillText(title,PAD,y);y+=TITLE_GAP;g.font=BODY_FONT;for(const l of lines){g.fillText(l,PAD,y);y+=LINE_H;}y+=AFTER_BLOCK;};
 block('Notes',notes);
 block('Be aware',issues);
 g.drawImage(qr,W-PAD-QR,H-PAD-QR,QR,QR);
 g.fillStyle=MUTED;g.font=FOOT_FONT;g.fillText('Scan to see the latest notes or report an issue.',PAD,H-PAD-FOOT_TEXT_UP,INNER-QR_ROOM);
 return new Promise((ok,bad)=>canvas.toBlob(b=>b?ok(b):bad(Error('The card could not be drawn')),'image/jpeg',JPEG_QUALITY));
}
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),REVOKE_MS);}
/** Share sheet when the device has one, otherwise copy the link. Returns what happened, for a short notice. */
export async function shareLinkOrCopy(title:string,url:string){
 if(navigator.share){try{await navigator.share({title,url});return 'shared';}catch(e){if((e as Error).name==='AbortError')return 'cancelled';}}
 await navigator.clipboard.writeText(url);return 'copied';
}
