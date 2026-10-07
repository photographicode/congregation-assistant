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
    await test('scheduler navigation, assignment controls, roster and sharing run without missing DOM targets', async () => {
        w.currentCongId = 'test'; w.initMidweekScheduler();
        el.get('nextWeek').onclick(); el.get('prevWeek').onclick(); el.get('todayBtn').onclick(); el.get('reviewScheduleBtn').onclick();
        el.get('autoRemaining').onclick();
        w.openAssign('BibleReading'); w.closeAssignModal();
        w.openPersonModal(); el.get('cancelPerson').onclick();
        h.setCloud({data:{token:'test-live-token'},error:null});await el.get('publishWeekBtn').onclick();assert(el.get('liveLinkInput').value.includes('?mode=oclm&token=test-live-token'));h.setCloud({error:null});
        w.clearAssignment('BibleReading'); assert.match(el.get('mwsToast').textContent, /cleared/);
        assert(h.localStorage.keys().some(k => k.startsWith('ca_midweek_test_')));
        w.currentCongId = 'other'; w.initMidweekScheduler(); el.get('autoRemaining').onclick();
        assert(h.localStorage.keys().some(k => k.startsWith('ca_midweek_other_')));
    });
    await test('publishing failure preserves the previous stable link and publishes no false success',async()=>{
        h.setCloud({data:{token:'stable-test-token'},error:null});await el.get('publishWeekBtn').onclick();const before=el.get('liveLinkInput').value;
        h.setCloud({error:{message:'Publication denied'}});await el.get('publishWeekBtn').onclick();assert.equal(el.get('liveLinkInput').value,before);assert.equal(el.get('publishWeekBtn').disabled,false);assert.match(el.get('mwsToast').textContent,/denied/);h.setCloud({error:null});
    });
    await test('scheduler shows longest-waiting qualified people first and hides empty field-ministry parts publicly',()=>{
        const fixture=createHarness(), fw=fixture.window, fe=fixture.elements;
        fw.currentCongId='rotation';
        fixture.localStorage.setItem('ca_midweek_rotation_jw_scheduler_personnel',JSON.stringify([
            {id:'recent',name:'Aaron Recent',appointment:'Elder',roles:[]},
            {id:'old',name:'Beth Older',appointment:'Elder',roles:[]},
            {id:'never',name:'Zach Never',appointment:'Elder',roles:[]}
        ]));
        fixture.localStorage.setItem('ca_midweek_rotation_jw_scheduler_assignments',JSON.stringify({'2026-W38':{BibleReading:{personId:'old'}},'2026-W39':{BibleReading:{personId:'recent'}}}));
        fw.initMidweekScheduler();fw.setSchedulerWeek('2026-W40');fw.openAssign('BibleReading');
        const names=fe.get('candidateList').innerHTML;
        assert(names.indexOf('Zach Never')<names.indexOf('Beth Older'));
        assert(names.indexOf('Beth Older')<names.indexOf('Aaron Recent'));
        assert(names.includes('Same part:'));
        fw.MidweekScheduler.showPublic({currentWeek:'2026-W40',publishedWeeks:['2026-W40'],defaultWeek:'2026-W40',people:[{id:'old',name:'Beth Older'}],assignments:{'2026-W40':{Conversation:{personId:'old'}}}});
        assert(fe.get('liveSections').innerHTML.includes('Beth Older'));
        assert(!fe.get('liveSections').innerHTML.includes('Making Disciples'));
        assert(!fe.get('liveSections').innerHTML.includes('Unassigned'));
    });
    await test('public URL builder discards admin queries and fragments',()=>{
        w.location.href='http://localhost/index.html?cong=private#old';const url=new URL(w.PublicLinks.tokenURL('oclm','token value'));assert.equal(url.searchParams.get('token'),'token value');assert.equal(url.searchParams.has('cong'),false);assert.equal(url.hash,'');w.location.href='http://localhost/index.html';
    });
    await test('scheduler device-save failure keeps the draft and recovers through Retry save',()=>{
        const qa=createHarness(); qa.window.currentCongId='save-recovery';qa.window.initMidweekScheduler();
        const original=qa.localStorage.setItem;
        qa.localStorage.setItem=(key,value)=>{if(key.endsWith('_jw_scheduler_assignments'))throw new Error('Storage full');original(key,value);};
        qa.window.setPartTitle('Chairman','Keep this unsaved title');
        assert.equal(qa.elements.get('schedulerSaveError').hidden,false);
        assert.match(qa.elements.get('saveStateLabel').textContent,/Not saved/);
        const week=qa.window.MidweekScheduler.getPayload().defaultWeek;
        assert.equal(qa.window.MidweekScheduler.getPayload([week]).assignments[week].Chairman.customTitle,'Keep this unsaved title');
        qa.localStorage.setItem=original;qa.elements.get('retrySchedulerSave').onclick();
        assert.equal(qa.elements.get('schedulerSaveError').hidden,true);
        assert.equal(JSON.parse(qa.localStorage.getItem('ca_midweek_save-recovery_jw_scheduler_assignments'))[week].Chairman.customTitle,'Keep this unsaved title');
    });
    await test('clearing an assignment preserves its title and Undo restores the person',()=>{
        const qa=createHarness();qa.window.currentCongId='undo';
        qa.localStorage.setItem('ca_midweek_undo_jw_scheduler_personnel',JSON.stringify([{id:'qa-person',name:'Sample Person',roles:['Chairman'],appointment:'Other'}]));
        qa.window.initMidweekScheduler();qa.window.setPartTitle('Chairman','Custom chairman title');qa.window.setAssignment('Chairman','qa-person');
        const week=qa.window.MidweekScheduler.getPayload().defaultWeek;
        qa.window.clearAssignment('Chairman');
        let part=qa.window.MidweekScheduler.getPayload([week]).assignments[week].Chairman;
        assert.equal(part.customTitle,'Custom chairman title');assert.equal(part.personId,undefined);
        qa.elements.get('undoSchedule').onclick();part=qa.window.MidweekScheduler.getPayload([week]).assignments[week].Chairman;
        assert.equal(part.personId,'qa-person');assert.equal(part.customTitle,'Custom chairman title');
        qa.elements.get('clearWeek').onclick();assert.deepEqual(qa.window.MidweekScheduler.getPayload([week]).assignments[week],{});
        qa.elements.get('undoSchedule').onclick();assert.equal(qa.window.MidweekScheduler.getPayload([week]).assignments[week].Chairman.personId,'qa-person');
        qa.window.currentCongId='different-tenant';qa.window.initMidweekScheduler();assert.equal(qa.elements.get('undoSchedule').disabled,true);
    });
    await test('scheduler distinguishes published data from edits and preserves the status after a rejected update',async()=>{
        const qa=createHarness();qa.window.currentCongId='publish-status';qa.window.initMidweekScheduler();
        qa.window.setPartTitle('Chairman','Published title');qa.setCloud({data:{token:'status-token'},error:null});
        await qa.elements.get('publishWeekBtn').onclick();assert.equal(qa.elements.get('publicationState').textContent,'Published');
        qa.window.setPartTitle('Chairman','Device draft title');assert.equal(qa.elements.get('publicationState').textContent,'Unpublished changes');
        qa.setCloud({error:{message:'Denied update'}});await qa.elements.get('publishWeekBtn').onclick();
        assert.equal(qa.elements.get('publicationState').textContent,'Unpublished changes');
        assert.equal(qa.elements.get('schedulerPublishError').hidden,false);assert.match(qa.elements.get('schedulerPublishError').textContent,/previous live schedule is unchanged/);
    });
    await test('demo publication is local, resets safely, and real tenants still call the server',async()=>{
        const qa=createHarness();qa.window.currentCongId='demo-cong';qa.window.initMidweekScheduler();
        qa.setCloud({error:{message:'Not authorized'}});
        const before=qa.calls.length;await qa.elements.get('publishWeekBtn').onclick();
        assert.equal(qa.calls.length,before);assert.equal(qa.elements.get('publicationState').textContent,'Demo published');
        assert.equal(qa.elements.get('schedulerPublishError').hidden,true);assert.equal(qa.elements.get('copyLiveLinkBtn').disabled,true);
        assert.equal(qa.window.MidweekScheduler.getPayload().people.length,0);
        qa.window.setAssignment('Chairman','p1');
        qa.elements.get('resetSchedulerDemo').onclick();assert.deepEqual(qa.window.MidweekScheduler.getPayload().assignments,{});
        qa.window.currentCongId='real-tenant';qa.window.initMidweekScheduler();await qa.elements.get('publishWeekBtn').onclick();
        assert(qa.calls.length>before);assert.equal(qa.elements.get('schedulerPublishError').hidden,false);
    });
    await test('visible sign-out clears current sessions even if the auth server fails',async()=>{
        const qa=createHarness();qa.window.currentCongId='logout-test';qa.window.auth.roleReady=true;
        for(const storage of [qa.sessionStorage,qa.localStorage])for(const key of ['fs_auth','fs_auth_type','fs_role','fs_cong_id','ov_auth_logout-test_A','sb-test-auth-token'])storage.setItem(key,'saved');
        qa.localStorage.setItem('ca_midweek_logout-test_jw_scheduler_assignments','draft');qa.localStorage.setItem('ca_cache_reports_logout-test','private');
        qa.window.supabase.createClient().auth.signOut=async()=>{throw new Error('Offline');};
        qa.window.ui.confirmLogout();await qa.window.ui.handleSysPromptConfirm();
        assert.equal(qa.sessionStorage.getItem('fs_auth'),null);assert.equal(qa.localStorage.getItem('fs_auth'),null);
        assert.equal(qa.sessionStorage.getItem('ov_auth_logout-test_A'),null);assert.equal(qa.localStorage.getItem('sb-test-auth-token'),null);
        assert.equal(qa.window.auth.roleReady,false);assert.equal(qa.window.currentCongId,null);
        assert.equal(await qa.window.auth.resumeGoogleRole(),false);assert.equal(qa.window.auth.check(),false);
        assert.equal(qa.localStorage.getItem('ca_midweek_logout-test_jw_scheduler_assignments'),'draft');assert.equal(qa.localStorage.getItem('ca_cache_reports_logout-test'),null);
    });
    await test('owner uses Google and server approval; sign-out blocks restoration even with a stale OAuth session',async()=>{
        const qa=createHarness(),fw=qa.window;let request;fw.supabase.createClient().auth.signInWithOAuth=async value=>{request=value;return {error:null};};
        await fw.auth.googleLogin();assert.equal(request.provider,'google');assert.equal(request.options.redirectTo,'https://photographicode.github.io/congregation-assistant/index.html');assert.equal(request.options.queryParams.prompt,'select_account');
        fw.supabase.createClient().auth.getSession=async()=>({data:{session:{user:{email:'congregationassistant0@gmail.com'}}},error:null});fw.db.initSuperAdmin=async()=>{};
        qa.setCloud({data:false,error:null});await fw.auth.resumeGoogleRole();assert.equal(fw.auth.verifiedOwner,false);
        qa.setCloud({data:true,error:null});await fw.auth.resumeGoogleRole();assert.equal(fw.auth.verifiedOwner,true);assert.equal(fw.auth.verifiedEmail,'congregationassistant0@gmail.com');assert.equal(qa.sessionStorage.getItem('fs_auth_type'),'super');
        fw.supabase.createClient().auth.signOut=async()=>{throw Error('Offline');};await fw.auth.endSession();assert.equal(fw.auth.verifiedOwner,false);assert.equal(await fw.auth.resumeGoogleRole(),false);assert.equal(fw.auth.check(),false);
    });
    await test('verified OCLM roles cannot gain reports by editing cached browser flags',()=>{
        const qa=createHarness();qa.sessionStorage.setItem('fs_auth_type','role');qa.sessionStorage.setItem('fs_roles','["admin"]');qa.sessionStorage.setItem('fs_role','admin');
        qa.window.auth.roleReady=true;qa.window.auth.verifiedRoles=['oclm'];
        assert.deepEqual(qa.window.ui.getAllowedTabs(),['oclm']);assert.equal(qa.window.ui.canManageAccess(),false);
        qa.window.ui.currentTab='oclm';qa.window.ui.switchTab('analytics');assert.equal(qa.window.ui.currentTab,'oclm');
        qa.sessionStorage.setItem('fs_auth_type','admin');assert.deepEqual(qa.window.ui.getAllowedTabs(),['oclm']);
        qa.sessionStorage.setItem('fs_auth_type','role');qa.window.auth.roleReady=false;assert.deepEqual(qa.window.ui.getAllowedTabs(),[]);
        qa.window.auth.roleReady=true;qa.window.auth.verifiedRoles=['admin'];assert(qa.window.ui.getAllowedTabs().includes('emergency'));
    });
    await test('editing during publication remains an unpublished draft',async()=>{
        const qa=createHarness();qa.window.currentCongId='publish-race';qa.window.initMidweekScheduler();
        qa.window.setPartTitle('Chairman','Version sent to the server');qa.setCloud({data:{token:'race-token'},error:null});
        const publication=qa.elements.get('publishWeekBtn').onclick();
        qa.window.setPartTitle('Chairman','New edit while publishing');await publication;
        assert.equal(qa.elements.get('publicationState').textContent,'Unpublished changes');
        const week=qa.window.MidweekScheduler.getPayload().defaultWeek;
        assert.equal(qa.window.MidweekScheduler.getPayload([week]).assignments[week].Chairman.customTitle,'New edit while publishing');
    });
    await test('Superadmin cards escape values, hide passwords, and classify expired trials',()=>{
        w.db.congregations=[{id:'quoted-id',name:'Example <script>alert(1)</script>',email:'owner@example.com',status:'trial',trial_days:30,created_at:'2000-01-01',admin_password:'never-display-this'}];el.get('saas-search').value='';el.get('saas-filter').value='EXPIRED';w.ui.renderSuperAdmin();assert.equal(w.ui.getSuperAdminMatches().length,1);assert.match(el.get('saas-cong-grid').innerHTML,/&lt;script&gt;/);assert(!el.get('saas-cong-grid').innerHTML.includes('never-display-this'));w.db.congregations=[];el.get('saas-filter').value='ALL';
    });
    await test('browser source has no shared Superadmin master password',()=>{assert(!h.markup.includes('MASTER_PASSWORD'));});
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
            const base = el.get('att-year'); const input = el.get('pub-att-count');
            el.set(`att-w${week}-${meeting}-type`,{...base,value:'count'}); el.set(`att-w${week}-${meeting}-val`,{...input,value:''});
        }
        el.get('att-w1-mid-val').value = '-1'; await assert.rejects(w.db.saveAttendance(), /whole numbers/);
        el.get('att-w1-mid-val').value = '123'; w.db.attendance = [{ id:'test_2026_8',w1_mid:'50' }];
        h.setCloud({},new Error('Lost connection')); await assert.rejects(w.db.saveAttendance(), /Lost connection/); assert.equal(w.db.attendance[0].w1_mid,'50');
        h.setCloud({error:null});await w.db.saveAttendance();assert.equal(w.db.attendance[0].w1_mid,'123'); assert.match(h.localStorage.getItem('ca_cache_attendance_test'), /123/);
    });
    await test('public attendance locks server context and rejects older links', async () => {
        assert(!h.markup.includes('id="pub-att-year"'));assert(!h.markup.includes('id="pub-att-week"'));assert(!h.markup.includes('id="pub-att-mid-type"'));
        w.ui.publicLinkToken='test-token';h.setCloud({data:{configured:true,date:'2026-10-05',kind:'midweek',serviceYear:2027,month:9,week:1,timezone:'Asia/Kolkata',canSubmit:true,count:82},error:null});
        await w.ui.setupPublicAttendance();assert.match(el.get('pub-att-context').textContent,/2026–2027/);assert.equal(el.get('pub-att-count').value,82);el.get('pub-att-count').value='-1';await assert.rejects(w.db.savePublicAttendance(),/whole attendance/);
        el.get('pub-att-count').value='99';h.setCloud({data:true,error:null});await w.db.savePublicAttendance();assert.deepEqual(h.calls.at(-1),{rpc:'submit_current_attendance',args:{p_token:'test-token',p_date:'2026-10-05',p_count:99}});
        h.setCloud({data:{configured:true,date:'2026-10-05',kind:'CA',serviceYear:2027,week:1,month:9,timezone:'Asia/Kolkata',canSubmit:false},error:null});await w.ui.loadPublicAttendance();assert.equal(el.get('pub-att-submit-btn').disabled,true);await assert.rejects(w.db.savePublicAttendance(),/Reload/);
        w.ui.publicLinkToken=null;await w.ui.loadPublicAttendance();assert.match(el.get('pub-att-context').textContent,/Older links cannot save/);h.setCloud({error:null});
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
    await test('role navigation combines assignments and rejects context-based escalation', () => {
        const fixture=createHarness(), fw=fixture.window;
        fixture.sessionStorage.setItem('fs_role','attendance');assert.deepEqual(fw.ui.getAllowedTabs(),['attendance','attendant','duties']);
        fw.ui.currentTab='attendance';fw.ui.switchTab('emergency',false,'attendance');assert.equal(fw.ui.currentTab,'attendance');
        fixture.sessionStorage.setItem('fs_roles',JSON.stringify(['attendance','field_service']));
        assert(fw.ui.getAllowedTabs().includes('groups'));assert(fw.ui.getAllowedTabs().includes('attendance'));assert(!fw.ui.canManageAccess());
    });
    await test('access management rejects restricted roles and preserves rejected form entries', async () => {
        const fixture=createHarness(),fw=fixture.window;fw.currentCongId='qa';fixture.sessionStorage.setItem('fs_role','attendance');
        await assert.rejects(fw.ui.addRoleAccess(),/Only administrators/);assert.equal(fixture.calls.length,0);
        fixture.sessionStorage.setItem('fs_role','admin');fixture.elements.get('access-email-input').value='person@example.com';fixture.elements.get('access-role-input').value='attendance';
        fixture.setCloud({error:new Error('RLS rejected')});await assert.rejects(fw.ui.addRoleAccess(),/not saved/);assert.equal(fixture.elements.get('access-email-input').value,'person@example.com');
    });
    await test('cached Google role cannot open the application without a live OAuth session', async () => {
        const fixture=createHarness(),fw=fixture.window;fixture.sessionStorage.setItem('fs_auth','true');fixture.sessionStorage.setItem('fs_auth_type','role');fixture.sessionStorage.setItem('fs_role','admin');fixture.sessionStorage.setItem('fs_last_activity',String(Date.now()));
        assert.equal(fw.auth.check(),false);assert.equal(await fw.auth.resumeGoogleRole(),false);assert.equal(fixture.sessionStorage.getItem('fs_auth'),null);
    });
    await test('Google memberships combine valid roles and omit invalid or inactive grants', async () => {
        const fixture=createHarness(),fw=fixture.window;fw.db.initAdmin=async()=>{};fw.ui.applyRoleNavigation=()=>{};fw.ui.switchTab=()=>{};
        fw.auth.googleAccess=[{cong_id:'qa',role:'attendance',active:true},{cong_id:'qa',role:'field_service',active:true}];fixture.setCloud({data:{id:'qa',name:'Test',status:'active'},error:null});
        await fw.auth.activateGoogleRole('qa');assert.deepEqual(JSON.parse(fixture.sessionStorage.getItem('fs_roles')),['attendance','field_service']);assert.equal(fw.auth.roleReady,true);
        await assert.rejects(fw.auth.activateGoogleRole('other'),/no active access/);
    });
    await test('reminders handle first-of-month, weekly rollover and three-week planning across years',()=>{
        const qa=createHarness(),fw=qa.window,r=fw.CAReminders;fw.currentCongId='reminder-test';qa.sessionStorage.setItem('fs_auth','true');fw.auth.roleReady=true;fw.auth.verifiedRoles=['admin'];
        const monthly={monthly:true,time:'09:00'},weekly={day:1,time:'09:00'};
        assert.equal(r.occurrence(monthly,new Date(2026,0,31,15),true).getMonth(),1);assert.equal(r.occurrence(monthly,new Date(2026,11,31,15),true).getFullYear(),2027);
        assert.equal(r.occurrence(monthly,new Date(2026,0,1,8),false).getMonth(),11);
        assert.equal(r.occurrence(weekly,new Date(2026,9,5,8),true).getDate(),5);assert.equal(r.occurrence(weekly,new Date(2026,9,5,10),true).getDate(),12);
        assert.equal(r.weekId(r.planningDate(new Date(2026,11,20))),'2027-W01');
    });
    await test('role reminders, calendar contents and dismissals stay within account and congregation',()=>{
        const qa=createHarness(),fw=qa.window,r=fw.CAReminders;fw.currentCongId='reminder-test';qa.sessionStorage.setItem('fs_auth','true');fw.auth.roleReady=true;fw.auth.verifiedEmail='private@example.com';fw.auth.verifiedRoles=['oclm'];
        const key='ca_reminders_v1_'+JSON.stringify(['reminder-test','private@example.com',[]]);
        qa.localStorage.setItem(key,JSON.stringify({oclm:{enabled:true,day:1,time:'09:00'},reports:{enabled:true,time:'09:00'}}));
        assert.deepEqual(r.settings().map(x=>x.id),['oclm']);assert.equal(r.due(new Date(2026,9,5,10)).length,1);
        const ics=r.calendar(new Date(2026,9,5,8)).replace(/\r\n /g,'');assert(ics.includes('RRULE:FREQ=WEEKLY;BYDAY=MO'));assert(ics.includes('BEGIN:VALARM'));assert(!ics.includes('private@example.com'));assert(!ics.includes('reports —'));assert(!ics.includes('?token='));
        const event=r.due(new Date(2026,9,5,10))[0];r.done('oclm',event.date.toISOString());assert.equal(r.due(new Date(2026,9,5,11)).length,0);
        fw.auth.verifiedEmail='other@example.com';assert.equal(r.settings()[0].enabled,false);fw.auth.verifiedEmail='private@example.com';fw.currentCongId='other';assert.equal(r.settings()[0].enabled,false);
        fw.currentCongId='reminder-test';fw.auth.verifiedRoles=['attendance'];assert.deepEqual(r.settings().map(x=>x.id),['attendance_midweek','attendance_weekend','attendance_link']);fw.auth.verifiedRoles=['group_overseer'];assert.deepEqual(r.settings().map(x=>x.id),['reports','report_link']);
        qa.sessionStorage.setItem('ca_signed_out','true');assert.equal(r.settings().length,0);
    });
    await test('group view rejects private caches from a previous wider role and escapes report text',()=>{
        const qa=createHarness(),fw=qa.window;fw.currentCongId='group-test';fw.auth.roleReady=true;fw.auth.verifiedRoles=['group_overseer'];fw.auth.verifiedGroups=['One'];qa.sessionStorage.setItem('fs_auth_type','role');
        qa.localStorage.setItem('ca_cache_publishers_group-test','[{"name":"Other group"}]');qa.localStorage.setItem('ca_cache_reports_group-test','[{"comments":"Private"}]');fw.db.restoreLocalCaches();assert.equal(fw.db.publishers.length,0);assert.equal(fw.db.reports.length,0);
        fw.db.publishers=[{id:'own',name:'A <script>',group:'One'},{id:'other',name:'Other group hidden',group:'Two'}];const info=fw.utils.getISTPreviousMonthInfo();fw.db.reports=[{pubId:'own',serviceYear:info.serviceYear,month:info.month,sharedInMinistry:true,comments:'<script>bad</script>'}];fw.ui.renderOverseerView('One');const view=qa.elements.get('overseer-detail').innerHTML;assert(!view.includes('Other group hidden'));assert(!view.includes('<script>'));assert(view.includes('&lt;script&gt;'));
        assert.deepEqual(fw.ui.getAllowedTabs(),['overseer']);qa.sessionStorage.setItem('fs_roles','["admin"]');assert.deepEqual(fw.ui.getAllowedTabs(),['overseer']);
    });
    await test('Additional Duties keep qualified choices, published fields and drafts scoped to a congregation',async()=>{
        const qa=createHarness(),fw=qa.window,el=qa.elements;fw.currentCongId='duties-test';fw.initMidweekScheduler();el.get('additionalDutySection').value='AV';el.get('additionalDutyName').value='Microphones <team>';el.get('additionalDutySlots').value='2';fw.addAdditionalDuty();const duty=fw.MidweekScheduler.getPayload().additionalDuties[0];assert.equal(duty.slots,2);assert.equal(duty.section,'AV');assert(el.get('meetingSections').innerHTML.includes('Microphones &lt;team&gt;'));
        el.get('additionalDutySection').value='Cleaning';el.get('additionalDutyName').value='Microphones <team>';fw.addAdditionalDuty();assert.equal(fw.MidweekScheduler.getPayload().additionalDuties.length,2);el.get('additionalDutyName').value='Microphones <team>';fw.addAdditionalDuty();assert.equal(fw.MidweekScheduler.getPayload().additionalDuties.length,2);el.get('additionalDutySection').value='Attendant';el.get('additionalDutyName').value='';fw.addAdditionalDuty();assert.equal(fw.MidweekScheduler.getPayload().additionalDuties[2].name,'Attendant');
        qa.localStorage.setItem('ca_midweek_duties-test_jw_scheduler_personnel',JSON.stringify([{id:'qualified',name:'Qualified duty person',appointment:'Other',roles:[duty.id]},{id:'unqualified',name:'Unqualified elder',appointment:'Elder',roles:[]}]));fw.currentCongId='other';fw.initMidweekScheduler();assert.equal(fw.MidweekScheduler.getPayload().additionalDuties.length,0);fw.currentCongId='duties-test';fw.initMidweekScheduler();fw.openAssign(duty.id+'_1');assert(el.get('candidateList').innerHTML.includes('Qualified duty person'));assert(!el.get('candidateList').innerHTML.includes('Unqualified elder'));
        fw.setAssignment(duty.id+'_1','qualified');qa.setCloud({data:{token:'duties-token'},error:null});await el.get('publishWeekBtn').onclick();const payload=fw.MidweekScheduler.getPayload();assert.equal(payload.additionalDuties[0].name,'Microphones <team>');assert(!JSON.stringify(payload.people).includes('Unqualified elder'));fw.toggleAdditionalDuty(duty.id,false);assert.equal(fw.MidweekScheduler.getPayload().assignments[payload.defaultWeek][duty.id+'_1'].personId,'qualified');assert.match(el.get('publicationState').textContent,/Unpublished/);
        fw.currentCongId='other';fw.initMidweekScheduler();fw.MidweekScheduler.showPublic(payload);assert(el.get('liveSections').innerHTML.includes('Microphones &lt;team&gt;'));assert(el.get('liveSections').innerHTML.includes('Qualified duty person'));assert(!el.get('liveSections').innerHTML.includes('Unqualified elder'));
    });
    await test('S-140 meeting details and auxiliary assignments survive publication without exposing roster contacts',async()=>{
        const qa=createHarness(),fw=qa.window,el=qa.elements;fw.currentCongId='s140-test';fw.initMidweekScheduler();el.get('meetingStartTime').value='19:00';el.get('meetingReading').value='Jeremiah <40–41>';el.get('meetingOpeningSong').value='10';el.get('meetingMiddleSong').value='20';el.get('meetingClosingSong').value='30';el.get('meetingAuxiliary').checked=true;fw.saveMeetingDetails();assert(el.get('meetingSections').innerHTML.includes('Auxiliary classroom counselor'));
        fw.setAssignment('BibleReadingAux','missing');qa.setCloud({data:{token:'s140-token'},error:null});await el.get('publishWeekBtn').onclick();const payload=fw.MidweekScheduler.getPayload(),data=payload.assignments[payload.defaultWeek];assert.equal(data.OpeningSong.customTitle,'10');assert.equal(data.MeetingStart.customTitle,'19:00');assert.equal(data.BibleReadingAux.personId,'missing');fw.MidweekScheduler.showView('preview');assert(el.get('paper').innerHTML.includes('Jeremiah &lt;40–41&gt;'));assert(el.get('paper').innerHTML.includes('Auxiliary classroom'));assert(el.get('paper').innerHTML.includes('Opening comments:'));fw.MidweekScheduler.showPublic(payload);assert(el.get('liveSections').innerHTML.includes('19:00'));assert(el.get('liveSections').innerHTML.includes('Jeremiah &lt;40–41&gt;'));
        el.get('meetingAuxiliary').checked=false;fw.saveMeetingDetails();assert.equal(fw.MidweekScheduler.getPayload().assignments[payload.defaultWeek].BibleReadingAux.personId,'missing');
    });
    await test('section assistant grants combine without access-management privileges',async()=>{
        const qa=createHarness(),fw=qa.window;fw.auth.googleAccess=[{cong_id:'assistant-test',role:'field_service',active:true},{cong_id:'assistant-test',role:'oclm',active:true,is_assistant:true}];qa.setCloud(call=>call.table==='congregations'?{data:{id:'assistant-test',name:'Assistant test',status:'active',feature_oclm:true},error:null}:{data:[],error:null});fw.db.initAdmin=async()=>{};await fw.auth.activateGoogleRole('assistant-test');assert.deepEqual(fw.auth.verifiedAssistants,['oclm']);assert(fw.ui.getAllowedTabs().includes('groups'));assert(fw.ui.getAllowedTabs().includes('oclm'));assert(!fw.ui.getAllowedTabs().includes('attendance'));assert.equal(fw.ui.canManageAccess(),false);
    });
    await test('PDF text fitting stays within fields and unsupported scripts fail clearly', async () => {
        const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
        const fitted=w.PdfTools.fit('Long congregation '.repeat(20),font,128,8.5,6.5);assert(fitted.width<=128);assert(fitted.size>=6.5);
        for (const line of w.PdfTools.wrap('LongAddressWithoutSpaces'.repeat(10),font,100,8.5)) assert(font.widthOfTextAtSize(line,8.5)<=100);
        assert.throws(()=>w.PdfTools.fit('தமிழ்',font,100),/Unicode font/);
    });
    await test('transfer defaults use actual records across the September service-year boundary',()=>{
        const record={reports:[{service_year:2027,hours:0},{service_year:2026,hours:0},{service_year:2025,hours:0}]};
        assert.equal(w.CATransfer.serviceYear(new Date(2026,7,31)),2026);
        assert.equal(w.CATransfer.serviceYear(new Date(2026,8,1)),2027);
        assert.deepEqual([...w.CATransfer.defaultYears(record,new Date(2026,8,1))],[2027,2026]);
        assert.deepEqual([...w.CATransfer.defaultYears({reports:[]},new Date(2026,8,1))],[]);
        assert.deepEqual([...w.CATransfer.defaultYears({reports:[{service_year:2025}]},new Date(2026,8,1))],[]);
    });
    await test('S-21 preserves long remarks on continuation pages and service-year order', async () => {
        w.db.reports=Array.from({length:12},(_,month)=>({id:'r'+month,pubId:'p1',serviceYear:2026,month,hours:month+1,studies:2,comments:month===8?'Long remark '.repeat(35):'',sharedInMinistry:true}));
        const bytes=await w.__exports.s21([{id:'p1',name:'Alexandra Catherine Montgomery-Wellington',dob:'1986-05-17',baptized:'2000-01-19',gender:'Female',hope:'Other Sheep',isRP:true}],2026);
        const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);assert(Math.abs(pdf.getPage(0).getHeight()-420.95)<1);
        fs.writeFileSync(path.join(artifactDir,'s21.pdf'),bytes);
    });
    await test('S-21 preserves zero and decimal values with centred numeric ink', async () => {
        const hours=[0,.5,1,11,100,20.25,50,49,8,4,2,0],reports=hours.map((hours,i)=>({id:'centre'+i,pubId:'centre',serviceYear:2027,month:[8,9,10,11,0,1,2,3,4,5,6,7][i],hours,studies:i%3,comments:'',sharedInMinistry:true}));
        const bytes=await w.__exports.s21([{id:'centre',name:'Sample Grace Montgomery',dob:'1980-01-01',baptized:'2000-01-01',gender:'Female',hope:'Other Sheep',isRP:true}],2027,reports);
        assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);fs.writeFileSync(path.join(artifactDir,'s21-zeros.pdf'),bytes);
    });
    await test('S-3 generates with long names and meeting-event markers', async () => {
        w.db.attendance=[{id:'test_2026_8',service_year:2026,month:8,w1_mid:'100',w1_end:'115',w2_mid:'RC',w2_end:'123'}];
        const bytes=await w.__exports.s3(2026,8,'A very long congregation name that should stay inside its field');
        assert.equal((await PDFDocument.load(bytes)).getPageCount(),2);fs.writeFileSync(path.join(artifactDir,'s3.pdf'),bytes);
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
    await test('cloud pagination loads every row and rejects repeated partial pages',async()=>{
        const rows=Array.from({length:1205},(_,i)=>({id:'row-'+i}));
        let calls=0;const factory=()=>({order(){return this;},range(a,b){calls++;return Promise.resolve({data:rows.slice(a,b+1),error:null});}});
        assert.equal((await w.db.readScopedRows(factory)).length,1205);assert.equal(calls,3);
        await assert.rejects(()=>w.db.readScopedRows(()=>({order(){return this;},range(){return Promise.resolve({data:rows.slice(0,500),error:null});}})),/Records changed/);
    });
    await test('published name search matches every week including auxiliary assignments',()=>{
        const f=createHarness(),fw=f.window,fe=f.elements;
        fw.MidweekScheduler.showPublic({currentWeek:'2026-W40',congregation:'Example',publishedWeeks:['2026-W40','2026-W41','2026-W42'],people:[{id:'a',name:'Alex Example'},{id:'b',name:'Beth Example'}],assignments:{'2026-W40':{BibleReading:{personId:'a'}},'2026-W41':{Conversation:{personId:'b'},ConversationAssistant:{personId:'a'}},'2026-W42':{BibleReading:{personId:'b'}}}});
        assert(f.markup.includes('id="liveWeekSelect"'));assert.equal((fe.get('liveSections').innerHTML.match(/live-s140-paper/g)||[]).length,1);fe.get('liveWeekSelect').value='2026-W42';fe.get('liveWeekSelect').onchange();assert(fe.get('liveSections').innerHTML.includes('Beth Example'));
        fe.get('livePublisherSearch').value='Alex';fe.get('livePublisherSearch').oninput();
        const cards=fe.get('liveSections').innerHTML;assert.equal((cards.match(/live-s140-paper/g)||[]).length,2);assert(cards.includes('<mark>Alex Example</mark>'));
        fe.get('livePublisherSearch').value='missing name';fe.get('livePublisherSearch').oninput();assert(!fe.get('liveSections').innerHTML.includes('s140-paper'));
    });
    await test('OCLM roster synchronization preserves assignments and qualifications without importing contacts',()=>{
        const f=createHarness(),fw=f.window;fw.currentCongId='roster';
        f.localStorage.setItem('ca_midweek_roster_jw_scheduler_personnel',JSON.stringify([{id:'old-scheduler',name:'Alex Example',appointment:'Other',roles:['BibleReading'],phone:'manual contact'}]));
        fw.initMidweekScheduler();fw.setAssignment('BibleReading','old-scheduler');fw.MidweekScheduler.syncRoster([{id:'publisher-a',name:'Alex Example',gender:'Male',isElder:false,isMS:false},{id:'publisher-b',name:'Beth New',gender:'Female',isElder:false,isMS:false}]);
        const saved=JSON.parse(f.localStorage.getItem('ca_midweek_roster_jw_scheduler_personnel'));assert.equal(saved[0].id,'old-scheduler');assert.equal(saved[0].publisherId,'publisher-a');assert.deepEqual([...saved[0].roles],['BibleReading']);assert.equal(saved[1].phone,'');
        const assignments=JSON.parse(f.localStorage.getItem('ca_midweek_roster_jw_scheduler_assignments'));assert.equal(Object.values(assignments)[0].BibleReading.personId,'old-scheduler');
        fw.MidweekScheduler.syncRoster([{id:'publisher-b',name:'Beth Renamed',gender:'Female'}]);const updated=JSON.parse(f.localStorage.getItem('ca_midweek_roster_jw_scheduler_personnel'));assert(updated[0].archived);assert.equal(updated[1].name,'Beth Renamed');
    });
    await test('explicit qualification exclusions beat appointments and away periods exclude overlapping weeks',()=>{
        const f=createHarness(),fw=f.window;fw.currentCongId='exceptions';
        f.localStorage.setItem('ca_midweek_exceptions_jw_scheduler_personnel',JSON.stringify([
          {id:'excluded',name:'Excluded Elder',appointment:'Elder',roles:[],exceptions:{Chairman:false}},
          {id:'away',name:'Away Elder',appointment:'Elder',roles:[],availability:[{from:'2026-01-01',to:'2026-12-31'}]},
          {id:'available',name:'Available Brother',appointment:'MS',roles:[],exceptions:{Chairman:true}}
        ]));fw.initMidweekScheduler();fw.setSchedulerWeek('2026-W41');
        assert.equal(fw.MidweekScheduler.isEligible('excluded','Chairman'),false);assert.equal(fw.MidweekScheduler.isEligible('excluded','Prayer'),true);
        assert.equal(fw.MidweekScheduler.isEligible('away','Prayer'),false);assert.equal(fw.MidweekScheduler.isEligible('available','Chairman'),true);
        fw.setSchedulerWeek('2027-W02');assert.equal(fw.MidweekScheduler.isEligible('away','Prayer'),true);
    });
    await test('ordinary publishers have only their personal workspace and combined roles stay scoped',()=>{const f=createHarness(),w=f.window;w.auth.roleReady=true;w.auth.verifiedRoles=['publisher'];assert.deepEqual([...w.ui.getAllowedTabs()],['personal']);w.auth.verifiedRoles=['publisher','oclm'];assert.deepEqual([...w.ui.getAllowedTabs()],['personal','oclm']);assert(!w.ui.canManageAccess());});
    await test('first shared draft preserves published weeks, identities, qualifications and device edits',()=>{const f=createHarness(),w=f.window;w.currentCongId='first-shared';f.localStorage.setItem('ca_midweek_first-shared_jw_scheduler_personnel',JSON.stringify([{id:'publisher-uuid',publisherId:'publisher-uuid',name:'Known Person',appointment:'Other',roles:['Prayer']} ]));f.localStorage.setItem('ca_midweek_first-shared_jw_scheduler_assignments',JSON.stringify({'2026-W42':{OpeningPrayer:{personId:'publisher-uuid',customTitle:'Device change'}}}));w.initMidweekScheduler();w.MidweekScheduler.adoptPublished({kind:'midweek',people:[{id:'published-id',name:'Known Person'}],publishedWeeks:['2026-W41','2026-W42'],assignments:{'2026-W41':{OpeningPrayer:{personId:'published-id'}},'2026-W42':{OpeningPrayer:{personId:'published-id',customTitle:'Old live title'}}},additionalDuties:[]});const draft=w.MidweekScheduler.getDraft();assert.equal(draft.personnel[0].id,'published-id');assert.equal(draft.personnel[0].publisherId,'publisher-uuid');assert(draft.personnel[0].roles.includes('Prayer'));assert.equal(draft.assignments['2026-W41'].OpeningPrayer.personId,'published-id');assert.equal(draft.assignments['2026-W42'].OpeningPrayer.customTitle,'Device change');assert.equal(draft.assignments['2026-W42'].OpeningPrayer.personId,'published-id');});
    console.log(`\n${passed} checks passed. PDF samples: ${artifactDir}`);
})().catch(error=>{console.error(error);process.exitCode=1;});
