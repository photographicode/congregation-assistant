const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');
const { PDFDocument } = require('pdf-lib');
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
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.mobile, hasTouch: profile.mobile, acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [], blockedProduction = [], timings = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Acceptance test: save rejected')) errors.push(message.text()); });
    await context.route('**/*.supabase.co/**', async route => { blockedProduction.push(route.request().url()); await route.abort('blockedbyclient'); });
    await context.route('**/npm/@supabase/supabase-js@2', route => route.fulfill({ contentType: 'application/javascript', body: '/* Isolated acceptance backend installed before boot. */' }));
    await context.route('**/pdf-lib.min.js', route => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(require.resolve('pdf-lib/dist/pdf-lib.min.js'), 'utf8') }));
    await context.addInitScript({ path: path.join(__dirname, 'browser-fixture.js') });
    try {
        await page.goto(publishedURL || `http://127.0.0.1:${server.address().port}`, { waitUntil: 'load' });
        await page.waitForFunction(() => window.db?.publishers.length === 1000 && document.getElementById('global-loader').classList.contains('hidden'));
        const nav = async tab => {
            const selector = profile.mobile ? `#m-btn-tab-${tab}` : `#btn-tab-${tab}`;
            const button = page.locator(selector);
            if (await button.count() && await button.isVisible()) await button.click();
            else if (profile.mobile && ['analytics', 'emergency'].includes(tab)) {
                await page.locator('#mobile-nav button').last().click();
                await page.locator(`#modal-mobile-menu button[onclick*="switchTab('${tab}')"]`).click();
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
        await nav('oclm');
        for (const view of ['people', 'preview', 'messages', 'schedule']) {
            await page.locator(`#ca-midweek-root [data-view="${view}"]`).click();
            assert.equal(await page.locator(`#${view}View`).isVisible(), true);
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
        assert.deepEqual(blockedProduction, [], 'Unexpected production database request');
        assert.deepEqual(errors, [], 'Browser console/page errors');
        reports.push({ profile: profile.name, status: 'passed', timings });
        console.log('PASS', profile.name, ': navigation, 1000 records, drafts, rejected/successful saves, dialogs, PDF downloads, scheduler views and seven themes');
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
