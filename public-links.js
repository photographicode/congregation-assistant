/* Stable public URLs contain capabilities, never a roster or private credentials. */
(() => {
    let client, timer, refreshing = false;
    const base = () => new URL(location.pathname, location.origin).href;
    const tokenURL = (mode, token) => { const url = new URL(base()); url.searchParams.set('mode', mode); url.searchParams.set('token', token); return url.href; };
    const result = data => Array.isArray(data) ? data[0] : data;
    const rpc = async (name, args) => {
        if (!client) throw new Error('Cloud connection unavailable. Reload and try again.');
        const { data, error } = await client.rpc(name, args);
        if (error) throw new Error(error.code === 'PGRST202' ? 'The database needs the public-link setup. Ask your administrator to run the provided SQL setup.' : error.message || 'The cloud request failed.');
        return result(data);
    };
    const publicShell = () => {
        document.body.classList.add('public-mode');
        document.getElementById('auth-screen')?.classList.add('hidden');
        document.getElementById('global-loader')?.classList.add('hidden');
        document.body.classList.remove('ca-dialog-open');
    };
    const status = (message, failed = false) => {
        let el = document.getElementById('public-link-status');
        if (!el) { el = document.createElement('div'); el.id = 'public-link-status'; el.setAttribute('role','status'); }
        const host=document.body.classList.contains('mws-public-mode')?document.getElementById('liveView'):document.querySelector('.main-content');
        if(el.parentElement!==host)host.prepend(el);
        el.textContent = message; el.className = 'ca-public-status' + (failed ? ' ca-public-status-error' : '');
    };
    const openSnapshot = snap => {
        if (snap?.kind === 'midweek' && snap.v === 2 && Array.isArray(snap.publishedWeeks) && snap.assignments && Array.isArray(snap.people)) {
            document.body.classList.add('mws-public-mode');
            window.MidweekScheduler.showPublic(snap);
        } else if (snap && Array.isArray(snap.assignments)) {
            document.body.classList.remove('mws-public-mode');
            window.ui.publicOCLMSnapshot = snap;
            window.ui.switchTab('public-oclm');
            const title = document.getElementById('public-oclm-title'); title.textContent = `${snap.congregation || 'Congregation'} — OCLM Assignments`;
            const select = document.getElementById('public-oclm-week'), previous = select.value;
            const weeks = [...new Set(snap.assignments.map(a=>a.weekKey))].sort();
            select.innerHTML = '<option value="ALL">All weeks</option>' + weeks.map(w=>`<option value="${window.ui.escapeHtml(w)}">${window.ui.escapeHtml(window.ui.oclmWeekLabel(w))}</option>`).join('');
            select.value = weeks.includes(previous) ? previous : 'ALL'; window.ui.renderPublicOCLMBoard();
        } else throw new Error('This schedule has not been published, or the link has been withdrawn.');
    };
    const refresh = async (token, initial = false) => {
        if (refreshing || (document.hidden && !initial)) return;
        refreshing = true;
        try {
            const row = await rpc('get_oclm_public_snapshot', { p_token: token });
            openSnapshot(row?.snapshot);
            status('Showing the latest published schedule. Updates are checked every 30 seconds.');
        } catch (error) {
            if (initial) {
                document.body.classList.remove('mws-public-mode'); window.ui.switchTab('public-oclm');
                document.getElementById('public-oclm-list').replaceChildren();
            }
            status(initial ? error.message : 'Could not check for updates. The last loaded schedule is still shown; retry when connected.', true);
            if (initial) { const button=document.createElement('button'); button.type='button';button.className='ca-secondary-action';button.textContent='Retry';button.onclick=()=>refresh(token,true);document.getElementById('public-link-status').append(button); }
        } finally { refreshing = false; }
    };
    window.PublicLinks = {
        tokenURL,
        install(cloudClient) { client = cloudClient; },
        async publish(snapshot) {
            const row = await rpc('upsert_oclm_public_snapshot', {p_cong_id:String(window.currentCongId),p_snapshot:snapshot});
            if (!row?.token || typeof row.token !== 'string') throw new Error('Publishing was not confirmed. The database needs the OCLM public-link setup.');
            return {token:row.token,publishedAt:row.updated_at || new Date().toISOString()};
        },
        async create(kind, group = '', publisher = '') {
            const row = await rpc('create_public_link', {p_cong_id:String(window.currentCongId),p_kind:kind,p_group:group || null,p_pub_id:publisher || null});
            if (!row?.token) throw new Error('The database did not return a public link.');
            return tokenURL(kind === 'attendance' ? 'attendance' : 'report', row.token);
        },
        async submitReport(report) {
            return rpc('submit_public_report',{p_token:window.ui.publicLinkToken,p_report:window.db.mapRepToDB(report)});
        },
        async submitAttendance(year, month, changes) {
            return rpc('submit_public_attendance',{p_token:window.ui.publicLinkToken,p_year:year,p_month:month,p_changes:changes});
        },
        async boot() {
            const params = new URLSearchParams(location.search), mode=params.get('mode'), token=params.get('token');
            clearInterval(timer);
            if (location.hash.startsWith('#live=')) {
                publicShell();document.body.classList.add('mws-public-mode');
                if (!window.MidweekScheduler.showLegacyPublic()) { document.body.classList.remove('mws-public-mode');window.ui.switchTab('public-oclm');status('This older snapshot link is damaged. Ask the overseer for a new link.',true); }
                else status('This is an older snapshot link. Ask the overseer for the new live link to receive future published updates.');
                return true;
            }
            if (mode === 'oclm') {
                publicShell();
                if (token) { await refresh(token,true);timer=setInterval(()=>refresh(token),30000);window.addEventListener('focus',()=>refresh(token));document.addEventListener('visibilitychange',()=>refresh(token)); }
                else if (params.get('data')) { try { openSnapshot(window.ui.decodeOCLMSnapshot(params.get('data')));status('This is an older snapshot link. Ask the overseer for the new live link.'); } catch { window.ui.switchTab('public-oclm');status('This schedule link is damaged. Ask the overseer for a new link.',true); } }
                else {window.ui.switchTab('public-oclm');status('This link does not identify a published schedule. Ask the overseer to publish and copy its live link.',true);}
                return true;
            }
            if (token && ['report','attendance'].includes(mode)) {
                publicShell();document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
                try {
                    const context=await rpc('get_public_link_context',{p_token:token});
                    if (!context || context.kind !== mode) throw new Error('This public link is invalid, expired, or withdrawn. Ask your administrator for a new link.');
                    window.currentCongId=context.cong_id;window.ui.publicLinkToken=token;window.ui.publicGroup=context.service_group || null;
                    window.db.publishers=(context.publishers || []).map(window.db.mapPubFromDB);
                    window.db.currentCongData={id:context.cong_id,name:context.congregation};
                    window.ui.switchTab(mode==='attendance'?'public-attendance':'s4');
                    status(`${context.congregation} · ${mode==='attendance'?'Meeting attendance':'Monthly report'}`);
                } catch(error) { status(error.message,true);document.getElementById(mode==='attendance'?'tab-public-attendance':'tab-s4').classList.remove('active'); }
                return true;
            }
            if (mode==='overseer' && window.CA_CONFIG?.secureBackend) {
                document.body.classList.remove('overseer-mode','public-mode');
                window.auth.showGoogleStatus('Sign in with your approved Google account to open your Field Service tools.');
                return false;
            }
            if (params.get('cong') && window.CA_CONFIG?.secureBackend) {
                publicShell();
                document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
                status('This older link is not supported by this project. Ask your administrator for a new public link.',true);
                return true;
            }
            return false;
        }
    };
})();
