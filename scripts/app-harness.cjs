/* A small DOM fixture for regression tests; it does not replace browser verification. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m => !/\bsrc\s*=/.test(m[1]));
const markup = html.slice(0, html.indexOf('<script>'));
function createHarness({ cloudAvailable = true, date = Date, config } = {}) {
    const elements = new Map(), messages = [], consoleErrors = [], timers = [], events = new Map(), calls = [];
    const makeStorage = () => {
        const data = new Map();
        return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key), keys: () => [...data.keys()] };
    };
    const localStorage = makeStorage(), sessionStorage = makeStorage();
    function element(id = '', attrs = {}) {
        const classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
        const attributes = new Map(Object.entries(attrs));
        const result = {
            id, value: attrs.value || '', innerHTML: '', textContent: '', checked: 'checked' in attrs, disabled: 'disabled' in attrs,
            style: { setProperty() {} }, dataset: {}, options: [], children: [], isConnected: true,
            classList: { add: (...items) => items.forEach(x => classes.add(x)), remove: (...items) => items.forEach(x => classes.delete(x)), contains: x => classes.has(x), toggle(x, flag) { if (flag ?? !classes.has(x)) classes.add(x); else classes.delete(x); } },
            addEventListener(name, callback) { this['on' + name] = callback; },
            setAttribute: (key, value) => attributes.set(key, String(value)), getAttribute: key => attributes.get(key) ?? null, removeAttribute: key => attributes.delete(key), hasAttribute: key => attributes.has(key),
            querySelector(selector) { return selector.startsWith('#') ? elements.get(selector.slice(1)) || null : null; }, querySelectorAll() { return []; },
            reset() {}, focus() { document.activeElement = result; }, select() {}, click() {}, blur() {}, scrollIntoView() {},
            insertAdjacentElement(position, child) { (this.adjacentElements ||= []).push(child); }, appendChild(child) { this.children.push(child); }, remove() { this.isConnected = false; }, closest() { return null; }, contains() { return true; },
            getClientRects() { return this.classList.contains('hidden') ? [] : [{}]; }, getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }; }
        };
        for (const [key, value] of Object.entries(attrs)) if (key.startsWith('data-')) result.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
        return result;
    }
    for (const tag of markup.matchAll(/<[a-z][\w-]*\b[^>]*\bid="([^"]+)"[^>]*>/gi)) {
        const attrs = Object.fromEntries([...tag[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
        elements.set(tag[1], element(tag[1], attrs));
    }
    const document = {
        body: element('body'), documentElement: element('html'), activeElement: null,
        getElementById: id => elements.get(id) || null, querySelector(selector) { return selector.startsWith('#') ? elements.get(selector.slice(1)) || null : null; },
        querySelectorAll(selector) { return selector === '[data-theme-option]' ? [...elements.values()].filter(e => e.dataset.themeOption) : []; },
        createElement: tag => element('', { tag }), addEventListener(name, callback) { events.set('document:' + name, callback); }, execCommand: () => true
    };
    // Theme choices have no IDs and therefore need separate fixture nodes.
    const themeButtons = [...markup.matchAll(/data-theme-option="([^"]+)"/g)].map(m => element('', { 'data-theme-option': m[1] }));
    const queryAll = document.querySelectorAll.bind(document);
    document.querySelectorAll = selector => selector === '[data-theme-option]' ? themeButtons : queryAll(selector);
    let outcome = { data: [], error: null }, thrown = null;
    const client = {
        from(table) {
            const call = { table, operations: [] }; calls.push(call);
            const chain = new Proxy({}, { get: (_, key) => key === 'then' ? ((resolve, reject) => thrown ? reject(thrown) : resolve(typeof outcome === 'function' ? outcome(call) : outcome)) : (...args) => { call.operations.push([key, ...args]); return chain; } });
            return chain;
        }, rpc: async (name, args) => { calls.push({ rpc: name, args }); if (thrown) throw thrown; return outcome; },
        auth: { getSession: async () => ({ data: { session: null } }), signInWithOAuth: async () => ({ error: null }), signOut: async () => ({ error: null }) }
    };
    const window = {
        document, PDFLib: require('pdf-lib'), location: { search: '', hash: '', href: 'http://localhost/index.html',origin:'http://localhost',pathname:'/index.html' }, innerWidth: 1280, innerHeight: 800,
        addEventListener(name, callback) { const group = events.get('window:' + name) || []; group.push(callback); events.set('window:' + name, group); }, removeEventListener() {}, scrollTo() {}, open() {}
    };
    if (cloudAvailable) window.supabase = { createClient: () => client };
    if (config) window.CA_CONFIG = config;
    window.window = window; window.URL = URL;
    const globals = {
        window, document, localStorage, sessionStorage, location: window.location,
        navigator: { clipboard: { writeText: async () => {} } }, CSS: { escape: s => s },
        console: { log() {}, warn() {}, error: (...items) => consoleErrors.push(items) }, URL, URLSearchParams, Blob, Uint8Array, Array, atob, btoa,
        TextEncoder, TextDecoder, Date: date, Math, JSON, Intl, crypto: crypto.webcrypto, confirm: () => true, prompt: () => null,
        setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; }, clearTimeout() {}, setInterval: () => 1, queueMicrotask
    };
    const execute = code => new Function(...Object.keys(globals), code)(...Object.values(globals));
    execute(scripts[0][2]);
    execute(fs.readFileSync(path.join(root, 'public-links.js'), 'utf8'));
    execute(fs.readFileSync(path.join(root, 'pdf-tools.js'), 'utf8'));
    execute(fs.readFileSync(path.join(root, 'app-support.js'), 'utf8'));
    execute(scripts[1][2] + '\nwindow.__exports={s21:buildS21OriginalPdf,s3:buildS3OriginalPdf};');
    const toast = window.ui.showToast;
    window.ui.showToast = (text, type = 'success') => { messages.push({ text, type }); toast(text, type); };
    return { window, document, elements, localStorage, sessionStorage, globals, scripts, markup, calls, messages, consoleErrors, timers, events, execute,
        setCloud(result, error = null) { outcome = result; thrown = error; } };
}
module.exports = { createHarness, html, scripts, root };
