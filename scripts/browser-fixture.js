/* Browser acceptance fixture. Never connects to a real database. */
(() => {
    if(window.top!==window)return;
    const cong = { id: 'qa-congregation', name: window.__CA_DEMO_CAPTURE ? 'Demo Congregation' : 'Acceptance Test', status: 'active', feature_attendance: true, feature_emergency_contacts: true, feature_oclm: true };
    const publishers = Array.from({ length: 1000 }, (_, i) => ({ id: `qa-${i}`, cong_id: cong.id, name: i === 0 ? 'Alex O\'Brien & Family' : `Publisher ${String(i).padStart(4, '0')}`, service_group: `Group ${i % 10}`, gender: i % 2 ? 'Female' : 'Male', hope: 'Other Sheep', dob: '1990-01-01', baptized: '2010-01-01', is_elder: i % 30 === 0, is_ms: false, is_rp: i % 20 === 0, is_sp: false, is_fm: false, phone: '1234567890', address: '17 Example Street', emergency_name: 'Emergency Contact', emergency_relationship: 'Family', emergency_phone: '1234567890' }));
    const tables = { congregations: [cong], publishers, reports: [], meeting_attendance: [], congregation_access: [{cong_id:cong.id,email:'qa-admin@example.com',role:'admin',active:true}], group_access: [] };
    const backend = window.__qaBackend = { tables, writes: [], rejectWrites: false, delay: 0, session: sessionStorage.getItem('ca_signed_out')==='true'?null:{user:{email:'qa-admin@example.com',app_metadata:{provider:'google'}}}, drafts:{}, publicationVersions:{}, oauthRequests: [], rpcCalls: [], publications: {}, publicLinks: {}, reads: [] };
    window.supabase = { createClient: () => ({
        auth: { getSession: async () => ({ data: { session: backend.session } }), signInWithOAuth: async options => { backend.oauthRequests.push(options); return { error: null }; }, setSession: async () => {backend.session={user:{email:"owner@example.com"}};return {data:{session:backend.session},error:null};}, signInWithPassword: async ({email,password}) => {if(password!=="qa-owner-password")return {data:{session:null},error:{message:"Invalid login credentials"}};backend.session={user:{email}};return {data:{session:backend.session},error:null};}, signOut: async () => {backend.session=null;return {error:null};} },
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
                    let data = (tables[table] || []).filter(row => operations.filter(([name]) => name === 'eq').every(([, field, value]) => row[field] === value)&&operations.filter(([name])=>name==='in').every(([,field,values])=>values.includes(row[field])));
                    const order=operations.find(([name])=>name==='order');if(order)data.sort((a,b)=>String(a[order[1]]).localeCompare(String(b[order[1]])));const range=operations.find(([name])=>name==='range');if(range)data=data.slice(range[1],range[2]+1);
                    if (operations.some(([name]) => name === 'single' || name === 'maybeSingle')) data = data[0] || null;
                    return { data, error: null };
                };
                execute().then(resolve, reject);
            } : (...args) => { operations.push([method, ...args]); return chain; } });
            return chain;
        }, rpc: async (name,args) => {
            backend.rpcCalls.push({name,args});
            if(name==='get_attendance_meeting')return {data:backend.meetingContext||{configured:true,date:'2026-10-05',kind:'midweek',serviceYear:2027,month:9,week:1,timezone:'Asia/Kolkata',canSubmit:true,count:82},error:null};
            if(name==='submit_current_attendance')return backend.rejectWrites?{data:null,error:{message:'Acceptance test: save rejected'}}:{data:true,error:null};
            if(name==='get_attendance_calendar')return {data:{settings:{timezone:'Asia/Kolkata',midweek_day:3,weekend_day:0},events:[],memorials:[{meeting_date:'2026-04-02',service_year:2026,attendance:149}]},error:null};
            if(name==='request_congregation_trial')return backend.rejectWrites?{data:null,error:{message:'Acceptance test: request rejected'}}:{data:{reference:'339f299d-a5db-4b6e-9d87-067dabfd67ad',status:'pending',emailQueued:true},error:null};
            if(name==='get_trial_requests')return {data:[],error:null};
            if(name==='save_group_reports'){
                if(backend.rejectWrites)return {data:null,error:{message:'Acceptance test: save rejected'}};
                const saved=args.p_reports.map((r,i)=>({...r,id:'group-report-'+i,cong_id:args.p_cong_id,service_year:args.p_year,month:args.p_month}));
                tables.reports.push(...saved);backend.writes.push({table:'reports',method:'rpc',payload:saved});return {data:saved,error:null};
            }
            if(name==='get_admin_home_tasks')return {data:{reportsMissing:1000,reportPeriod:'September 2026',unpublishedWeeks:1,attendance:{configured:true,canSubmit:true,count:null}},error:null};
            if(name==='get_my_publisher_home')return {data:{name:'Personal Sample Publisher',assignments:[{week:'2026-W42',slot:'BibleReading',title:'My sample assignment'}],report:{period:'September 2026',submitted:false,hoursRequired:false,record:null},notice:null},error:null};
            if(name==='submit_my_publisher_report')return backend.rejectWrites?{error:{message:'Acceptance test: report save rejected'}}:{data:{saved:true,period:'September 2026'},error:null};
            if(name==='get_oclm_workspace')return {data:{revision:backend.drafts[args.p_cong_id]?.revision||0,draft:backend.drafts[args.p_cong_id]?.draft||null,publication:backend.publications['qa-live-token']?{...backend.publications['qa-live-token'],version:backend.publicationVersions[args.p_cong_id]||0,token:'qa-live-token'}:null},error:null};
            if(name==='save_oclm_workspace'){if(backend.rejectWrites)return {error:{message:'Acceptance test: save rejected'}};const old=backend.drafts[args.p_cong_id];if(args.p_expected_revision!==(old?.revision||0))return {error:{code:'40001',message:'Shared draft changed'}};const revision=(old?.revision||0)+1,draft=JSON.parse(JSON.stringify(args.p_data));backend.drafts[args.p_cong_id]={revision,draft};return {data:{revision,draft},error:null};}
            if(name==='publish_oclm_week'){if(backend.rejectWrites)return {error:{message:'Acceptance test: publication rejected'}};const old=backend.publications['qa-live-token']?.snapshot||{},draft=backend.drafts[args.p_cong_id].draft,assignments={...old.assignments};if(args.p_remove)delete assignments[args.p_week];else assignments[args.p_week]=Object.fromEntries(Object.entries(draft.assignments[args.p_week]||{}).filter(([id,a])=>!['cancelled','reassigned'].includes(a.status)).map(([id,a])=>[id,{personId:a.personId||null,customTitle:a.customTitle||''}]));const snapshot={v:2,kind:'midweek',congregation:'Acceptance Test',defaultWeek:args.p_week,publishedWeeks:Object.keys(assignments).sort(),assignments,people:draft.personnel.map(({id,name})=>({id,name})),additionalDuties:draft.additionalDuties,weekDetails:{...old.weekDetails,[args.p_week]:{additionalDuties:draft.additionalDuties,program:draft.programs?.[args.p_week]||null}}};const version=(backend.publicationVersions[args.p_cong_id]||0)+1;backend.publicationVersions[args.p_cong_id]=version;backend.publications['qa-live-token']={snapshot,updated_at:new Date().toISOString()};return {data:{version,token:'qa-live-token',snapshot,publishedAt:new Date().toISOString()},error:null};}
            if(name==='get_oclm_publication_history')return {data:[],error:null};
            if(name==='get_oclm_roster')return {data:tables.publishers.filter(p=>p.cong_id===args.p_cong_id).map(p=>({id:p.id,name:p.name,gender:p.gender,isElder:p.is_elder,isMS:p.is_ms})),error:null};
            if(name==='get_oclm_public_revision')return {data:(backend.publications[args.p_token]||window.__qaPublicationsSeed?.[args.p_token])?.updated_at||null,error:null};
            if(name==='ca_is_superadmin')return {data:backend.superadmin===true,error:null};
            if(name==='upsert_oclm_public_snapshot'){
                if(backend.rejectWrites)return {data:null,error:{message:'Acceptance test: publication rejected'}};
                const token='qa-live-token';backend.publications[token]={snapshot:JSON.parse(JSON.stringify(args.p_snapshot)),updated_at:new Date().toISOString()};return {data:{token},error:null};
            }
            if(name==='get_oclm_public_snapshot')return {data:backend.publications[args.p_token]||window.__qaPublicationsSeed?.[args.p_token]||null,error:null};
            if(name==='get_public_link_context')return {data:backend.publicLinks[args.p_token]||window.__qaPublicLinksSeed?.[args.p_token]||null,error:null};
            return { data: null, error: null };
        }
    }) };
    if(new URLSearchParams(location.search).get('cong')||new URLSearchParams(location.search).get('token')||location.hash.startsWith('#live='))return;
    if(sessionStorage.getItem('ca_signed_out')!=='true')for (const [key, value] of Object.entries({ fs_auth: 'true', fs_auth_type: 'admin', fs_role: 'admin', fs_cong_id: cong.id, fs_cong_name: cong.name, fs_last_activity: String(Date.now()) })) sessionStorage.setItem(key, value);
})();
