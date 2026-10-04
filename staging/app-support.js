/* Shared interaction helpers. No account data leaves the browser here. */
(() => {
    'use strict';
    const inFlight = new WeakMap();
    const focusHistory = new Map();
    let actionButton = null;
    const rowViews = new WeakMap(), attendanceDrafts = new Map();
    const attendanceKey = () => `${window.currentCongId}_${document.getElementById('att-year')?.value}_${document.getElementById('att-month')?.value}`;
    function clearAttendanceDraft(key) { attendanceDrafts.delete(key); }
    function renderRows(target, rows, { key = '', label = 'records', pageSize = 50 } = {}) {
        let state = rowViews.get(target);
        if (!state) { state = { page: 0, key, pager: null }; rowViews.set(target, state); }
        if (state.key !== key) state.page = 0;
        state.key = key;
        state.page = Math.max(0, Math.min(state.page, Math.ceil(rows.length / pageSize) - 1));
        target.innerHTML = rows.slice(state.page * pageSize, (state.page + 1) * pageSize).join('');
        if (rows.length <= pageSize) { state.pager?.remove(); state.pager = null; return; }
        if (!state.pager) {
            const pager = document.createElement('nav');
            pager.className = 'ca-table-pages'; pager.setAttribute('aria-label', `${label} pages`);
            const previous = document.createElement('button'), status = document.createElement('span'), next = document.createElement('button');
            previous.type = next.type = 'button'; previous.textContent = 'Previous'; next.textContent = 'Next';
            status.setAttribute('aria-live', 'polite');
            pager.appendChild(previous); pager.appendChild(status); pager.appendChild(next);
            (target.closest('table')?.parentElement || target).insertAdjacentElement('afterend', pager);
            state.pager = pager;
        }
        const [previous, status, next] = state.pager.children;
        previous.disabled = state.page === 0; next.disabled = (state.page + 1) * pageSize >= rows.length;
        status.textContent = `${state.page * pageSize + 1}–${Math.min((state.page + 1) * pageSize, rows.length)} of ${rows.length} ${label}`;
        previous.onclick = () => { state.page--; renderRows(target, rows, { key, label, pageSize }); };
        next.onclick = () => { state.page++; renderRows(target, rows, { key, label, pageSize }); };
    }
    function reconcileDialogs() {
        for (const dialog of focusHistory.keys()) {
            if (!dialog.getClientRects().length || dialog.classList.contains('hidden') || dialog.getAttribute('aria-hidden') === 'true') focusHistory.delete(dialog);
        }
        document.body.classList.toggle('ca-dialog-open', focusHistory.size > 0);
    }

    function notify(error) {
        console.error('Application action failed:', error);
        window.ui?.showToast(error?.message || 'This action could not finish. Please try again.', 'error');
    }

    function protectAction(owner, name, buttonId) {
        const original = owner?.[name];
        if (typeof original !== 'function') return;
        owner[name] = function (...args) {
            if (args[0]?.type === 'submit') args[0].preventDefault();
            const button = document.getElementById(buttonId) || args[0]?.submitter || actionButton;
            if (button && inFlight.has(button)) return inFlight.get(button);
            const wasDisabled = button?.disabled;
            const label = button?.innerHTML;
            if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
            // Convert synchronous throws and rejected writes into a recoverable UI state.
            const task = (async () => {
                try { await Promise.resolve(); return await original.apply(this, args); }
                catch (error) { notify(error); return false; }
                finally {
                    if (button) {
                        button.disabled = wasDisabled;
                        button.removeAttribute('aria-busy');
                        if (['login', 'overseerLogin'].includes(name)) button.innerHTML = label;
                        inFlight.delete(button);
                    }
                }
            })();
            if (button) inFlight.set(button, task);
            return task;
        };
    }

    function parseCSV(input) {
        const rows = []; let row = [], value = '', quoted = false;
        const text = String(input).replace(/^\uFEFF/, '');
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '"') {
                if (quoted && text[i + 1] === '"') { value += '"'; i++; }
                else if (quoted || value === '') quoted = !quoted;
                else value += ch;
            } else if (ch === ',' && !quoted) { row.push(value); value = ''; }
            else if ((ch === '\n' || ch === '\r') && !quoted) {
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row.push(value); if (row.some(v => v.trim())) rows.push(row);
                row = []; value = '';
            } else value += ch;
        }
        if (quoted) throw new Error('CSV contains an unclosed quotation mark. Check the file and try again.');
        row.push(value); if (row.some(v => v.trim())) rows.push(row);
        return rows;
    }
    const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    function download(bytes, filename, type = 'application/pdf') {
        const url = URL.createObjectURL(new Blob([bytes], { type }));
        const link = document.createElement('a');
        link.href = url; link.download = filename.replace(/[\\/:*?"<>|]/g, '_');
        document.body.appendChild(link); link.click(); link.remove();
        // Leave enough time for browsers to consume the URL before releasing it.
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    }

    function dialogOpened(dialog) {
        if(dialog.id==='modal-mobile-menu'){
            const sections=dialog.querySelector('.ca-mobile-menu-content');
            if(sections)sections.scrollTop=0;
        }
        focusHistory.set(dialog, document.activeElement);
        dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
        const heading = dialog.querySelector('h2,h3,[id$="Title"],[id$="title"]');
        if (heading?.id) dialog.setAttribute('aria-labelledby', heading.id);
        document.body.classList.add('ca-dialog-open');
        setTimeout(() => {
            if (!focusHistory.has(dialog) || !dialog.getClientRects().length || dialog.classList.contains('hidden')) return;
            const first = dialog.querySelector('input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea,button:not([disabled])');
            first?.focus();
        }, 50);
    }
    function dialogClosed(dialog) {
        const previous = focusHistory.get(dialog);
        focusHistory.delete(dialog);
        reconcileDialogs();
        if (!focusHistory.size && previous?.isConnected && previous.getClientRects().length && !previous.closest('.hidden')) previous.focus();
    }
    function visibleDialogs() {
        return [...document.querySelectorAll('[role="dialog"], [id^="modal-"].fixed, #sys-prompt-overlay')]
            .filter(el => el.getClientRects().length && !el.classList.contains('hidden') && (el.getAttribute('aria-hidden') !== 'true'));
    }

    function init({ cloudAvailable }) {
        document.addEventListener('click', event => {
            actionButton = event.target.closest('button');
            queueMicrotask(() => { actionButton = null; });
        }, true);
        document.addEventListener('submit', event => { actionButton = event.submitter; queueMicrotask(() => { actionButton = null; }); }, true);
        ['savePublisher','saveS4','saveBulkEntry','handleSysPromptConfirm','printS3','printS88','downloadS21Publisher','downloadS21Filtered','downloadS21Group','printEmergencyContacts','publishOCLM','addRoleAccess','removeRoleAccess'].forEach(name => protectAction(window.ui, name));
        ['saveAttendance','savePublicAttendance','createCongregation','updateCongregation','changeAdminPassword','changeGroupPassword','setGroupPassword','revokeAP','importContacts','importReports'].forEach(name => protectAction(window.db, name));
        protectAction(window.auth, 'login', 'auth-btn');
        protectAction(window.auth, 'overseerLogin', 'overseer-auth-btn');
        protectAction(window.auth, 'googleLogin', 'auth-google-btn');
        protectAction(window.auth, 'activateGoogleRole');
        const renderAttendance = window.ui.renderAttendance;
        window.ui.renderAttendance = (...args) => {
            renderAttendance(...args);
            const draft = attendanceDrafts.get(attendanceKey());
            if (!draft) return;
            for (const [id, value] of draft) { const input = document.getElementById(id); if (input) input.value = value; }
            for (let week = 1; week <= 5; week++) for (const meeting of ['mid', 'end']) {
                if (draft.has(`att-w${week}-${meeting}-type`)) window.ui.toggleAttInput(week, meeting);
                if (draft.has(`att-w${week}-${meeting}-val`)) document.getElementById(`att-w${week}-${meeting}-val`).value = draft.get(`att-w${week}-${meeting}-val`);
                if (draft.has(`att-w${week}-${meeting}-type`) || draft.has(`att-w${week}-${meeting}-val`)) window.ui.toggleAttEdit(week, meeting);
            }
        };
        const rememberAttendance = event => {
            if (!/^att-w[1-5]-(mid|end)-(type|val)$/.test(event.target.id)) return;
            const key = attendanceKey(), draft = attendanceDrafts.get(key) || new Map();
            // Capture both fields because changing an event type can clear the count.
            const prefix = event.target.id.replace(/-(type|val)$/, '');
            for (const suffix of ['type', 'val']) { const input = document.getElementById(`${prefix}-${suffix}`); if (input) draft.set(input.id, input.value); }
            attendanceDrafts.set(key, draft);
        };
        document.addEventListener('input', rememberAttendance);
        document.addEventListener('change', rememberAttendance);
        const open = window.ui.openModal, close = window.ui.closeModal;
        window.ui.openModal = (...args) => { if(args[0]==='modal-mobile-menu'){window.ui.applyRoleNavigation();document.getElementById('m-btn-tab-menu')?.setAttribute('aria-expanded','true');} open(...args); const el = document.getElementById(args[0]); if (el) dialogOpened(el); };
        window.ui.closeModal = id => { if(id==='modal-mobile-menu')document.getElementById('m-btn-tab-menu')?.setAttribute('aria-expanded','false');close(id); const el = document.getElementById(id); if (el) dialogClosed(el); };

        document.querySelectorAll('label:not([for])').forEach(label => {
            const input = label.parentElement?.querySelector('input:not([type="hidden"]),select,textarea');
            if (input?.id) label.htmlFor = input.id;
        });
        document.querySelectorAll('button').forEach(button => {
            if (!button.hasAttribute('type') && !button.closest('form')) button.type = 'button';
            if (!button.hasAttribute('aria-label') && button.title) button.setAttribute('aria-label', button.title);
        });
        const toast = document.getElementById('toast');
        toast?.setAttribute('role', 'status'); toast?.setAttribute('aria-live', 'polite');
        document.addEventListener('keydown', event => {
            const dialogs = visibleDialogs(); const dialog = dialogs.at(-1);
            if (!dialog) return;
            if (event.key === 'Escape') {
                if (dialog.id === 'assignModal') { window.closeAssignModal(); return; }
                if (dialog.id === 'personModal') { document.getElementById('cancelPerson')?.click(); return; }
                if (dialog.id === 'sys-prompt-overlay') window.ui.closeSysPrompt();
                else if (dialog.id.startsWith('modal-')) window.ui.closeModal(dialog.id);
                return;
            }
            if (event.key === 'Tab') {
                const focusable = [...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
                const first = focusable[0], last = focusable.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        });
        window.addEventListener('unhandledrejection', event => { event.preventDefault(); notify(event.reason); });
        window.addEventListener('offline', () => window.ui.setSyncStatus('error', 'Offline'));
        window.addEventListener('online', () => window.ui.setSyncStatus('error', 'Online · reload to sync'));
        if (!cloudAvailable) {
            const banner = document.createElement('div');
            banner.className = 'ca-connection-banner'; banner.setAttribute('role', 'alert');
            banner.innerHTML = '<span>Cloud connection unavailable. Check your connection and reload to sign in or save.</span><button type="button">Reload</button>';
            banner.querySelector('button').addEventListener('click', () => location.reload());
            document.body.appendChild(banner);
        }
    }
    window.AppSupport = { init, parseCSV, csvCell, download, dialogOpened, dialogClosed, protectAction, renderRows, reconcileDialogs, clearAttendanceDraft };
})();
