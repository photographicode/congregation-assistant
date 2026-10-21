import templateCells from './template-cells.json' with {type:'json'};
import * as library from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {unicodeFontProvider} from './unicode.mjs';
import {createPdfTools} from './layout.mjs';
export function createPdfEngine({snapshot,loadTemplate,loadFont,now=()=>new Date(),signal,onProgress=(done,total)=>{}}) {
const tools=createPdfTools({library,fontkit,loadFont,now,fontProvider:unicodeFontProvider({library,fontkit,loadFont})});
const getMonthName=i=>['January','February','March','April','May','June','July','August','September','October','November','December'][i];
const extractNumbers=value=>(String(value||'').match(/\d+(?:\.\d+)?/g)||[]).reduce((sum,n)=>sum+Number(n),0);
        const s21 = async (publishers, sy, reportRecords = snapshot.reports) => {
            const { PDFDocument, StandardFonts, rgb } = tools.requireLibrary();
            const reportIndex=new Map();for(const r of reportRecords){const key=r.pubId+'|'+r.serviceYear+'|'+r.month;if(!reportIndex.has(key))reportIndex.set(key,r);}
            const sourceBytes = await loadTemplate('s21-noto.pdf');
            const srcDoc = await PDFDocument.load(sourceBytes);
            const srcPage = srcDoc.getPage(0);
            const srcW = srcPage.getWidth();
            const srcH = srcPage.getHeight();
            const out = await PDFDocument.create();
            // IMPORTANT: embed the original page into the OUTPUT document.
            // Previously it was embedded into srcDoc, so drawPage() had no usable
            // template artwork in the generated PDF.
            const [embedded] = await out.embedPdf(sourceBytes);
            const splitYTop = srcH / 2;
            const {font,bold:fontBold}=await tools.fonts(out,[...publishers.map(p=>p.name),...reportRecords.map(r=>r.comments||'')],{precise:true});
            const dark = rgb(0.04, 0.04, 0.04);

            const continuationNotes = [];
            const drawCentered = (page, text, cx, bottom, top, size=9, fontObj=font, raise=1.8, maxWidth=60) => {
                if (text === '' || text === null || text === undefined) return;
                const fitted = tools.fit(text,fontObj,maxWidth,size,7);
                const low = Math.min(bottom,top), high = Math.max(bottom,top);
                const y = tools.baseline(fontObj,fitted.size,low,high,fitted.text);
                page.drawText(fitted.text, { x:cx-fitted.width/2, y, size:fitted.size, font:fontObj, color:dark });
            };
            const drawLeft = (page, text, x, topBaseline, size=9, fontObj=font, maxWidth=480) => {
                if (text === '' || text === null || text === undefined) return;
                const fitted=tools.fit(text,fontObj,maxWidth,size,7);
                page.drawText(fitted.text,{x,y:topBaseline,size:fitted.size,font:fontObj,color:dark});
            };
            const squares = templateCells.s21[0].cells.filter(cell => cell.ornament && cell.baseline > srcH / 2).map(cell => cell.square);
            const check = (page, square) => tools.checkbox(page,{x:square.x,y:square.y-splitYTop,width:square.w,height:square.h},true);

            const col = { service:59.45, shared:136.71, studies:207.33, ap:277.90, hours:348.47, remarks:480.80 };
            const monthTops = [158.35,176.26,193.99,211.72,229.46,247.28,265.01,282.74,300.47,318.29,336.02,353.75];
            const rowBottom = [176.26,193.99,211.72,229.46,247.28,265.01,282.74,300.47,318.29,336.02,353.75,371.84];
            // Each month occupies the space BETWEEN two horizontal table lines.
            // The coordinates below are measured from the top of the original S-21 PDF.
            // The previous mapping used the preceding line as the bottom, which shifted
            // every report up one month (August data appeared in July).
            const monthRows = monthTops.map((top,i)=>({
                top,
                bottom: i < monthTops.length - 1 ? monthTops[i+1] : 371.84
            }));
            const monthOrder=[8,9,10,11,0,1,2,3,4,5,6,7];

            const publisherRows = (pub, page, yOffset) => {
                const reportYear = sy;
                const reports = monthOrder.map(m => reportIndex.get(pub.id+'|'+reportYear+'|'+m) || {});
                let totalHours=0, totalRemarksNum=0;
                reports.forEach(r=>{
                    const h=parseFloat(r.hours||0); if(!isNaN(h)) totalHours+=h;
                    if(r.comments) totalRemarksNum += extractNumbers(r.comments);
                });
                const addY = (y)=>y+yOffset;
                // Top-card coordinates are measured from the top of the original PDF.
                const ty = (top)=> page.getHeight()-top;
                const baseTop = yOffset===0 ? 0 : -splitYTop;
                const toOutY = (top)=> page.getHeight() - (top + yOffset);
                const drawT = (text,cx,top,bottom,size=9,bold=false,raise=1.8)=>{
                    if(text===''||text==null) return;
                    drawCentered(page,text,cx,toOutY(top),toOutY(bottom),size,bold?fontBold:font,raise);
                };
                const drawB = (text,cx,top,size=9,bold=false)=>{
                    if(text===''||text==null) return;
                    drawLeft(page,text,cx,toOutY(top),size,bold?fontBold:font);
                };

                // Header fields.
                const nameField=tools.fit(pub.name||'',font,480,10.74,7);if(nameField.truncated)continuationNotes.push({name:pub.name,label:'Full publisher name',text:pub.name});drawB(pub.name||'',53,48.85,10.74);
                drawLeft(page,pub.dob||'',92,toOutY(63.28),10.74,font,265);
                const bapText=!pub.baptized?'UBP':(pub.baptized||'');
                drawLeft(page,bapText,109,toOutY(77.8),10.74,font,248);

                // Identity/role checkboxes — the original boxes remain untouched.
                const states=[pub.gender==='Male',pub.gender==='Female',pub.hope==='Other Sheep',pub.hope==='Anointed',!!pub.isElder,!!pub.isMS,!!pub.isRP,!!pub.isSP,!!pub.isFM];
                states.forEach((yes,index)=>{if(yes)check(page,squares[index]);});

                // Service year sits under the SERVICE YEAR heading, on the original table.
                drawT(`${sy-1}–${sy}`,col.service,141.0,157.2,9.5,true,0);

                reports.forEach((r,i)=>{
                    const row=monthRows[i];
                    const hasReport=!!r.id;
                    const h=parseFloat(r.hours||0); const s=parseInt(r.studies||0);
                    const shared=hasReport && (r.sharedInMinistry || h>0 || s>0);
                    const remarks=hasReport ? (shared ? (r.comments||'') : 'Not Participated') : '';
                    drawT(r.studies??'',col.studies,row.bottom,row.top,9,false,1.8);
                    drawT(r.hours??'',col.hours,row.bottom,row.top,9,false,1.8);
                    const remarkLines=tools.wrap(remarks,font,185,7.5);
                    const visible=remarkLines.slice(0,2);
                    if(remarkLines.length>2){
                        continuationNotes.push({name:pub.name,label:getMonthName(monthOrder[i]),text:remarks});
                        const suffix=' [see notes]';
                        visible[1]=tools.fit(visible[1]||'',font,185-font.widthOfTextAtSize(suffix,7.5),7.5,7.5).text+suffix;
                    }
                    const mid=toOutY((row.top+row.bottom)/2);
                    visible.forEach((line,n)=>drawCentered(page,line,col.remarks,mid-4.5+(visible.length-1)*4-n*8,mid+4.5+(visible.length-1)*4-n*8,7.5,font,1.4,185));
                    if(shared){
                        // Shared-in-ministry checkbox centre is x≈136.7; AP checkbox x≈277.9.
                        check(page,squares[9+i]);
                    }
                    if(r.isAP){
                        check(page,squares[21+i]);
                    }
                });
                drawT(reports.some(r=>r.id) ? totalHours : '',348.47,371.93,389.48,9,true,1.9);
                const remarksOutput=totalRemarksNum>0 ? `Additional hours: ${totalRemarksNum}` : '';
                drawCentered(page,remarksOutput,480.80,toOutY(389.48),toOutY(371.93),7.8,font,1.5,185);
            };

            let completed=0;
            for (const pub of publishers) {
                if(signal?.aborted)throw new DOMException("PDF generation cancelled","AbortError");
                // The original template's top half is the first card; its bottom half is the second.
                const page = out.addPage([srcW, splitYTop]);
                page.drawPage(embedded,{x:0,y:-splitYTop,width:srcW,height:srcH});
                publisherRows(pub,page,0);
                onProgress(++completed,publishers.length);await new Promise(resolve=>setTimeout(resolve,0));
            }
            tools.appendNotes(out,font,fontBold,continuationNotes);
            return out.save();
        };

        const s3 = async (sy, month, congName) => {
            const { PDFDocument, StandardFonts, rgb } = tools.requireLibrary();
            const bytes=await loadTemplate('s3-noto.pdf');
            const pdf=await PDFDocument.load(bytes);
            const page=pdf.getPage(0);
            const h=page.getHeight();
            const {font,bold:fontBold}=await tools.fonts(pdf,[congName]);
            const dark=rgb(0.03,0.03,0.03);
            const monthOrder=[8,9,10,11,0,1,2,3,4,5,6,7];
            const id=`${snapshot.id}_${sy}_${month}`;
            const rec=snapshot.attendance.find(a=>a.id===id)||{};
            const viewYear=month>=8?sy-1:sy;
            const monthName=getMonthName(month)+" "+viewYear;
            const printObj=v=>{ if(['CA','RC','Memorial'].includes(v)) return {text:v,str:true}; const n=parseInt(v); return (!isNaN(n)&&n>=0&&v!==''&&v!==null&&v!==undefined)?{text:n,str:false,num:n}:{text:'',str:false}; };
            let mTotal=0,mCount=0,eTotal=0,eCount=0;
            const w=[];
            for(let i=1;i<=5;i++){ const a=printObj(rec[`w${i}_mid`]), b=printObj(rec[`w${i}_end`]); if(!a.str&&a.num!==undefined){mTotal+=a.num;mCount++;} if(!b.str&&b.num!==undefined){eTotal+=b.num;eCount++;} w.push({mid:a,end:b}); }
            const center=(text,cx,top,bottom,size=9,bold=false,raise=2.0)=>{
                if(text===''||text==null)return;
                const f=bold?fontBold:font;
                const fitted=tools.fit(text,f,32,size,7);
                const y=h-bottom+(bottom-top-fitted.size)/2+raise;
                page.drawText(fitted.text,{x:cx-fitted.width/2,y,size:fitted.size,font:f,color:dark});
            };
            const left=(text,x,top,size=8.5,maxWidth=128)=>{
                if(text===''||text==null)return;
                const fitted=tools.fit(text,font,maxWidth,size,6.5);
                page.drawText(fitted.text,{x,y:h-top+4.0,size:fitted.size,font,color:dark});
            };
            // The official template already prints the labels and dotted lines.
            // Inset both entered values 4pt from their corresponding dotted lines and
            // keep entered text 2.5pt higher, clear of the printed dotted baseline.
            left(congName,87.0,98.0,8.5,124); left(monthName,243.0,98.0,8.4,65);
            const xs=[69.61,106.46,143.30,180.15,217.10];
            const rowTops=[127.57,127.57,127.57,127.57,127.57];
            const rowBottoms=[166.91,166.91,166.91,166.91,166.91];
            xs.forEach((x,i)=>center(w[i].mid.text,x,127.57,166.91,9,false,2.0));
            xs.forEach((x,i)=>center(w[i].end.text,x,166.91,206.64,9,false,2.0));
            center(mCount?mTotal:'',253.99,127.57,166.91,9,true,2.0); center(mCount?Math.round(mTotal/mCount):'',290.54,127.57,166.91,9,true,2.0);
            center(eCount?eTotal:'',253.99,166.91,206.64,9,true,2.0); center(eCount?Math.round(eTotal/eCount):'',290.54,166.91,206.64,9,true,2.0);
            if(tools.fit(congName,font,124,8.5,6.5).truncated) tools.appendNotes(pdf,font,fontBold,[{name:monthName,label:'Full congregation name',text:congName}], 'Attendance report · full details');
            return pdf.save();
        };


const s88 = async (syRight) => {
                const syLeft = syRight - 1;
                const monthOrder = [8,9,10,11,0,1,2,3,4,5,6,7];

                const MID_BOTTOM = [143.6,163.5,183.5,203.5,223.5,243.4,263.4,283.3,303.3,323.3,343.3,363.2];
                const MID_FOOTER_BOTTOM = 383.2;
                const END_BOTTOM = [492.6,512.6,532.5,552.4,572.3,592.2,612.1,632.1,652.0,671.9,691.8,711.7];
                const END_FOOTER_BOTTOM = 731.6;

                const COL = {
                    left:  { c2: 131,   c3: 198,   c4: 264 },
                    right: { c2: 412,   c3: 478.5, c4: 545.5 }
                };

                const buildYearData = (sy, field) => {
                    let totalMeetings = 0, totalAttendance = 0;
                    const rows = monthOrder.map(m => {
                        const rec = snapshot.attendance.find(a => a.service_year === sy && a.month === m) || {};
                        let numMeetings = 0, sum = 0;
                        for (let w=1; w<=5; w++) {
                            const v = parseInt(rec[`w${w}_${field}`]);
                            if (!isNaN(v) && v > 0) { numMeetings++; sum += v; }
                        }
                        const avg = numMeetings > 0 ? Math.round(sum / numMeetings) : '';
                        totalMeetings += numMeetings; totalAttendance += sum;
                        return { numMeetings: numMeetings || '', total: sum || '', avg: avg };
                    });
                    const overallAvg = totalMeetings > 0 ? Math.round(totalAttendance / totalMeetings) : '';
                    return { rows, totalMeetings: totalMeetings || '', totalAttendance: totalAttendance || '', overallAvg };
                };

                    const { PDFDocument, StandardFonts, rgb } = tools.requireLibrary();
                    const bytes=await loadTemplate('s88-noto.pdf');
                    const pdfDoc = await PDFDocument.load(bytes);
                    const page = pdfDoc.getPage(0);
                    const pageHeight = page.getHeight();
                    const {font,bold:fontBold}=await tools.fonts(pdfDoc,[]);

                    const centerText = (text, centerX, bottomY, size = 9, useFont = font) => {
                        if (text === '' || text === null || text === undefined) return;
                        const fitted=tools.fit(text,useFont,56,size,7);
                        const str=fitted.text, width=fitted.width; size=fitted.size;
                        // Raise the inserted value slightly so it sits optically centered in the cell.
                        page.drawText(str, { x: centerX - width / 2, y: pageHeight - bottomY + 3, size, font: useFont, color: rgb(0.05, 0.05, 0.05) });
                    };

                    const fillTable = (sy, field, colSet, bottoms, footerBottom) => {
                        const { rows, overallAvg } = buildYearData(sy, field);
                        rows.forEach((r, i) => {
                            centerText(r.numMeetings, colSet.c2, bottoms[i]);
                            centerText(r.total, colSet.c3, bottoms[i]);
                            centerText(r.avg, colSet.c4, bottoms[i]);
                        });
                        centerText(overallAvg, colSet.c4, footerBottom, 9, fontBold);
                    };

                    fillTable(syLeft, 'mid', COL.left, MID_BOTTOM, MID_FOOTER_BOTTOM);
                    fillTable(syRight, 'mid', COL.right, MID_BOTTOM, MID_FOOTER_BOTTOM);
                    fillTable(syLeft, 'end', COL.left, END_BOTTOM, END_FOOTER_BOTTOM);
                    fillTable(syRight, 'end', COL.right, END_BOTTOM, END_FOOTER_BOTTOM);

                    const leftYearLabel = `${syLeft-1}-${syLeft}`;
                    const rightYearLabel = `${syRight-1}-${syRight}`;
                    const drawYearLabel = (text, centerX, topY) => { const width = font.widthOfTextAtSize(text, 9); page.drawText(text, { x: centerX - width / 2, y: pageHeight - topY + 3, size: 9, font, color: rgb(0.05, 0.05, 0.05) }); };
                    // Keep the year text centered vertically inside the Service Year cells.
                    drawYearLabel(leftYearLabel, 58, 120.5); drawYearLabel(rightYearLabel, 339, 120.5);
                    drawYearLabel(leftYearLabel, 58, 469.8); drawYearLabel(rightYearLabel, 339, 469.8);

                    return pdfDoc.save();

};

return {s21,s3,s88,emergency:tools.emergency,schedule:tools.makeDocument};
}
