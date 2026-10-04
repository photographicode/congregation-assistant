/* Browser acceptance fixture. Never connects to a real database. */
(() => {
    if(window.top!==window)return;
    const cong = { id: 'qa-congregation', name: 'Acceptance Test', status: 'active', feature_attendance: true, feature_emergency_contacts: true, feature_oclm: true };
    const publishers = Array.from({ length: 1000 }, (_, i) => ({ id: `qa-${i}`, cong_id: cong.id, name: i === 0 ? 'Alex O\'Brien & Family' : `Publisher ${String(i).padStart(4, '0')}`, service_group: `Group ${i % 10}`, gender: i % 2 ? 'Female' : 'Male', hope: 'Other Sheep', dob: '1990-01-01', baptized: '2010-01-01', is_elder: i % 30 === 0, is_ms: false, is_rp: i % 20 === 0, is_sp: false, is_fm: false, phone: '1234567890', address: '17 Example Street', emergency_name: 'Emergency Contact', emergency_relationship: 'Family', emergency_phone: '1234567890' }));
    const tables = { congregations: [cong], publishers, reports: [], meeting_attendance: [], congregation_access: [], group_access: [] };
    const backend = window.__qaBackend = { tables, writes: [], rejectWrites: false, delay: 0, session: null, oauthRequests: [], rpcCalls: [], publications: {}, publicLinks: {}, reads: [] };
    window.supabase = { createClient: () => ({
        auth: { getSession: async () => ({ data: { session: backend.session } }), signInWithOAuth: async options => { backend.oauthRequests.push(options); return { error: null }; }, signInWithPassword: async ({email,password}) => {if(password!=="qa-owner-password")return {data:{session:null},error:{message:"Invalid login credentials"}};backend.session={user:{email}};return {data:{session:backend.session},error:null};}, signOut: async () => {backend.session=null;return {error:null};} },
        from(table) {
            const operations = [];backend.reads.push(table);
            const chain = new Proxy({}, { get: (_, method) => method === 'then' ? (resolve, reject) => {
                const execute = async () => {
                    const write = operations.find(([name]) => ['upsert', 'insert', 'update', 'delete'].includes(name));
                    if (backend.delay) await new Promise(done => setTimeout(done, backend.delay));
                    if (write) {
                        backend.writes.push({ table, operations });
                        if (backend.rejectWrites) return { data: null, error: { message: 'Acceptance test: save rejected' } };
                        const [name, payload] = write;
                        if (name === 'upsert' || name === 'insert') for (const row of Array.isArray(payload) ? payload : [payload]) {
                            const list = tables[table] ||= [], index = list.findIndex(item => item.id === row.id);
                            if (index < 0) list.push({ ...row }); else list[index] = { ...list[index], ...row };
                        }
                    }
                    let data = (tables[table] || []).filter(row => operations.filter(([name]) => name === 'eq').every(([, field, value]) => row[field] === value));
                    if (operations.some(([name]) => name === 'single' || name === 'maybeSingle')) data = data[0] || null;
                    return { data, error: null };
                };
                execute().then(resolve, reject);
            } : (...args) => { operations.push([method, ...args]); return chain; } });
            return chain;
        }, rpc: async (name,args) => {
            backend.rpcCalls.push({name,args});
            if(name==='ca_is_superadmin')return {data:backend.superadmin===true,error:null};
            if(name==='upsert_oclm_public_snapshot'){
                if(backend.rejectWrites)return {data:null,error:{message:'Acceptance test: publication rejected'}};
                const token='qa-live-token';backend.publications[token]={snapshot:JSON.parse(JSON.stringify(args.p_snapshot))};return {data:{token},error:null};
            }
            if(name==='get_oclm_public_snapshot')return {data:backend.publications[args.p_token]||window.__qaPublicationsSeed?.[args.p_token]||null,error:null};
            if(name==='get_public_link_context')return {data:backend.publicLinks[args.p_token]||window.__qaPublicLinksSeed?.[args.p_token]||null,error:null};
            return { data: null, error: null };
        }
    }) };
    if(new URLSearchParams(location.search).get('cong')||new URLSearchParams(location.search).get('token')||location.hash.startsWith('#live='))return;
    if(sessionStorage.getItem('ca_signed_out')!=='true')for (const [key, value] of Object.entries({ fs_auth: 'true', fs_auth_type: 'admin', fs_role: 'admin', fs_cong_id: cong.id, fs_cong_name: cong.name, fs_last_activity: String(Date.now()) })) sessionStorage.setItem(key, value);
})();
