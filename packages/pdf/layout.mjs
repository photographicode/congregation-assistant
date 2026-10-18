import {installCellWriter,fontMetrics,subsetName} from './layout.ts';
export function createPdfTools({library,fontkit,loadFont,fontProvider,now=()=>new Date()}) {

    function text(value, font) {
        const result = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
        try { if(font.caValidate){font.caValidate(result);return result;} if(font.caCharacters)for(const c of result)if(!font.caCharacters.has(c.codePointAt(0)))throw Error("Missing glyph");font.encodeText(result); }
        catch (error) { throw new Error('The PDF font pack could not render this field. Retry the font download.',{cause:error}); }
        return result;
    }
    function fit(value, font, maxWidth, size = 9, minSize = 7) {
        let result = text(value, font), actualSize = size;
        while (actualSize > minSize && font.widthOfTextAtSize(result, actualSize) > maxWidth) actualSize = Math.max(minSize, actualSize - .25);
        if (font.widthOfTextAtSize(result, actualSize) > maxWidth) {
            const chars = [...result];
            while (chars.length && font.widthOfTextAtSize(chars.join('') + '…', actualSize) > maxWidth) chars.pop();
            result = chars.join('') + '…';
        }
        return { text: result, size: actualSize, width: font.widthOfTextAtSize(result, actualSize), truncated: result!==text(value,font), original:text(value,font) };
    }
    function wrap(value, font, maxWidth, size = 9) {
        const source = text(value, font); if (!source) return [''];
        const lines = []; let line = '';
        for (const word of source.split(' ')) {
            if (font.widthOfTextAtSize(line ? line + ' ' + word : word, size) <= maxWidth) { line = line ? line + ' ' + word : word; continue; }
            if (line) { lines.push(line); line = ''; }
            for (const char of word) {
                if (line && font.widthOfTextAtSize(line + char, size) > maxWidth) { lines.push(line); line = ''; }
                line += char;
            }
        }
        if (line) lines.push(line);
        return lines;
    }
    function requireLibrary() {
        return library;
    }
    const fontBytes=new Map();
    async function fonts(pdf,values,{precise=false}={}){
        if(fontProvider){const supported=await fontProvider(pdf,values);if(supported){installCellWriter(pdf);return supported;}}
        const all=values.join(' ');
        if(!fontkit)throw Error('The bundled Unicode font support could not load. Reload before exporting.');pdf.registerFontkit(fontkit);const family='NotoSans';
        async function embed(weight){const path='assets/fonts/'+family+'-'+weight+'.ttf';if(!fontBytes.has(path)){fontBytes.set(path,new Uint8Array(await loadFont(path.split('/').pop())));}const font=await pdf.embedFont(fontBytes.get(path),{subset:true,customName:subsetName(pdf,family+'-'+weight)});font.caCharacters=new Set(font.getCharacterSet());const parsed=fontkit.create(fontBytes.get(path));font.caInkBounds=(value,size)=>{const run=parsed.layout(value);let pen=0;const bounds=run.glyphs.map(g=>{const b={minX:pen+g.bbox.minX,maxX:pen+g.bbox.maxX,minY:g.bbox.minY,maxY:g.bbox.maxY};pen+=g.advanceWidth;return b;});const unit=size/parsed.unitsPerEm;return {minX:Math.min(...bounds.map(b=>b.minX))*unit,maxX:Math.max(...bounds.map(b=>b.maxX))*unit,minY:Math.min(...bounds.map(b=>b.minY))*unit,maxY:Math.max(...bounds.map(b=>b.maxY))*unit};};text(all,font);return font;}
        const result={font:await embed('Regular'),bold:await embed('Bold')};installCellWriter(pdf);return result;
    }
    function baseline(font,size,bottom,top){return (bottom+top)/2-fontMetrics(font,size).capHeight/2;}
    function field(page,value,rect,font,{size=9,minSize=7,align='center',color}={}){const inset=rect.padding??2,item=fit(value,font,rect.width-2*inset,size,minSize),x=align==='left'?rect.x+inset:align==='right'?rect.x+rect.width-inset-item.width:rect.x+(rect.width-item.width)/2,y=baseline(font,item.size,rect.y+inset,rect.y+rect.height-inset);page.drawText(item.text,{x,y,font,size:item.size,color:color||requireLibrary().rgb(0,0,0)});return {...item,x,y};}
    function checkbox(page,rect,state){if(state===false||state===null||state===undefined)return;if(state!==true)throw Error('Check the checkbox value before exporting.');const size=Math.min(rect.width,rect.height);if(size<4)throw Error('Checkbox is too small.');tick(page,rect.x+rect.width/2,rect.y+rect.height/2,Math.min(1,size/10));}
    async function emergency(families, congregation) {
        const { PDFDocument, StandardFonts, rgb } = requireLibrary();
        const pdf = await PDFDocument.create();
        const {font,bold}=await fonts(pdf,[congregation,...families.flatMap(f=>[f.headName,...f.members.flatMap(p=>[p.name,p.address,p.emergencyName,p.emergencyRelationship,p.spiritualStatus])])]);
        const W = 841.89, H = 595.28, margin = 28, widths = [122,78,150,120,90,78,147];
        const ink = rgb(0,0,0), rule = rgb(.65,.65,.65), pale = rgb(.96,.96,.96);
        const headings = ['Publisher','Phone','Address','Emergency contact','Relationship','Emergency phone','Status'];
        const size = 8.5, leading = 11, bottom = 38;
        let page, y, currentFamily = '';const fullDetails=[];
        const draw = (value,x,baseline,maxWidth,fontObj = font,fontSize = size) => {
            const item = fit(value,fontObj,maxWidth,fontSize,7);
            page.drawText(item.text,{x,y:baseline,font:fontObj,size:item.size,color:ink});
        };
        function familyHeader(continued = false) {
            page.drawRectangle({x:margin,y:y-21,width:785,height:21,color:pale,borderColor:rule,borderWidth:.5});
            draw(currentFamily + ' family' + (continued ? ' · continued' : ''), margin+7, y-14,771,bold,9);
            y -= 21;
        }
        function newPage(continued = false) {
            page = pdf.addPage([W,H]);
            page.drawText('Emergency contacts',{x:margin,y:H-37,size:18,font:bold,color:ink});
            draw(congregation,margin,H-54,550,font,9);
            draw('Generated ' + now().toISOString().slice(0,10),W-margin-130,H-54,130,font,8);
            y = H-70; let x = margin;
            headings.forEach((heading,i) => {
                page.drawRectangle({x,y:y-31,width:widths[i],height:31,color:pale,borderColor:rule,borderWidth:.5});
                const lines = wrap(heading,bold,widths[i]-14,8.5);
                lines.forEach((line,n) => page.drawText(line,{x:x+7,y:y-12-n*10,size:8.5,font:bold,color:ink})); x += widths[i];
            });
            y -= 31;
            if (continued) familyHeader(true);
        }
        newPage();
        for (const family of families) {
            currentFamily = family.headName;
            if (y - 55 < bottom) newPage();
            familyHeader();
            for (const person of family.members) {
                const values = [person.name,person.phone,person.address,person.emergencyName,person.emergencyRelationship,person.emergencyPhone,person.spiritualStatus || (person.baptized ? 'Baptised' : 'Unbaptised')];
                const cells = values.map((value,i) => wrap(value || '—',font,widths[i]-14,size));
                const totalLines=Math.max(...cells.map(lines=>lines.length)),count=Math.min(5,totalLines),height=Math.max(28,count*leading+14);
                if(y-height<bottom)newPage(true);
                let x=margin;
                cells.forEach((lines,i)=>{page.drawRectangle({x,y:y-height,width:widths[i],height,borderColor:rule,borderWidth:.5});const visible=lines.slice(0,count);if(lines.length>count){visible[count-1]=fit('Full details on following pages',font,widths[i]-14,size,7).text;fullDetails.push({name:person.name,label:headings[i],text:String(values[i]||'')});}visible.forEach((line,n)=>page.drawText(line,{x:x+7,y:y-14-n*leading,size,font,color:ink}));x+=widths[i];});y-=height;
            }
        }
        if(fullDetails.length)appendNotes(pdf,font,bold,fullDetails,'Emergency contacts · full details');
        const pages = pdf.getPages();
        pages.forEach((p,i)=>p.drawText(`Page ${i+1} of ${pages.length}`,{x:margin,y:20,size:8,font,color:ink}));
        return pdf.save();
    }
    function appendNotes(pdf,font,bold,entries,title='Publisher record · continued remarks') {
        const {rgb} = requireLibrary(); const ink=rgb(0,0,0);
        for (const entry of entries) {
            let page, y;
            function nextPage() {
                page = pdf.addPage([595.28,841.89]); y = 794;
                page.drawText(title,{x:36,y,size:14,font:bold,color:ink}); y-=26;
                for(const line of wrap(entry.name,font,523,10)){page.drawText(line,{x:36,y,size:10,font,color:ink});y-=14;}
                y-=12;
            }
            nextPage();
            for(const line of wrap(entry.label + ': ' + entry.text,font,523,10)) {
                if(y<42) nextPage();
                page.drawText(line,{x:36,y,size:10,font,color:ink}); y-=14;
            }
        }
    }
    function tick(page,cx,cy,scale=1) {
        const {rgb}=requireLibrary();
        // Filled, curved black check; vector geometry avoids missing Unicode glyphs.
        page.drawSvgPath('M -3.95 -0.55 C -4.3 -0.25 -4.35 0.2 -3.95 0.65 L -1.35 3.5 C -0.95 3.95 -0.4 3.9 -0.05 3.4 L 4.25 -3.1 C 4.5 -3.55 4.15 -3.85 3.8 -3.5 L -0.9 1.55 L -3.35 -0.55 C -3.55 -0.75 -3.8 -0.7 -3.95 -0.55 Z',{x:cx,y:cy,scale,color:rgb(0,0,0)});
    }
    async function makeDocument(title,sections,{largePrint=false,layout='list'}={}) {
        const {PDFDocument,rgb}=requireLibrary(),pdf=await PDFDocument.create(),{font,bold}=await fonts(pdf,[title,...sections.flatMap(s=>[s.heading,...s.lines])]),ink=rgb(0,0,0),bodySize=largePrint?16:10,leading=largePrint?24:15;
        const booklet=layout==='booklet',W=booklet?419.53:595.28,H=booklet?595.28:841.89,margin=36;let page,y;
        function next(){page=pdf.addPage([W,H]);y=H-47;for(const item of wrap(title,bold,W-2*margin,17)){page.drawText(item,{x:margin,y,size:17,font:bold,color:ink});y-=23;}y-=7;}
        function line(value,strong=false){for(const item of wrap(value,strong?bold:font,W-2*margin,bodySize)){if(y<52)next();page.drawText(item,{x:margin,y,size:bodySize,font:strong?bold:font,color:ink});y-=leading;}}
        if(layout==='grid'){
            const cardWidth=(W-2*margin-14)/2,cardHeight=210,continuations=[];next();let row=0;
            for(const section of sections){if(row===6){next();row=0;}const col=row%2,r=Math.floor(row/2),x=margin+col*(cardWidth+14),top=H-100-r*(cardHeight+16);page.drawRectangle({x,y:top-cardHeight,width:cardWidth,height:cardHeight,borderWidth:.5,borderColor:rgb(.65,.65,.65)});let cursor=top-20;const lines=[...wrap(section.heading,bold,cardWidth-20,bodySize).map(text=>({text,strong:true})),...section.lines.flatMap(value=>wrap(value,font,cardWidth-20,bodySize).map(text=>({text,strong:false})))];const limit=Math.floor((cardHeight-45)/leading);for(const item of lines.slice(0,limit)){page.drawText(item.text,{x:x+10,y:cursor,size:bodySize,font:item.strong?bold:font,color:ink});cursor-=leading;}if(lines.length>limit){page.drawText('Full details on following pages',{x:x+10,y:top-cardHeight+13,size:7,font,color:ink});continuations.push({heading:section.heading+' · full details',lines:section.lines});}row++;}
            if(continuations.length){next();for(const section of continuations){line(section.heading,true);for(const value of section.lines)line(value);y-=15;}}
        }else{next();for(const section of sections){if(y<100)next();line(section.heading,true);y-=6;for(const value of section.lines)line(value);y-=15;}}
        pdf.getPages().forEach((p,i)=>p.drawText('Private · Page '+(i+1)+' of '+pdf.getPageCount(),{x:margin,y:25,size:8,font,color:ink}));
        if(!booklet)return pdf.save();
        while(pdf.getPageCount()%4)pdf.addPage([W,H]).drawText(' ',{x:1,y:1,font,size:1});const output=await PDFDocument.create(),embedded=await output.embedPdf(await pdf.save(),Array.from({length:pdf.getPageCount()},(_,i)=>i)),n=embedded.length;
        for(let sheet=0;sheet<n/4;sheet++)for(const pair of [[n-1-2*sheet,2*sheet],[2*sheet+1,n-2-2*sheet]]){const spread=output.addPage([W*2,H]);spread.drawPage(embedded[pair[0]],{x:0,y:0,width:W,height:H});spread.drawPage(embedded[pair[1]],{x:W,y:0,width:W,height:H});}
        return output.save();
    }
    async function transfer(record) {
        const p=record.publisher,labels={name:'Name',phone:'Phone',dob:'Date of birth',baptized:'Date of baptism',gender:'Gender',hope:'Hope',address:'Address',emergency_name:'Emergency contact',emergency_relationship:'Emergency relationship',emergency_phone:'Emergency phone',spiritual_status:'Publisher status',is_elder:'Elder',is_ms:'Ministerial servant',is_rp:'Regular pioneer',is_sp:'Special pioneer',is_fm:'Field missionary',is_infirm:'Infirm regular pioneer',is_sfts:'Special full-time service',id:'Record ID',transferred_at:'Transferred on'};
        const lines=Object.entries(p).map(([key,value])=>(labels[key]||key.replace(/_/g,' '))+': '+(typeof value==='boolean'?(value?'Yes':'No'):value||'Not recorded'));
        if(p.dob){const birthday=new Date(p.dob+'T00:00:00'),today=new Date();if(!Number.isNaN(birthday.getTime())){let age=today.getFullYear()-birthday.getFullYear();if(today.getMonth()<birthday.getMonth()||today.getMonth()===birthday.getMonth()&&today.getDate()<birthday.getDate())age--;lines.push('Age: '+age);}}
        if(record.familyContact)lines.push('Family contact: '+record.familyContact);
        const reports=(record.reports||[]).map(r=>{const month=new Date(2000,r.month,1).toLocaleString('en',{month:'long'});return month+' · Service year '+(r.service_year-1)+'–'+r.service_year+' · Shared in ministry: '+(r.shared_in_ministry?'Yes':'No')+' · Studies: '+r.studies+' · Hours: '+r.hours+' · Auxiliary pioneer: '+(r.is_ap?'Yes':'No')+(r.comments?' · Remarks: '+r.comments:'');});
        return makeDocument('Publisher transfer record',[{heading:record.congregation,lines:['Prepared '+now().toISOString().slice(0,10)+'. Share privately with the receiving congregation.']},{heading:'Publisher details',lines},{heading:'Service report history',lines:reports.length?reports:['No reports recorded.']}]);
    }
    async function welcome(letter){return makeDocument('Welcome to Congregation Assistant',[{heading:'Your congregation workspace',lines:letter.split('\n')}]);}
    function download(bytes,name){const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}

return { fit,wrap,emergency,appendNotes,tick,makeDocument,fonts,baseline,field,checkbox,requireLibrary };
}
