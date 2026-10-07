/* PDF layout uses points and stays independent of the selected application theme. */
(() => {
    'use strict';
    function text(value, font) {
        const result = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
        try { if(font.caCharacters)for(const c of result)if(!font.caCharacters.has(c.codePointAt(0)))throw Error("Missing glyph");font.encodeText(result); }
        catch { throw new Error('This PDF font cannot print some characters in the entered text. A Unicode font is required for those names.'); }
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
        if (!window.PDFLib) throw new Error('The PDF library did not load. Check your connection and reload before downloading.');
        return window.PDFLib;
    }
    const fontBytes=new Map();
    async function fonts(pdf,values){
        const {StandardFonts}=requireLibrary(),all=values.join(' '),latin=await pdf.embedFont(StandardFonts.Helvetica);
        try{text(all,latin);return {font:latin,bold:await pdf.embedFont(StandardFonts.HelveticaBold)};}catch{}
        const ranges=[['Tamil',/\p{Script=Tamil}/u],['Devanagari',/\p{Script=Devanagari}/u],['Malayalam',/\p{Script=Malayalam}/u]],scripts=ranges.filter(([,re])=>re.test(all));
        if(scripts.length>1)throw Error('This PDF combines different Indian scripts. Export each language separately; mixed-script shaping needs a further layout review.');
        if(scripts.length)throw Error('A verified Unicode font layout for Indian names alongside English labels is not available yet. No PDF was created. Contact support before exporting these records.');
        if(!window.fontkit)throw Error('The bundled Unicode font support could not load. Reload before exporting.');pdf.registerFontkit(window.fontkit);const family='NotoSans'+(scripts[0]?.[0]||'');
        async function embed(weight){const path='assets/fonts/'+family+'-'+weight+'.ttf';if(!fontBytes.has(path)){const response=await fetch(path);if(!response.ok)throw Error('The required Unicode font could not load. Retry when connected.');fontBytes.set(path,new Uint8Array(await response.arrayBuffer()));}const font=await pdf.embedFont(fontBytes.get(path),{subset:true});font.caCharacters=new Set(font.getCharacterSet());text(all,font);return font;}
        return {font:await embed('Regular'),bold:await embed('Bold')};
    }
    function baseline(font,size,bottom,top){const ascent=font.heightAtSize(size,{descender:false}),descent=ascent-font.heightAtSize(size,{descender:true});return (bottom+top)/2-(ascent+descent)/2;}
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
        let page, y, currentFamily = '';
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
            draw('Generated ' + new Date().toISOString().slice(0,10),W-margin-130,H-54,130,font,8);
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
                let offset = 0; const totalLines = Math.max(...cells.map(lines=>lines.length));
                while (offset < totalLines) {
                    if (y - 28 < bottom) newPage(true);
                    const availableLines = Math.max(1,Math.floor((y-bottom-14)/leading));
                    const count = Math.min(availableLines,totalLines-offset), height = Math.max(28,count*leading+14);
                    let x = margin;
                    cells.forEach((lines,i) => {
                        page.drawRectangle({x,y:y-height,width:widths[i],height,borderColor:rule,borderWidth:.5});
                        const visible=i===0 && offset>0?[fit(person.name+' (continued)',font,widths[i]-14,size,7).text]:lines.slice(offset,offset+count);
                        visible.forEach((line,n)=>page.drawText(line,{x:x+7,y:y-14-n*leading,size,font,color:ink}));
                        x += widths[i];
                    });
                    y -= height; offset += count;
                }
            }
        }
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
        page.drawSvgPath('M -3 0 C -2.2 0.1 -1.5 0.9 -0.6 2.1 C 0.8 0 2.7 -2.4 4.1 -3.3 C 4.4 -3.5 4.8 -3.3 4.6 -2.8 C 3 -0.7 1.6 1.6 0.1 3.3 C -0.2 3.7 -0.8 3.8 -1.2 3.3 C -2.2 2 -2.9 1 -3.5 0.4 C -3.8 0.1 -3.5 -0.2 -3 0 Z',{x:cx,y:cy,scale,color:rgb(0,0,0)});
    }
    async function makeDocument(title,sections) {
        const {PDFDocument,rgb}=requireLibrary(),pdf=await PDFDocument.create(),{font,bold}=await fonts(pdf,[title,...sections.flatMap(s=>[s.heading,...s.lines])]),ink=rgb(0,0,0);let page,y;
        function next(){page=pdf.addPage([595.28,841.89]);y=795;page.drawText(title,{x:36,y,size:17,font:bold,color:ink});y-=30;}
        function line(value,strong=false){for(const item of wrap(value,strong?bold:font,523,10)){if(y<52)next();page.drawText(item,{x:36,y,size:10,font:strong?bold:font,color:ink});y-=15;}}
        next();for(const section of sections){if(y<100)next();line(section.heading,true);y-=6;for(const value of section.lines)line(value);y-=15;}
        pdf.getPages().forEach((p,i)=>p.drawText('Private · Page '+(i+1)+' of '+pdf.getPageCount(),{x:36,y:25,size:8,font,color:ink}));return pdf.save();
    }
    async function transfer(record) {
        const p=record.publisher,labels={name:'Name',phone:'Phone',dob:'Date of birth',baptized:'Date of baptism',gender:'Gender',hope:'Hope',address:'Address',emergency_name:'Emergency contact',emergency_relationship:'Emergency relationship',emergency_phone:'Emergency phone',spiritual_status:'Publisher status',is_elder:'Elder',is_ms:'Ministerial servant',is_rp:'Regular pioneer',is_sp:'Special pioneer',is_fm:'Field missionary',is_infirm:'Infirm regular pioneer',is_sfts:'Special full-time service',id:'Record ID',transferred_at:'Transferred on'};
        const lines=Object.entries(p).map(([key,value])=>(labels[key]||key.replace(/_/g,' '))+': '+(typeof value==='boolean'?(value?'Yes':'No'):value||'Not recorded'));
        if(p.dob){const birthday=new Date(p.dob+'T00:00:00'),today=new Date();if(!Number.isNaN(birthday.getTime())){let age=today.getFullYear()-birthday.getFullYear();if(today.getMonth()<birthday.getMonth()||today.getMonth()===birthday.getMonth()&&today.getDate()<birthday.getDate())age--;lines.push('Age: '+age);}}
        if(record.familyContact)lines.push('Family contact: '+record.familyContact);
        const reports=(record.reports||[]).map(r=>{const month=new Date(2000,r.month,1).toLocaleString('en',{month:'long'});return month+' · Service year '+(r.service_year-1)+'–'+r.service_year+' · Shared in ministry: '+(r.shared_in_ministry?'Yes':'No')+' · Studies: '+r.studies+' · Hours: '+r.hours+' · Auxiliary pioneer: '+(r.is_ap?'Yes':'No')+(r.comments?' · Remarks: '+r.comments:'');});
        return makeDocument('Publisher transfer record',[{heading:record.congregation,lines:['Prepared '+new Date().toISOString().slice(0,10)+'. Share privately with the receiving congregation.']},{heading:'Publisher details',lines},{heading:'Service report history',lines:reports.length?reports:['No reports recorded.']}]);
    }
    async function welcome(letter){return makeDocument('Welcome to Congregation Assistant',[{heading:'Your congregation workspace',lines:letter.split('\n')}]);}
    function download(bytes,name){const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
    window.PdfTools = { fit, wrap, requireLibrary, emergency, appendNotes, tick, transfer, welcome, download, makeDocument, fonts, baseline, field, checkbox };
})();
