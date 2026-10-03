/* PDF layout uses points and stays independent of the selected application theme. */
(() => {
    'use strict';
    function text(value, font) {
        const result = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
        try { font.encodeText(result); }
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
        return { text: result, size: actualSize, width: font.widthOfTextAtSize(result, actualSize) };
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
    async function emergency(families, congregation) {
        const { PDFDocument, StandardFonts, rgb } = requireLibrary();
        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
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
    function appendNotes(pdf,font,bold,entries) {
        const {rgb} = requireLibrary(); const ink=rgb(0,0,0);
        for (const entry of entries) {
            let page, y;
            function nextPage() {
                page = pdf.addPage([595.28,841.89]); y = 794;
                page.drawText('Publisher record · continued remarks',{x:36,y,size:14,font:bold,color:ink}); y-=26;
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
    window.PdfTools = { fit, wrap, requireLibrary, emergency, appendNotes };
})();
