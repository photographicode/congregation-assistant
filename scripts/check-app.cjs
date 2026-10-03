const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHarness, html, scripts } = require('./app-harness.cjs');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const artifactDir = process.env.CA_CHECK_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'congregation-check-'));
fs.mkdirSync(artifactDir, { recursive: true });
let passed = 0;
async function test(name, run) { await run(); passed++; console.log('PASS', name); }
(async () => {
    const h = createHarness(), { window: w, elements: el } = h;
    const quietRender = () => { for (const name of ['renderPublishers','renderGroups','renderDashboard','renderAttendance','renderAnalytics']) w.ui[name] = () => {}; };
    await test('inline JavaScript parses and both application scripts initialize', () => {
        assert.equal(scripts.length, 2); for (const script of scripts) new Function(script[2]);
        assert.equal(typeof w.initMidweekScheduler, 'function'); assert.equal(typeof w.db.initAdmin, 'function');
    });
    await test('static IDs are unique, button handlers and referenced dialogs exist', () => {
        const ids = [...h.markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
        assert.equal(new Set(ids).size, ids.length);
        const calls = [...html.matchAll(/window\.(ui|db|auth)\.(\w+)\s*\(/g)];
        for (const match of calls) assert.equal(typeof w[match[1]][match[2]], 'function', match[1] + '.' + match[2]);
        for (const match of html.matchAll(/(?:openModal|closeModal)\('([^']+)'/g)) assert(el.has(match[1]), match[1]);
    });
    await test('missing CDN library leaves application controls available', () => {
        const offline = createHarness({ cloudAvailable: false });
        assert.equal(typeof offline.window.ui.openModal, 'function');
        assert.equal(typeof offline.window.db.saveReport, 'function');
    });
    await test('all seven themes persist and invalid themes use the default', () => {
        for (const theme of ['default','blue','green','crimson','scheduler','light','dark']) { w.ui.applyTheme(theme); assert.equal(h.document.body.dataset.theme, theme); assert.equal(h.localStorage.getItem('ca_theme'), theme); }
        w.ui.applyTheme('unknown'); assert.equal(h.document.body.dataset.theme, 'default');
    });
    await test('scheduler navigation, assignment controls, roster and sharing run without missing DOM targets', () => {
        w.currentCongId = 'test'; w.initMidweekScheduler();
        el.get('nextWeek').onclick(); el.get('prevWeek').onclick(); el.get('todayBtn').onclick(); el.get('previewBtn').onclick();
        el.get('autoTop').onclick(); el.get('autoRemaining').onclick();
        w.openAssign('BibleReading'); w.closeAssignModal();
        w.openPersonModal(); el.get('cancelPerson').onclick();
        el.get('publishWeekBtn').onclick(); assert(el.get('liveLinkInput').value.includes('#live='));
        w.clearAssignment('BibleReading'); assert.match(el.get('mwsToast').textContent, /cleared/);
        assert(h.localStorage.keys().some(k => k.startsWith('ca_midweek_test_')));
        w.currentCongId = 'other'; w.initMidweekScheduler(); el.get('autoTop').onclick();
        assert(h.localStorage.keys().some(k => k.startsWith('ca_midweek_other_')));
    });
    await test('core data screens render names and groups containing quotes and markup', () => {
        w.currentCongId='test';w.db.publishers=[{id:'p1',name:'Sam <Junior> & "Jr"',group:'South "A" & O\'Brien',dob:'1990-01-01'}];w.db.reports=[];
        for(const name of ['renderPublishers','renderGroups','renderDashboard','renderAnalytics','renderDetailedRoster','renderEmergencyContacts']) w.ui[name]();
        assert(el.get('publisher-table-body').innerHTML.includes('Sam &lt;Junior&gt; &amp; &quot;Jr&quot;'));
        assert(el.get('groups-sidebar').innerHTML.includes('O&#39;Brien'));
    });
    await test('inline action arguments preserve apostrophes, quotes and backslashes', () => {
        const decode = value=>value.replace(/&(amp|lt|gt|quot|#39);/g,(_,entity)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[entity]));
        for(const value of ['South "A" & O\'Brien','Name <Junior>','Path \\ folder','Literal &quot; text']) assert.equal(new Function('return '+decode(w.ui.jsArg(value)))(),value);
    });
    quietRender(); w.currentCongId = 'test';
    await test('rejected and thrown publisher/report writes preserve previous data', async () => {
        w.db.publishers = [{ id: 'p1', name: 'Original' }]; w.db.reports = [{ id: 'p1_2026_8', pubId: 'p1', serviceYear: 2026, month: 8, hours: 2 }];
        h.setCloud({ error: new Error('RLS denied') });
        await assert.rejects(w.db.savePublisher({ id: 'p1', name: 'Changed' }), /RLS denied/);
        await assert.rejects(w.db.saveReport({ pubId: 'p1', serviceYear: 2026, month: 8, hours: 99 }), /RLS denied/);
        assert.equal(w.db.publishers[0].name, 'Original'); assert.equal(w.db.reports[0].hours, 2);
        h.setCloud({}, new Error('Network lost'));
        await assert.rejects(w.db.savePublisher({ id: 'new', name: 'New' }), /Network lost/); assert.equal(w.db.publishers.length, 1);
        await assert.rejects(w.db.saveReport({ pubId: 'p1', serviceYear: 2026, month: 9, hours: 4 }), /Network lost/); assert.equal(w.db.reports.length, 1);
        assert.equal(w.db.syncState, 'error'); h.setCloud({ data: [], error: null });
    });
    await test('successful saves update both records and scoped local cache', async () => {
        await w.db.savePublisher({ id: 'p1', name: 'Saved' });
        await w.db.saveReport({ pubId: 'p1', serviceYear: 2026, month: 8, hours: 4, studies: 1 });
        assert.equal(w.db.publishers[0].name, 'Saved'); assert.equal(w.db.reports[0].hours, 4);
        assert.match(h.localStorage.getItem('ca_cache_publishers_test'), /Saved/);
        await assert.rejects(w.db.saveReport({ pubId: 'p1', serviceYear: 2026, month: 8, hours: -1 }), /negative/);
    });
    await test('CSV roundtrip handles quotes, commas and multiline fields', () => {
        const cells = ['Alex "A" Smith','One, two','Line one\nLine two',''];
        assert.deepEqual(w.AppSupport.parseCSV(cells.map(w.AppSupport.csvCell).join(',') + '\r\n')[0], cells);
        assert.throws(() => w.AppSupport.parseCSV('Name\n"unfinished'), /unclosed/);
    });
    await test('contact imports preserve emergency details and do not commit rejected batches', async () => {
        w.db.publishers = [{ id: 'p1', name: 'Saved', address: 'Keep this address', emergencyPhone: '555123' }];
        const csv = 'Name,Phone\nSaved,"123,456"';
        const event = () => ({ target: { files: [{ text: async () => csv }], value: 'selected' } });
        h.setCloud({ error: new Error('Import denied') });
        await assert.rejects(w.db.importContacts(event()), /Import denied/); assert.equal(w.db.publishers[0].phone, undefined);
        h.setCloud({ error: null }); await w.db.importContacts(event());
        assert.equal(w.db.publishers[0].phone, '123,456'); assert.equal(w.db.publishers[0].address, 'Keep this address'); assert.equal(w.db.publishers[0].emergencyPhone, '555123');
    });
    await test('report imports handle multiline remarks and reject invalid numbers atomically', async () => {
        const csv = 'Publisher Name,Service Year,Month,Shared In Ministry,Studies,Hours,Remarks,Is Auxiliary Pioneer\nSaved,2026,September,TRUE,1,5,"A quote ""here""\nand a line",FALSE';
        const event = text => ({ target: { files: [{ text: async () => text }], value: '' } });
        await w.db.importReports(event(csv)); assert.equal(w.db.reports[0].comments, 'A quote "here"\nand a line');
        await assert.rejects(w.db.importReports(event(csv.replace(',1,5,', ',1,-5,'))), /invalid/); assert.equal(w.db.reports[0].hours, 5);
    });
    await test('previous reporting month is correct on March 31 and January 1', () => {
        for (const [value, month, year] of [['2026-03-31T12:00:00Z',1,2026],['2026-01-01T12:00:00Z',11,2025]]) {
            class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [value])); } }
            const fixture = createHarness({ date: FixedDate }); const info = fixture.window.utils.getISTPreviousMonthInfo(); assert.equal(info.month,month); assert.equal(info.year,year);
        }
    });
    await test('attendance rejects negative counts and keeps local data after a network error', async () => {
        el.get('att-year').value = '2026'; el.get('att-month').value = '8';
        for (let week=1;week<=5;week++) for (const meeting of ['mid','end']) {
            // These inputs are generated by renderAttendance, so fixture them for this test.
            const base = el.get('pub-att-mid-type'); const input = el.get('pub-att-mid-val');
            el.set(`att-w${week}-${meeting}-type`,{...base,value:'count'}); el.set(`att-w${week}-${meeting}-val`,{...input,value:''});
        }
        el.get('att-w1-mid-val').value = '-1'; await assert.rejects(w.db.saveAttendance(), /whole numbers/);
        el.get('att-w1-mid-val').value = '123'; w.db.attendance = [{ id:'test_2026_8',w1_mid:'50' }];
        h.setCloud({},new Error('Lost connection')); await assert.rejects(w.db.saveAttendance(), /Lost connection/); assert.equal(w.db.attendance[0].w1_mid,'50');
        h.setCloud({error:null});await w.db.saveAttendance();assert.equal(w.db.attendance[0].w1_mid,'123'); assert.match(h.localStorage.getItem('ca_cache_attendance_test'), /123/);
    });
    await test('public attendance updates only entered fields and preserves other weeks', async () => {
        el.get('pub-att-year').value='2026';el.get('pub-att-month').value='8';el.get('pub-att-week').value='1';
        el.get('pub-att-mid-type').value='count';el.get('pub-att-mid-val').value='99';el.get('pub-att-end-type').value='count';el.get('pub-att-end-val').value='';
        const record={id:'test_2026_8',w1_end:'100',w2_mid:'70'};
        h.setCloud(call=>call.operations.some(op=>op[0]==='select')?{data:record,error:null}:{error:null});
        await w.db.savePublicAttendance();
        const last=h.calls.at(-1),update=last.operations.find(op=>op[0]==='update');assert.deepEqual(update[1],{w1_mid:'99'});
        assert.equal(w.db.attendance[0].w1_end,'100');assert.equal(w.db.attendance[0].w2_mid,'70'); h.setCloud({error:null});
    });
    await test('changing congregation clears unscoped in-memory records', () => {
        w.currentCongId='no-cache';w.db.restoreLocalCaches(); assert.equal(w.db.publishers.length,0);assert.equal(w.db.reports.length,0);assert.equal(w.db.attendance.length,0);w.currentCongId='test';
    });
    await test('busy action wrappers block double clicks and recover from rejection', async () => {
        const button=el.get('auth-btn');button.disabled=false;
        let count=0,resolve; const owner={action:()=>{count++;return new Promise(r=>resolve=r);}};
        w.AppSupport.protectAction(owner,'action','auth-btn'); const first=owner.action(),second=owner.action();assert.equal(first,second);await Promise.resolve();assert.equal(count,1);resolve();await first;assert.equal(button.disabled,false);
        owner.failure=()=>{throw new Error('Action failed');};w.AppSupport.protectAction(owner,'failure','auth-btn');await owner.failure();await owner.failure();assert.equal(button.disabled,false);assert.equal(h.messages.at(-1).type,'error');
    });
    await test('large tables render one bounded page and preserve or reset pagination correctly', () => {
        const target=h.document.createElement('tbody'), rows=Array.from({length:123},(_,i)=>`<tr><td>${i}</td></tr>`);
        let writes=0, contents='';Object.defineProperty(target,'innerHTML',{get:()=>contents,set:v=>{writes++;contents=v;}});
        w.AppSupport.renderRows(target,rows,{key:'first'});assert.equal(writes,1);assert.equal((contents.match(/<tr>/g)||[]).length,50);
        const pager=target.adjacentElements[0];assert.equal(pager.children[0].disabled,true);pager.children[2].onclick();assert.match(contents,/>50</);assert.doesNotMatch(contents,/>0</);
        w.AppSupport.renderRows(target,rows,{key:'first'});assert.match(contents,/>50</);
        w.AppSupport.renderRows(target,rows,{key:'changed'});assert.match(contents,/>0</);
        w.AppSupport.renderRows(target,rows.slice(0,2));assert.equal(pager.isConnected,false);assert.equal((contents.match(/<tr>/g)||[]).length,2);
    });
    await test('attendance drafts survive redraws, stay within their month, and clear on save', () => {
        const draft=createHarness(),dw=draft.window,de=draft.elements;
        dw.currentCongId='draft';de.get('att-year').value='2026';de.get('att-month').value='8';
        const type=draft.document.createElement('select'),value=draft.document.createElement('input');
        type.id='att-w1-mid-type';value.id='att-w1-mid-val';type.value='count';value.value='127';de.set(type.id,type);de.set(value.id,value);
        dw.ui.renderAttendance=()=>{type.value='count';value.value='10';};dw.ui.toggleAttEdit=()=>{};
        dw.AppSupport.init({cloudAvailable:true});draft.events.get('document:input')({target:value});
        dw.ui.renderAttendance();assert.equal(value.value,'127');de.get('att-month').value='9';dw.ui.renderAttendance();assert.equal(value.value,'10');
        de.get('att-month').value='8';dw.ui.renderAttendance();assert.equal(value.value,'127');dw.AppSupport.clearAttendanceDraft('draft_2026_8');dw.ui.renderAttendance();assert.equal(value.value,'10');
    });
    await test('closing hidden dialogs releases mobile scroll locks and cancels delayed focus', () => {
        const modal=h.document.createElement('div'), input=h.document.createElement('input'), previous=h.document.createElement('button');
        modal.querySelector=()=>input;h.document.activeElement=previous;w.AppSupport.dialogOpened(modal);
        assert(h.document.body.classList.contains('ca-dialog-open'));modal.classList.add('hidden');w.AppSupport.reconcileDialogs();
        assert.equal(h.document.body.classList.contains('ca-dialog-open'),false);h.timers.at(-1).callback();assert.equal(h.document.activeElement,previous);
    });
    await test('continuous touch activity avoids repeated synchronous storage writes', () => {
        h.sessionStorage.setItem('fs_auth','true');w.auth.lastActivityWritten=0;let writes=0;
        const original=h.sessionStorage.setItem;h.sessionStorage.setItem=(...args)=>{writes++;return original(...args);};
        try{for(let i=0;i<1000;i++)w.auth.touchActivity();assert.equal(writes,1);assert.equal(w.auth.expireIfIdle(),false);}finally{h.sessionStorage.setItem=original;}
    });
    await test('PDF text fitting stays within fields and unsupported scripts fail clearly', async () => {
        const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
        const fitted=w.PdfTools.fit('Long congregation '.repeat(20),font,128,8.5,6.5);assert(fitted.width<=128);assert(fitted.size>=6.5);
        for (const line of w.PdfTools.wrap('LongAddressWithoutSpaces'.repeat(10),font,100,8.5)) assert(font.widthOfTextAtSize(line,8.5)<=100);
        assert.throws(()=>w.PdfTools.fit('தமிழ்',font,100),/Unicode font/);
    });
    await test('S-21 preserves long remarks on continuation pages and service-year order', async () => {
        w.db.reports=Array.from({length:12},(_,month)=>({id:'r'+month,pubId:'p1',serviceYear:2026,month,hours:month+1,studies:2,comments:month===8?'Long remark '.repeat(35):'',sharedInMinistry:true}));
        const bytes=await w.__exports.s21([{id:'p1',name:'Alexandra Catherine Montgomery-Wellington',dob:'1986-05-17',baptized:'2000-01-19',gender:'Female',hope:'Other Sheep',isRP:true}],2026);
        const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);assert(Math.abs(pdf.getPage(0).getHeight()-420.95)<1);
        fs.writeFileSync(path.join(artifactDir,'s21.pdf'),bytes);
    });
    await test('S-3 generates with long names and meeting-event markers', async () => {
        w.db.attendance=[{id:'test_2026_8',service_year:2026,month:8,w1_mid:'100',w1_end:'115',w2_mid:'RC',w2_end:'123'}];
        const bytes=await w.__exports.s3(2026,8,'A very long congregation name that should stay inside its field');
        assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);fs.writeFileSync(path.join(artifactDir,'s3.pdf'),bytes);
    });
    await test('S-88 export generates and restores its button', async () => {
        el.get('att-year').value='2026';el.get('att-print88-btn').innerHTML='Download S-88';el.get('att-print88-btn').disabled=false;
        let blob;const originalURL=URL.createObjectURL;URL.createObjectURL=value=>{blob=value;return 'blob:test';};
        try{await w.ui.printS88();}finally{URL.createObjectURL=originalURL;}
        assert(blob);const bytes=await blob.arrayBuffer();assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);fs.writeFileSync(path.join(artifactDir,'s88.pdf'),Buffer.from(bytes));assert.equal(el.get('att-print88-btn').innerHTML,'Download S-88');assert.equal(el.get('att-print88-btn').disabled,false);
    });
    await test('emergency PDF paginates large families and extremely long addresses', async () => {
        const members=Array.from({length:36},(_,i)=>({id:'p'+i,name:'Publisher '+i,phone:'123456789',address:i===0?'A long address '.repeat(130):'17 Example Street',emergencyName:'Emergency Contact',emergencyRelationship:'Family member',emergencyPhone:'987654321',spiritualStatus:'Baptised'}));
        const bytes=await w.PdfTools.emergency([{headName:'Example',members}],'Example congregation');const pdf=await PDFDocument.load(bytes);assert(pdf.getPageCount()>=3);
        for(const page of pdf.getPages()){assert(Math.abs(page.getWidth()-841.89)<1);assert(Math.abs(page.getHeight()-595.28)<1);}fs.writeFileSync(path.join(artifactDir,'emergency.pdf'),bytes);
    });
    console.log(`\n${passed} checks passed. PDF samples: ${artifactDir}`);
})().catch(error=>{console.error(error);process.exitCode=1;});
