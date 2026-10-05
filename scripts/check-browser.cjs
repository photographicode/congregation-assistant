const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');
const { PDFDocument } = require('pdf-lib');
const AxeBuilder = require('@axe-core/playwright').default;
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'artifacts/browser');
fs.mkdirSync(output, { recursive: true });
const reports = [];
const publishedURL = process.env.CA_CHECK_BASE_URL;
if (publishedURL && new URL(publishedURL).protocol !== 'https:') throw new Error('Published-site checks require HTTPS.');
const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(response);
});
async function run(profile) {
    const browser = await profile.engine.launch({ headless: true });
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.mobile, hasTouch: profile.mobile, acceptDownloads: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [], blockedProduction = [], timings = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { const rejectedOwner=message.location().url.includes('/functions/v1/owner-password-session')&&message.text().includes('401');if(message.type()==='error'&&!rejectedOwner&&!message.text().includes('Acceptance test: save rejected'))errors.push(message.text()); });
    await context.route('**/*.supabase.co/**', async route => { blockedProduction.push(route.request().url()); await route.abort('blockedbyclient'); });
    await context.route('**/npm/@supabase/supabase-js@2', route => route.fulfill({ contentType: 'application/javascript', body: '/* Isolated acceptance backend installed before boot. */' }));
    await context.route('**/pdf-lib.min.js', route => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(require.resolve('pdf-lib/dist/pdf-lib.min.js'), 'utf8') }));
    await context.addInitScript({ path: path.join(__dirname, 'browser-fixture.js') });
    try {
        await page.goto(publishedURL || `http://127.0.0.1:${server.address().port}`, { waitUntil: 'load' });
        await page.waitForFunction(() => window.db?.publishers.length === 1000 && document.getElementById('global-loader').classList.contains('hidden'));
        const destinations=await page.locator('#nav-admin [data-nav-tab]').evaluateAll(buttons=>buttons.map(button=>button.dataset.navTab));
        assert.equal(new Set(destinations).size,destinations.length,'Desktop navigation repeats a destination');
        const nav = async tab => {
            const selector = profile.mobile ? `#m-btn-tab-${tab}` : `#btn-tab-${tab}`;
            const button = page.locator(selector);
            if (await button.count() && await button.isVisible()) await button.click();
            else if (profile.mobile && ['analytics', 'emergency', 'groups'].includes(tab)) {
                await page.locator('#mobile-nav button').last().click();
                await page.locator(`#menu-item-${tab}`).click();
            } else await page.evaluate(tab => window.ui.switchTab(tab), tab);
            await page.waitForFunction(tab => document.getElementById(`tab-${tab}`).classList.contains('active'), tab);
        };
        await nav('publishers');
        assert.equal(await page.locator('#publisher-table-body tr').count(), 50);
        await page.locator('#tab-publishers .ca-table-pages button').last().click();
        assert.match(await page.locator('#tab-publishers .ca-table-pages').innerText(), /51–100 of 1000/);
        await page.locator('#publisher-search').fill("O'Brien");
        assert.equal(await page.locator('#publisher-table-body tr').count(), 1);
        await nav('dashboard'); await nav('publishers');
        assert.equal(await page.locator('#publisher-search').inputValue(), "O'Brien");
        assert.equal(await page.locator('#publisher-table-body tr').count(), 1);
        await page.locator('#publisher-search').fill('');
        await page.locator('#tab-publishers button[onclick*="openModal(\'modal-add-publisher\')"]').click();
        await page.locator('#pub-name').fill('Unsaved test name');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#modal-add-publisher').isVisible(), false);
        assert.equal(await page.evaluate(() => document.body.classList.contains('ca-dialog-open')), false);
        await nav('attendance');
        await page.locator('#att-w1-mid-display button').click();
        await page.locator('#att-w1-mid-val').fill('127');
        await nav('publishers'); await nav('attendance');
        assert.equal(await page.locator('#att-w1-mid-val').inputValue(), '127');
        assert.equal(await page.locator('#att-w1-mid-val').isVisible(), true);
        await page.evaluate(() => { window.__qaBackend.rejectWrites = true; });
        await page.locator('#att-save-btn').click();
        if (profile.mobile) {
            await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));
            await page.waitForFunction(() => document.getElementById('toast').getBoundingClientRect().bottom <= document.getElementById('mobile-nav').getBoundingClientRect().top);
            const placement = await page.evaluate(() => ({
                toastBottom: document.getElementById('toast').getBoundingClientRect().bottom,
                navigationTop: document.getElementById('mobile-nav').getBoundingClientRect().top
            }));
            assert(placement.toastBottom <= placement.navigationTop, 'Mobile notification is covered by bottom navigation');
        }
        await page.waitForFunction(() => !document.getElementById('att-save-btn').disabled);
        assert.equal(await page.locator('#att-w1-mid-val').inputValue(), '127');
        assert.equal(await page.evaluate(() => window.db.attendance.length), 0);
        await page.evaluate(() => { window.__qaBackend.rejectWrites = false; window.__qaBackend.delay = 150; });
        await page.locator('#att-save-btn').click();
        await page.waitForFunction(() => window.db.attendance.length === 1 && !document.getElementById('att-save-btn').disabled);
        for (const [id, file] of [['att-print-btn', 's3.pdf'], ['att-print88-btn', 's88.pdf']]) {
            const waiting = page.waitForEvent('download'); await page.locator('#' + id).click(); const download = await waiting;
            const location = path.join(output, `${profile.name}-${file}`); await download.saveAs(location);
            assert((await PDFDocument.load(fs.readFileSync(location))).getPageCount() > 0);
            await page.waitForFunction(id => !document.getElementById(id).disabled, id);
        }
        await page.evaluate(()=>{document.body.classList.add('public-mode');window.ui.publicLinkToken='qa-attendance-token';window.ui.switchTab('public-attendance');});
        await page.waitForFunction(()=>!document.getElementById('pub-att-submit-btn').disabled);
        assert.equal(await page.locator('#pub-att-year,#pub-att-month,#pub-att-week,#pub-att-mid-type').count(),0);
        assert.match(await page.locator('#pub-att-context').innerText(),/Midweek meeting.*2026–2027/);
        await page.locator('#pub-att-count').fill('91');await page.locator('#pub-att-submit-btn').click();await page.waitForFunction(()=>!document.getElementById('pub-att-success-msg').classList.contains('hidden'));
        const submission=await page.evaluate(()=>window.__qaBackend.rpcCalls.find(c=>c.name==='submit_current_attendance'));assert.deepEqual(submission.args,{p_token:'qa-attendance-token',p_date:'2026-10-05',p_count:91});
        await page.evaluate(()=>{window.__qaBackend.meetingContext={configured:true,date:'2026-10-05',kind:'RC',serviceYear:2027,month:9,week:1,timezone:'Asia/Kolkata',canSubmit:false};window.ui.loadPublicAttendance();});await page.waitForFunction(()=>document.getElementById('pub-att-context').textContent.includes('Regional convention'));assert(await page.locator('#pub-att-submit-btn').isDisabled());
        await page.evaluate(()=>{window.ui.publicLinkToken=null;document.body.classList.remove('public-mode');});
        await nav('oclm');
        assert.equal(await page.locator('#ca-midweek-root h1').count(),1,'Scheduler must have one page heading');
        assert.equal(await page.locator('#autoTop,#previewBtn').count(),0,'Duplicate scheduler actions returned');
        assert.equal(await page.locator('.mws-week-browser').getAttribute('open'),null,'Nearby weeks should be optional');
        await page.locator('#mws-tab-schedule').focus();await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#previewView').isVisible(),true,'Scheduler tabs must support the keyboard');
        assert.equal(await page.locator('#previewBtn, #mws-tab-messages, #messagesView').count(),0,'Duplicate preview and Messages controls must be removed');
        await page.locator('#mws-tab-preview').click();
        await page.locator('#publishWeekBtn').scrollIntoViewIfNeeded();
        assert(await page.locator('#publishWeekBtn').isVisible(),'Publish button must be visible on every device');
        if(profile.mobile)assert(await page.locator('#publishWeekBtn').evaluate(button=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return button===hit||button.contains(hit);}), 'Publish must be reachable above bottom navigation');
        assert.equal(await page.locator('.mws-review-paper').getAttribute('open'),null,'Full preview should be optional so publication stays easy to find');
        const reviewOrder=await page.evaluate(()=>!!(document.getElementById('paper').compareDocumentPosition(document.getElementById('publishWeekBtn')) & Node.DOCUMENT_POSITION_FOLLOWING));
        assert(reviewOrder,'Publish follows the schedule review');
        const frames=await page.locator('#s3-render-area, #s88-render-area').evaluateAll(els=>els.every(el=>getComputedStyle(el).display==='none'));
        assert(frames,'PDF rendering frames must not leave blank screen space');
        for (const view of ['people', 'preview', 'schedule']) {
            await page.locator(`#ca-midweek-root [data-view="${view}"]`).click();
            assert.equal(await page.locator(`#${view}View`).isVisible(), true);
        }
        await page.evaluate(()=>{
            const original=Storage.prototype.setItem;
            window.__restoreScheduleStorage=()=>{Storage.prototype.setItem=original;};
            Storage.prototype.setItem=function(key,value){if(key.endsWith('_jw_scheduler_assignments'))throw new Error('Acceptance test: device storage full');return original.call(this,key,value);};
            window.setPartTitle('Chairman','Unsaved browser title');
        });
        assert.equal(await page.locator('#schedulerSaveError').isVisible(),true,'Storage failure must remain visible');
        assert.equal(await page.locator('.row-title-input').first().inputValue(),'Unsaved browser title');
        await page.evaluate(()=>window.__restoreScheduleStorage());await page.locator('#retrySchedulerSave').click();
        assert.equal(await page.locator('#schedulerSaveError').isVisible(),false);
        await page.locator('.mws-week-browser summary').click();
        assert.equal(await page.locator('.week-chip').count(),3,'The week browser repeats the selected week');
        await page.locator('.mws-week-browser summary').click();
        if(!profile.mobile)await page.screenshot({path:path.join(output,`${profile.name}-integrated-scheduler.png`),fullPage:false});
        if(profile.mobile) {
            await page.waitForFunction(() => !document.getElementById('toast').classList.contains('show'));
            assert.equal(await page.locator('#autoRemaining').evaluate(el=>getComputedStyle(el).fontSize),'14px','Scheduler small actions must remain readable');
            for(const width of [320,375,390,430]) {
                await page.setViewportSize({width,height:profile.viewport.height});
                for(const theme of ['default','blue','green','crimson','scheduler','light','dark']) {
                    await page.evaluate(theme=>{window.ui.applyTheme(theme);window.scrollTo(0,0);},theme);
                    await page.waitForTimeout(150);
                    const layout=await page.evaluate(()=>{
                        const root=document.getElementById('ca-midweek-root');
                        const bounds=selector=>root.querySelector(selector).getBoundingClientRect();
                        return {rootWidth:root.clientWidth,contentWidth:root.scrollWidth,week:bounds('.week-nav').toJSON(),actions:bounds('.top-actions').toJSON(),header:document.getElementById('mobile-top-header').getBoundingClientRect().toJSON(),stripWidth:root.querySelector('.week-strip').clientWidth,stripContent:root.querySelector('.week-strip').scrollWidth,inputBackground:getComputedStyle(root.querySelector('.row-title-input')).backgroundColor,headerBackground:getComputedStyle(document.getElementById('mobile-top-header')).backgroundColor};
                    });
                    assert(layout.week.top>=layout.header.bottom,'Week controls hidden behind mobile header');
                    assert(layout.actions.top>=layout.week.bottom,'Scheduler toolbar overlaps week controls');
                    assert(layout.contentWidth<=layout.rootWidth+1,'Scheduler overflows phone width '+width);
                    assert(layout.stripContent<=layout.stripWidth+1,'Week cards require sideways scrolling');
                    const surfaces={default:'rgb(16, 76, 69)',blue:'rgb(27, 40, 71)',green:'rgb(27, 74, 54)',crimson:'rgb(71, 35, 45)',scheduler:'rgb(248, 250, 252)',light:'rgb(248, 250, 252)',dark:'rgb(28, 44, 66)'};
                    assert.equal(layout.inputBackground,surfaces[theme],'Scheduler input does not follow the selected CA theme');
                    assert(/^rgb\(/.test(layout.headerBackground),'Mobile header must be opaque');
                    await page.screenshot({path:path.join(output,`${profile.name}-scheduler-${width}-${theme}.png`)});
                }
            }
            await page.setViewportSize(profile.viewport);
        }
        for (let cycle = 0; cycle < 3; cycle++) for (const tab of ['dashboard', 'publishers', 'attendance', 'oclm', 'analytics', 'emergency']) {
            const elapsed = await page.evaluate(tab => { const start = performance.now(); window.ui.switchTab(tab); return performance.now() - start; }, tab);
            timings.push({ tab, elapsed });
            assert(elapsed < 2000, `${profile.name}: ${tab} rendering took ${elapsed.toFixed(0)}ms`);
            assert.equal(await page.evaluate(() => document.body.classList.contains('ca-dialog-open')), false);
        }
        await nav('publishers');
        await page.waitForFunction(() => !document.getElementById('toast').classList.contains('show'));
        if (!profile.mobile) {
            const layout = await page.evaluate(() => ({ sidebar: document.getElementById('app-header').getBoundingClientRect().right, content: document.querySelector('.main-content').getBoundingClientRect().left }));
            assert(layout.content >= layout.sidebar, 'Desktop content sits underneath the sidebar');
        }
        for (const theme of ['default', 'blue', 'green', 'crimson', 'scheduler', 'light', 'dark']) {
            await page.evaluate(theme => window.ui.applyTheme(theme), theme);
            assert.equal(await page.locator('body').getAttribute('data-theme'), theme);
            await page.waitForTimeout(600); // Body background transition lasts 500ms.
            await page.screenshot({ path: path.join(output, `${profile.name}-${theme}.png`), fullPage: false });
        }
        if (profile.mobile) {
            await page.locator('#m-btn-tab-menu').click();
            for (const id of ['groups','analytics','access','announcements','help','about','settings','logout']) assert(await page.locator('#menu-item-'+id).isVisible(), 'Missing mobile menu option '+id);
            const menu=await page.locator('.ca-mobile-menu-sheet').boundingBox();assert(menu.height <= profile.viewport.height, 'Menu exceeds viewport');
            for(const theme of ['default','blue','green','crimson','scheduler','light','dark']) {
                await page.evaluate(theme=>window.ui.applyTheme(theme),theme);
                const background=await page.locator('.ca-mobile-menu-sheet').evaluate(el=>getComputedStyle(el).backgroundColor);
                assert(/^rgb\(/.test(background),'Navigation surface must be opaque in '+theme+': '+background);
            }
            await page.screenshot({path:path.join(output,`${profile.name}-all-sections.png`)});
            await page.locator('#menu-item-groups').click();assert.equal(await page.locator('#tab-groups').isVisible(),true);
            await page.locator('#m-btn-tab-menu').click();await page.locator('#menu-item-access').click();
            await page.waitForFunction(()=>document.getElementById('access-manager-list').textContent.includes('qa-admin@example.com'));
            assert.equal(await page.locator('#modal-mobile-menu').isVisible(),false);
            await page.locator('#modal-access-manager button[onclick*=closeModal]').click();
        } else {
            const gaps=await page.evaluate(()=>[...document.querySelectorAll('#nav-admin .ca-nav-section')].filter(el=>el.getClientRects().length).slice(1).map((el,i)=>el.getBoundingClientRect().top-document.querySelectorAll('#nav-admin .ca-nav-section')[i].getBoundingClientRect().bottom));
            assert(gaps.every(gap=>gap<60),'Large desktop navigation spacer');
        }
        await nav('oclm');
        await page.locator('#mws-tab-schedule').click();await page.locator('#meetingDetailsSettings summary').click();await page.locator('#meetingStartTime').fill('19:00');await page.locator('#meetingReading').fill('Jeremiah 40–41');await page.locator('#meetingOpeningSong').fill('10');await page.locator('#meetingMiddleSong').fill('20');await page.locator('#meetingClosingSong').fill('30');await page.locator('#meetingAuxiliary').check();await page.getByRole('button',{name:'Save meeting details',exact:true}).click();await page.locator('#additionalDutiesSettings summary').click();await page.locator('#additionalDutySection').fill('AV');await page.locator('#additionalDutyName').fill('Microphones');await page.locator('#additionalDutySlots').selectOption('2');await page.locator('#additionalDutiesSettings').getByRole('button',{name:'Add duty',exact:true}).click();
        const duty=await page.evaluate(()=>window.MidweekScheduler.getPayload().additionalDuties[0]);assert.equal(duty.name,'Microphones');assert.equal(duty.section,'AV');assert.equal(duty.slots,2);
        await page.evaluate(()=>window.openPersonModal());
        await page.locator('#personName').fill('Sample Schedule Person');
        await page.locator('details:has(#roleChecks) summary').click();
        await page.locator('#roleChecks input[value="Chairman"]').check();await page.locator('#roleChecks input[value="'+duty.id+'"]').check();
        await page.locator('#personForm button[type="submit"]').click();
        await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith('_jw_scheduler_personnel')&&k.includes('qa-congregation'));const person=JSON.parse(localStorage.getItem(key)).find(p=>p.name==='Sample Schedule Person');window.setAssignment('Chairman',person.id);window.setPartTitle('Chairman','First published title');window.setAssignment(window.MidweekScheduler.getPayload().additionalDuties[0].id+'_1',person.id);});
        await page.locator('#mws-tab-preview').click();await page.locator('#publishWeekBtn').click();
        await page.waitForFunction(()=>document.getElementById('liveLinkInput').value.includes('token=qa-live-token'));
        assert.equal(await page.locator('#publicationState').innerText(),'Published');
        assert.equal(await page.locator('#openLiveSchedule').isVisible(),true);
        const sharedURL=await page.locator('#liveLinkInput').inputValue();assert(!sharedURL.includes('#live='),'New public link is a frozen snapshot');
        // Route-backed fixtures require requests to stay outside a service worker.
        const publicContext=await browser.newContext({viewport:profile.viewport,isMobile:profile.mobile,hasTouch:profile.mobile,serviceWorkers:'block'});
        await publicContext.route('**/*.supabase.co/**',route=>route.abort('blockedbyclient'));
        await publicContext.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({contentType:'application/javascript',body:'/* Fixture */'}));
        await publicContext.route('**/pdf-lib.min.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(require.resolve('pdf-lib/dist/pdf-lib.min.js'),'utf8')}));
        await publicContext.addInitScript({path:path.join(__dirname,'browser-fixture.js')});
        const published=await page.evaluate(()=>window.__qaBackend.publications);
        await publicContext.addInitScript(value=>{window.__qaPublicationsSeed=value;},published);
        const publicPage=await publicContext.newPage();publicPage.on('pageerror',error=>errors.push(error.message));
        await publicPage.goto(sharedURL);await publicPage.waitForFunction(()=>document.getElementById('liveSections').textContent.includes('First published title'));
        assert.equal(await publicPage.locator('#liveView').isVisible(),true,'Published schedule is hidden');
        assert.equal(await publicPage.locator('#tab-oclm').evaluate(el=>getComputedStyle(el).opacity),'1','Published schedule is transparent');
        assert.match(await publicPage.locator('#liveSections').innerText(),/19:00/);assert.match(await publicPage.locator('#liveSections').innerText(),/10 \/ 20 \/ 30/);assert.match(await publicPage.locator('#liveSections').innerText(),/Microphones 1/);assert.match(await publicPage.locator('#liveSections').innerText(),/Sample Schedule Person/);
        assert.equal(await publicPage.evaluate(()=>sessionStorage.getItem('fs_auth')),null,'Public URL needs a private session');
        assert.equal(await publicPage.evaluate(()=>window.__qaBackend.reads.length),0,'Public schedule loads private tables');
        assert.equal(await publicPage.locator('#auth-screen').isVisible(),false);assert.equal(await publicPage.locator('#mobile-nav').isVisible(),false);
        await page.evaluate(()=>window.setPartTitle('Chairman','Updated published title'));
        assert.equal(await page.locator('#publicationState').innerText(),'Unpublished changes');
        await publicPage.evaluate(()=>window.dispatchEvent(new Event('focus')));
        assert((await publicPage.locator('#liveSections').innerText()).includes('First published title'),'Draft edit became public before publishing');
        await page.locator('#publishWeekBtn').click();await page.waitForFunction(()=>!document.getElementById('publishWeekBtn').disabled);
        assert.equal(await page.locator('#publicationState').innerText(),'Published');
        assert.equal(await page.locator('#liveLinkInput').inputValue(),sharedURL,'Publishing changed the shared URL');
        const updated=await page.evaluate(()=>window.__qaBackend.publications);
        await publicPage.evaluate(value=>{window.__qaPublicationsSeed=value;window.dispatchEvent(new Event('focus'));},updated);
        await publicPage.waitForFunction(()=>document.getElementById('liveSections').textContent.includes('Updated published title'));
        assert.equal(await publicPage.locator('#ca-midweek-root > .ca-planning-note').isVisible(),false,'Publisher link exposes scheduler preparation controls');const AxeBuilder=require('@axe-core/playwright').default;const publicScan=await new AxeBuilder({page:publicPage}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(publicScan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],'Published S-140 accessibility');
        await publicPage.screenshot({path:path.join(output,`${profile.name}-public-live-updated.png`)});
        await page.evaluate(()=>{window.__qaBackend.rejectWrites=true;window.setPartTitle('Chairman','Rejected update');});await page.locator('#publishWeekBtn').click();await page.waitForFunction(()=>!document.getElementById('publishWeekBtn').disabled);
        assert.equal(await page.locator('#schedulerPublishError').isVisible(),true,'Publishing errors must stay visible');
        assert.equal(await page.locator('#publicationState').innerText(),'Unpublished changes');
        assert.equal(await page.locator('#liveLinkInput').inputValue(),sharedURL);
        assert.equal(await page.evaluate(()=>window.__qaBackend.publications['qa-live-token'].snapshot.assignments[window.MidweekScheduler.getPayload().defaultWeek].Chairman.customTitle),'Updated published title','Rejected publication overwrote cloud data');
        await page.evaluate(()=>{window.__qaBackend.rejectWrites=false;});
        const legacyURL=sharedURL.split('?')[0]+'#live='+encodeURIComponent(Buffer.from(JSON.stringify(updated['qa-live-token'].snapshot)).toString('base64'));
        await publicPage.goto(legacyURL);await publicPage.waitForFunction(()=>document.getElementById('liveSections').textContent.includes('Updated published title'));
        assert.equal(await publicPage.locator('#auth-screen').isVisible(),false);assert.equal(await publicPage.evaluate(()=>window.__qaBackend.reads.length),0);
        await publicPage.goto(sharedURL.replace('qa-live-token','invalid-token'));await publicPage.waitForFunction(()=>document.getElementById('public-link-status')?.textContent.includes('not been published'));
        assert.equal(await publicPage.locator('#auth-screen').isVisible(),false);
        for(const [mode,tab] of [['attendance','public-attendance'],['report','s4']]){
            const token='qa-'+mode,context={kind:mode,cong_id:'qa-congregation',congregation:'Public Example',publishers:[{id:'qa-0',name:'Sample Reporter',service_group:'Group 1'}]};
            await publicPage.addInitScript(value=>{window.__qaPublicLinksSeed={...(window.__qaPublicLinksSeed||{}),...value};},{[token]:context});
            const url=new URL(sharedURL);url.searchParams.set('mode',mode);url.searchParams.set('token',token);await publicPage.goto(url.href);
            await publicPage.waitForFunction(()=>window.ui?.publicLinkToken).catch(async error=>{await publicPage.screenshot({path:path.join(output,`${profile.name}-public-${mode}-failure.png`)});throw new Error(`${mode}: ${error.message}; public status: ${await publicPage.locator('body').innerText()}`);});assert.equal(await publicPage.locator('#tab-'+tab).isVisible(),true);assert.equal(await publicPage.locator('#auth-screen').isVisible(),false);
            assert.equal(await publicPage.evaluate(()=>window.__qaBackend.reads.length),0,'New public forms directly read private tables');
        }
        await publicContext.close();
        if(profile.mobile){await nav('publishers');await page.locator('#m-btn-tab-menu').click();for(const section of ['Main','Field Service','Attendance','OCLM','More'])assert(await page.locator('[data-menu-section="'+section+'"]').isVisible());await page.locator('#menu-item-install').click();assert(await page.locator('#modal-install-app').isVisible());await page.locator('#modal-install-app').getByRole('button',{name:'Got it',exact:true}).click();await page.locator('#m-btn-tab-menu').click();await page.locator('#menu-item-notifications').click();assert(await page.locator('#modal-reminders').isVisible());await page.locator('#modal-reminders').getByRole('button',{name:'Device notification settings',exact:true}).click();await page.locator('#modal-install-app').getByRole('button',{name:'Settings help',exact:true}).click();assert.match(await page.locator('#notification-status').innerText(),/Do Not Disturb/);await page.locator('#modal-install-app').getByRole('button',{name:'Got it',exact:true}).click();await page.evaluate(()=>window.ui.closeModal('modal-reminders'));}
        await page.evaluate(async()=>{await window.auth.googleLogin();});
        const oauth=await page.evaluate(()=>window.__qaBackend.oauthRequests.at(-1));assert.equal(oauth.provider,'google');assert.equal(new URL(oauth.options.redirectTo).search,'');assert.equal(new URL(oauth.options.redirectTo).hash,'');
        for(const role of ['field_service','attendance','oclm','group_overseer']) {
            await page.evaluate(async role=>{
                window.__qaBackend.reads=[];window.__qaBackend.session={user:{email:'qa@example.com'}};
                window.__qaBackend.tables.congregation_access=[{cong_id:'qa-congregation',email:'qa@example.com',role,active:true,service_group:role==='group_overseer'?'Group 1':null}];
                await window.auth.resumeGoogleRole();
            },role);
            if(role==='oclm'){
                const reads=await page.evaluate(()=>window.__qaBackend.reads);assert(!reads.includes('reports'),'OCLM fetched reports');
                await page.evaluate(()=>{sessionStorage.setItem('fs_roles','["admin"]');sessionStorage.setItem('fs_role','admin');window.ui.applyRoleNavigation();window.ui.switchTab('analytics');});
                assert.deepEqual(await page.evaluate(()=>window.ui.getAllowedTabs()),['oclm']);
                assert.equal(await page.locator('#tab-oclm').isVisible(),true);assert.equal(await page.locator('#tab-analytics').isVisible(),false);
            }
            if(!profile.mobile){
                assert.equal(await page.locator('#btn-tab-access').isVisible(),false,'Restricted desktop role sees access management');
                assert.equal(await page.locator('#btn-tab-emergency').isVisible(),false,'Restricted desktop role sees emergency records');
                assert.equal(await page.locator('#btn-tab-dashboard').isVisible(),false,'Desktop overview visibility does not match its role');
                assert.equal(await page.locator('#btn-tab-publishers').isVisible(),role==='field_service','Desktop publisher visibility does not match its role');
                await page.screenshot({path:path.join(output,`${profile.name}-${role}-navigation.png`)});
            }
            if(profile.mobile){
                assert.equal(await page.locator('#m-btn-tab-menu').isVisible(),true,'Menu missing for '+role);await page.locator('#m-btn-tab-menu').click();
                assert.equal(await page.locator('.ca-mobile-menu-content').evaluate(el=>el.scrollTop),0,'Navigation reopens with its first sections scrolled away');
                assert.equal(await page.locator('#menu-item-access').isVisible(),false);assert.equal(await page.locator('#menu-item-emergency').isVisible(),false);
                assert.equal(await page.locator('#menu-item-home').isVisible(),false);
                assert.equal(await page.locator('#menu-item-publishers').isVisible(),role==='field_service');
                for(const id of ['help','settings','logout']) assert(await page.locator('#menu-item-'+id).isVisible(),'Support option missing for '+role);
                assert.equal(await page.locator('#menu-item-'+(role==='field_service'?'groups':role==='attendance'?'attendance':role==='group_overseer'?'overseer':'oclm')).isVisible(),true);
                await page.screenshot({path:path.join(output,`${profile.name}-${role}-menu.png`)});
                await page.locator('#modal-mobile-menu button[aria-label="Close navigation menu"]').click();
            }
            if(role==='group_overseer'){
                assert.deepEqual(await page.evaluate(()=>window.ui.getAllowedTabs()),['overseer']);
                assert.equal(await page.evaluate(()=>window.db.publishers.length),100);assert(await page.evaluate(()=>window.db.publishers.every(p=>p.group==='Group 1')));
                assert.equal(await page.locator('#overseer-password-action').isVisible(),false);
                await page.evaluate(()=>{window.__qaOriginalConfig=window.CA_CONFIG;window.CA_CONFIG={...window.CA_CONFIG,secureBackend:true};window.ui.renderOverseerView('Group 1');});assert(await page.locator('#group-bulk-entry').isVisible());await page.locator('#group-bulk-entry').click();
                assert.equal(await page.locator('#bulk-entry-table-body tr[data-pubid]').count(),100);
                const firstRow=page.locator('#bulk-entry-table-body tr[data-pubid]').first();await firstRow.locator('.bulk-shared').check();await firstRow.locator('.bulk-studies').fill('3');await firstRow.locator('.bulk-comments').fill('Own group test');
                await page.evaluate(()=>window.__qaBackend.rejectWrites=true);await page.locator('#modal-bulk-entry').getByRole('button',{name:'Save All Reports',exact:true}).click();
                assert(await page.locator('#modal-bulk-entry').isVisible());assert.equal(await firstRow.locator('.bulk-studies').inputValue(),'3');
                await page.evaluate(()=>window.__qaBackend.rejectWrites=false);await page.locator('#modal-bulk-entry').getByRole('button',{name:'Save All Reports',exact:true}).click();await page.waitForFunction(()=>document.getElementById('modal-bulk-entry').classList.contains('hidden'));
                const groupSave=await page.evaluate(()=>window.__qaBackend.rpcCalls.filter(r=>r.name==='save_group_reports').at(-1));assert.equal(groupSave.args.p_reports.length,1,'Untouched missing reports must remain missing');assert.equal(groupSave.args.p_reports[0].comments,'Own group test');assert.equal(groupSave.args.p_reports[0].studies,3);await page.evaluate(()=>{window.CA_CONFIG=window.__qaOriginalConfig;});

            }
            await page.evaluate(()=>window.CAReminders.open());
            const expected=role==='oclm'?['oclm']:role==='attendance'?['attendance_midweek','attendance_weekend','attendance_link']:['reports','report_link'];
            assert.deepEqual(await page.locator('#reminder-settings input[type="checkbox"]').evaluateAll(nodes=>nodes.map(n=>n.id.replace('reminder-enable-',''))),expected);
            const first=expected[0];await page.locator('#reminder-enable-'+first).check();await page.locator('#reminder-time-'+first).fill('10:15');await page.locator('#modal-reminders').getByRole('button',{name:'Save reminder times',exact:true}).click();assert.match(await page.locator('#reminder-save-status').innerText(),/Saved/);
            const calendarDownload=page.waitForEvent('download');await page.locator('#modal-reminders').getByRole('button',{name:'Download calendar reminders',exact:true}).click();assert.equal((await calendarDownload).suggestedFilename(),'congregation-assistant-reminders.ics');
            await page.evaluate(()=>window.ui.closeModal('modal-reminders'));
            await page.evaluate(()=>window.ui.startHowToUse());assert(await page.locator('#modal-how-to-use').isVisible());
            assert(await page.locator('#ca-role-guide a[href$="#reminders"]').isVisible());assert.equal(await page.locator('#ca-role-guide a[href$="#midweek"]').count(),role==='oclm'?1:0);
            await page.screenshot({path:path.join(output,`${profile.name}-${role}-usage-guide.png`)});await page.evaluate(()=>window.ui.closeModal('modal-how-to-use'));
            const before=await page.evaluate(()=>window.ui.currentTab);await page.evaluate(()=>window.ui.switchTab('emergency',false,'field'));assert.equal(await page.evaluate(()=>window.ui.currentTab),before,'Navigation context bypassed role');
            assert.equal(await page.locator('#auth-screen').isVisible(),false);
        }
        await page.evaluate(async()=>{window.__qaBackend.tables.congregation_access=[{cong_id:'qa-congregation',email:'qa@example.com',role:'attendance',active:true},{cong_id:'qa-congregation',email:'qa@example.com',role:'field_service',active:true},{cong_id:'qa-congregation',email:'qa@example.com',role:'oclm',active:true,is_assistant:true}];await window.auth.resumeGoogleRole();});
        const grants=await page.evaluate(()=>window.ui.getAllowedTabs());assert(grants.includes('attendance')&&grants.includes('groups')&&grants.includes('oclm'));assert.equal(await page.evaluate(()=>window.ui.canManageAccess()),false);assert.deepEqual(await page.evaluate(()=>window.auth.verifiedAssistants),['oclm']);
        await page.evaluate(async()=>{
            sessionStorage.removeItem('fs_cong_id');window.__qaBackend.tables.congregation_access=[{cong_id:'qa-congregation',email:'qa@example.com',role:'attendance',active:true},{cong_id:'qa-second',email:'qa@example.com',role:'attendance',active:true}];await window.auth.resumeGoogleRole();
        });
        assert.equal(await page.locator('#modal-google-congregation').isVisible(),true);assert.equal(await page.locator('#google-congregation-list button').count(),2);
        await page.locator('#google-congregation-list button').first().click();await page.waitForFunction(()=>document.getElementById('auth-screen').classList.contains('hidden')&&!window.auth.googleSwitching);
        await page.evaluate(async()=>{window.__qaBackend.reads=[];window.__qaBackend.tables.congregation_access=[{cong_id:'qa-congregation',email:'qa@example.com',role:'publisher',publisher_id:'qa-1',active:true}];sessionStorage.removeItem('fs_cong_id');await window.auth.resumeGoogleRole();});
        await page.waitForFunction(()=>document.getElementById('publisher-personal-home').textContent.includes('Personal Sample Publisher'));assert.deepEqual(await page.evaluate(()=>window.ui.getAllowedTabs()),['personal']);assert.equal(await page.locator('#tab-publishers').isVisible(),false);assert.equal(await page.locator('#tab-analytics').isVisible(),false);const personalReads=await page.evaluate(()=>window.__qaBackend.reads);assert(!personalReads.includes('publishers')&&!personalReads.includes('reports'),'Personal workspace read the congregation database');
        await page.locator('#personal-report-form [name=shared]').check();await page.locator('#personal-report-form [name=studies]').fill('2');await page.evaluate(()=>window.__qaBackend.rejectWrites=true);await page.locator('#personal-report-form button').click();await page.waitForFunction(()=>document.querySelector('#personal-report-form [role=status]').textContent.includes('Could not save'));assert.equal(await page.locator('#personal-report-form [name=studies]').inputValue(),'2');await page.evaluate(()=>window.__qaBackend.rejectWrites=false);await page.locator('#personal-report-form button').click();await page.waitForFunction(()=>document.querySelector('#personal-report-form [role=status]').textContent.includes('Saved online'));await page.screenshot({path:path.join(output,`${profile.name}-publisher-home.png`)});
        await page.evaluate(async()=>{window.__qaBackend.tables.congregation_access.push({cong_id:'qa-congregation',email:'qa@example.com',role:'oclm',active:true});await window.auth.resumeGoogleRole();});const personalCombined=await page.evaluate(()=>window.ui.getAllowedTabs());assert(personalCombined.includes('personal')&&personalCombined.includes('oclm')&&!personalCombined.includes('analytics'));
        await page.evaluate(async()=>{window.__qaBackend.tables.congregation_access=[];await window.auth.resumeGoogleRole();});
        assert.equal(await page.locator('#auth-screen').isVisible(),true);assert.match(await page.locator('#google-auth-status').innerText(),/no approved access/);
        assert.equal(await page.evaluate(()=>sessionStorage.getItem('fs_auth')),null);
        await page.evaluate(()=>{window.__qaOriginalConfig=window.CA_CONFIG;window.CA_CONFIG={...window.CA_CONFIG,secureBackend:true};window.CAOnboarding.request();});assert(await page.locator('#ca-trial-request').isVisible());await page.locator('#ca-trial-request [name=congregation]').fill('Fictional Request');await page.locator('#ca-trial-request [name=authorized]').check();await page.locator('#ca-trial-request button').click();await page.waitForFunction(()=>document.querySelector('#ca-trial-request [role=status]').textContent.includes('339f299d'));assert.match(await page.locator('#ca-trial-request [role=status]').innerText(),/No payment/);await page.evaluate(()=>{window.CA_CONFIG=window.__qaOriginalConfig;});
        await page.evaluate(async()=>{window.__qaBackend.superadmin=true;await window.auth.resumeGoogleRole();});
        assert.equal(await page.locator('#tab-superadmin').isVisible(),true);assert.equal(await page.locator('.ca-admin-stat').count(),4);
        assert.deepEqual(await page.evaluate(()=>window.ui.getAllowedTabs()),['superadmin'],'Superadmin exposes an unselected congregation workspace');
        assert(!(await page.locator('#saas-cong-grid').innerText()).includes('Password:'));
        const ownerScan=await new AxeBuilder({page}).include('#tab-superadmin').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(ownerScan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],'Owner dashboard accessibility');
        await page.screenshot({path:path.join(output,`${profile.name}-superadmin.png`)});

        if(profile.mobile){await page.locator('#m-btn-tab-menu').click();assert(await page.locator('#menu-item-super-overview').isVisible());assert.equal(await page.locator('#menu-item-publishers').isVisible(),false);await page.locator('#menu-item-super-create').click();assert(await page.locator('#modal-add-cong').isVisible());await page.locator('#modal-add-cong button[onclick*=closeModal]').first().click();}
        await page.evaluate(()=>{window.auth.verifiedOwner=false;window.auth.verifiedRoles=['admin'];window.currentCongId='demo-cong';sessionStorage.setItem('fs_auth_type','admin');sessionStorage.setItem('fs_role','admin');sessionStorage.removeItem('fs_roles');window.db.currentCongData={id:'demo-cong',name:'Demo Congregation',feature_oclm:true};window.ui.switchTab('oclm');window.initMidweekScheduler();window.__qaBackend.rejectWrites=true;window.__demoCloudCalls=0;window.PublicLinks.publish=async()=>{window.__demoCloudCalls++;throw new Error('Demo must never publish online');};});
        await page.locator('#mws-tab-preview').click();await page.locator('#publishWeekBtn').click();
        assert.equal(await page.locator('#publicationState').innerText(),'Demo published');
        assert.equal(await page.evaluate(()=>window.__demoCloudCalls),0);
        assert.equal(await page.locator('#schedulerPublishError').isVisible(),false);
        assert.equal(await page.locator('#openLiveSchedule').isVisible(),false);
        assert.equal(await page.locator('#demoPublishNotice').isVisible(),true);
        page.once('dialog',dialog=>dialog.accept());await page.locator('#resetSchedulerDemo').click();
        assert.equal(await page.locator('#publicationState').innerText(),'Demo draft');
        await page.evaluate(()=>window.ui.confirmLogout());
        await Promise.all([page.waitForNavigation(),page.locator('#sys-prompt-confirm-btn').click()]);
        await page.waitForFunction(()=>window.auth && !window.auth.check());
        assert.equal(await page.evaluate(()=>sessionStorage.getItem('fs_auth')),null);
        assert.equal(await page.evaluate(()=>window.auth.resumeGoogleRole()),false);
        assert.equal(await page.locator('#auth-screen').isVisible(),true);
        assert.equal(await page.locator('#super-password-panel').count(),0,'Login advertises a separate owner form');
        await page.locator('#auth-google-btn').click();assert.equal(await page.evaluate(()=>window.__qaBackend.oauthRequests.at(-1).provider),'google');assert.equal(await page.evaluate(()=>window.__qaBackend.oauthRequests.at(-1).options.redirectTo),new URL(page.url()).pathname.includes('/staging/')?'https://photographicode.github.io/congregation-assistant/staging/index.html':'https://photographicode.github.io/congregation-assistant/index.html');
        await page.evaluate(async()=>{window.__qaBackend.session={user:{email:'congregationassistant0@gmail.com'}};window.__qaBackend.superadmin=false;window.__qaBackend.tables.congregation_access=[];await window.auth.resumeGoogleRole();});assert.equal(await page.evaluate(()=>window.auth.verifiedOwner),false);
        await page.evaluate(async()=>{window.__qaBackend.superadmin=true;await window.auth.resumeGoogleRole();});assert.equal(await page.locator('#tab-superadmin').isVisible(),true);
        await page.evaluate(()=>window.ui.confirmLogout());await Promise.all([page.waitForNavigation(),page.locator('#sys-prompt-confirm-btn').click()]);await page.waitForFunction(()=>window.auth&&!window.auth.check());assert.equal(await page.evaluate(()=>window.auth.verifiedOwner),false);assert.equal(await page.evaluate(()=>window.auth.resumeGoogleRole()),false);assert(await page.locator('#auth-screen').isVisible());
        assert.deepEqual(blockedProduction, [], 'Unexpected production database request');
        assert.deepEqual(errors, [], 'Browser console/page errors');
        reports.push({ profile: profile.name, status: 'passed', timings });
        console.log('PASS', profile.name, ': navigation, 1000 records, drafts, rejected/successful saves, dialogs, PDF downloads, scheduler views, seven themes, grouped mobile menus, stable public publishing, independent public routes and Google role routing');
    } catch (error) {
        await page.screenshot({ path: path.join(output, `${profile.name}-failure.png`), fullPage: true }).catch(() => {});
        reports.push({ profile: profile.name, status: 'failed', error: error.message, errors, blockedProduction, timings });
        throw error;
    } finally {
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(reports, null, 2));
        await context.close(); await browser.close();
    }
}
(async () => {
    if (!publishedURL) await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    try {
        for (const profile of [
            { name: 'desktop-chromium', engine: chromium, viewport: { width: 1440, height: 900 }, mobile: false },
            { name: 'mobile-chromium', engine: chromium, viewport: { width: 390, height: 844 }, mobile: true },
            { name: 'mobile-webkit', engine: webkit, viewport: { width: 375, height: 812 }, mobile: true }
        ]) await run(profile);
    } finally { if (!publishedURL) server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
