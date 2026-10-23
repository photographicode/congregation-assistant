import {execFileSync,spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const database=process.env.CA_MATRIX_DB||'ca_acceptance',container=process.env.CA_PSQL_DOCKER;
if(!['ca_acceptance','ca_verified'].includes(database))throw Error('Only isolated acceptance databases are permitted');
if(container&&!container.startsWith('ca-blockers-'))throw Error('Use the isolated acceptance container');
const command=container?'docker':'psql',prefix=container?['--host=unix:///var/run/docker.sock','exec','-i','-w','/repo',container,'psql']:['-h','127.0.0.1'];
const args=[...prefix,'-U','postgres','-d',database];
const query=sql=>execFileSync(command,[...args,'-Atc',sql],{encoding:'utf8'}).trim();
const rows=JSON.parse(query("select jsonb_agg(jsonb_build_object('name',p.proname,'signature',p.oid::regprocedure::text,'names',coalesce(p.proargnames,'{}'),'types',coalesce((select jsonb_agg(t::regtype::text) from unnest(p.proargtypes) t),'[]'),'anonymous',has_function_privilege('anon',p.oid,'execute'),'authenticated',has_function_privilege('authenticated',p.oid,'execute'),'service',has_function_privilege('service_role',p.oid,'execute'),'definer',p.prosecdef,'config',p.proconfig) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'"));
const manifest=JSON.parse(await readFile('scripts/rpc-access-manifest.json','utf8'));
if(JSON.stringify(rows.map(r=>r.signature))!==JSON.stringify(manifest.signatures))throw Error('RPC inventory changed: review grants and role cases');
for(const r of rows){if(r.service!==manifest.workerOnly.includes(r.name))throw Error('Service-role grant differs from manifest: '+r.name);if(r.anonymous!==manifest.anonymous.includes(r.name)||r.authenticated===manifest.noAuthenticated.includes(r.name))throw Error('RPC execute grant differs from manifest: '+r.name);if(r.definer&&!r.config?.some(c=>c.startsWith('search_path=')))throw Error('Definer search_path missing: '+r.name);}
const q=s=>"'"+String(s).replaceAll("'","''")+"'",ident=s=>'"'+s.replaceAll('"','""')+'"';
const report={pub_id:'pub-a',id:'role-matrix-fictional',cong_id:'a',service_year:2027,month:0,shared_in_ministry:true,hours:0,studies:0,comments:''};
function argument(name,type){
 let value;
 if(type==='jsonb'){const v=name==='p_cong'?{id:'role-matrix-new',name:'Fictional matrix control'}:name==='p_subscription'?{endpoint:'https://fcm.googleapis.com/fcm/send/fictional-role-matrix',keys:{p256dh:'A'.repeat(88),auth:'A'.repeat(24)}}:name==='p_reports'?[report]:name==='p_report'?report:name==='p_person'?{id:'pub-a',name:'Fictional publisher',gender:'Male'}:name==='p_rows'?[{id:'pub-a',name:'Fictional publisher',gender:'Male'}]:{};return q(JSON.stringify(v))+'::jsonb';}
 if(type==='text[]')return "ARRAY['admin']::text[]";
 if(type==='uuid')value=name==='p_token'?'00000000-0000-4000-8000-000000000090':'00000000-0000-4000-8000-000000000000';
 else if(type==='boolean')return(name==='p_authorized'?'false':'true')+'::boolean';
 else if(['integer','bigint','numeric'].includes(type))return(name==='p_year'?'2027':name==='p_midweek'?'3':name==='p_weekend'||name==='p_month'||name.includes('revision')||name.includes('version')?'0':'1')+'::'+type;
 else if(type==='date')value='2026-10-19';else if(type==='time without time zone')value='12:00:00';
 else if(type==='text'){if(name==='p_id')return 'null::text';value=name==='p_kind'?'report':name==='p_group'?'Group 1':name==='p_date'?'2026-10-19':name==='p_time'?'12:00':name==='p_cong_id'?'a':name==='p_publisher_id'||name==='p_pub_id'?'pub-a':name.includes('email')?'role-matrix@example.invalid':name==='p_token'||name==='p_session'?'00000000-0000-4000-8000-000000000000':name==='p_week'?'2026-W43':name==='p_department'?'av':name==='p_action'?'rotate':name==='p_timezone'?'UTC':name==='p_website'?'':name==='p_endpoint'?'https://localhost/role-matrix':'Fictional';}
 else throw Error('Add explicit fixture for argument type: '+type);
 return q(value)+'::'+type;
}
const actors=[{name:'anonymous',role:'anon',claims:{}},{name:'unapproved',role:'authenticated',claims:{sub:'00000000-0000-4000-8000-000000000001',email:'role-matrix@example.invalid',email_verified:true,app_metadata:{provider:'google'}}},{name:'non-google-owner-email',role:'authenticated',claims:{sub:'00000000-0000-4000-8000-000000000002',email:'owner@example.com',email_verified:true,app_metadata:{provider:'email'}}}];
const presetRoles=['publisher','field_service','group_overseer','attendance','oclm','weekend','av','attendant','cleaning','admin'];
for(const [index,preset]of presetRoles.entries())actors.push({name:preset+'-other-tenant',role:'authenticated',preset,claims:{sub:'00000000-0000-4000-8000-'+String(index+10).padStart(12,'0'),email:'role-matrix-'+preset+'@example.invalid',email_verified:true,app_metadata:{provider:'google'}}});
actors.push({name:'household-other-tenant',role:'authenticated',preset:'publisher',claims:{sub:'00000000-0000-4000-8000-000000000030',email:'role-matrix-household@example.invalid',email_verified:true,app_metadata:{provider:'google'}}});
actors.push({name:'superadmin',role:'authenticated',claims:{sub:'00000000-0000-4000-8000-000000000099',email:'owner@example.com',email_verified:true,app_metadata:{provider:'google'}}});
actors.push({name:'service-worker',role:'service_role',claims:{role:'service_role'}});
if(query("select count(*)=2 and bool_and(name in ('Example A','Example B')) from public.congregations where id in ('a','b')")!=='t')throw Error('Matrix requires fictional a/b acceptance tenants');
const ids=actors.filter(a=>a.preset||a.name==='superadmin').map(a=>q(a.claims.sub));
const cleanup="delete from public.ca_public_links where token='00000000-0000-4000-8000-000000000090';delete from ca_private.publisher_report_access where email like 'role-matrix-%@example.invalid';delete from public.congregation_access where email like 'role-matrix-%@example.invalid';delete from public.publishers where id='role-matrix-family-b';delete from auth.users where id in ("+ids.join(',')+");";
query(cleanup);
let seed="insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000099','owner@example.com',now());insert into public.ca_public_links(cong_id,kind,service_group,token) values('a','report','Group 1','00000000-0000-4000-8000-000000000090');";
for(const actor of actors.filter(a=>a.preset))seed+="insert into auth.users(id,email,email_confirmed_at) values("+q(actor.claims.sub)+","+q(actor.claims.email)+",now());insert into public.congregation_access(cong_id,email,role,service_group,publisher_id) values('b',"+q(actor.claims.email)+","+q(actor.preset)+",'Group 2',"+(actor.preset==='publisher'?"'pub-b'":"null")+");";
seed+="insert into public.publishers select (jsonb_populate_record(null::public.publishers,to_jsonb(p)||'{\"id\":\"role-matrix-family-b\",\"name\":\"Fictional household member\"}'::jsonb)).* from public.publishers p where id='pub-b';insert into ca_private.publisher_report_access(cong_id,email,publisher_id) values('b','role-matrix-household@example.invalid','role-matrix-family-b');";
query(seed);
let sql='\\set ON_ERROR_STOP off\n';
for(const actor of actors.filter(a=>a.preset))sql+=`begin;set local role authenticated;set local request.jwt.claims=${q(JSON.stringify(actor.claims))};do $fixture$ begin if not public.ca_has_role('b',array[${q(actor.preset)}]) then raise exception 'ROLE_MATRIX_FIXTURE|${actor.name}';end if;end $fixture$;rollback;\n`;
for(const row of rows)for(const actor of actors){const call='select to_jsonb(public.'+ident(row.name)+'('+row.types.map((type,i)=>argument(row.names[i],type)).join(',')+'))';
 const service=actor.name==='service-worker',owner=actor.name==='superadmin',personal=manifest.ownerPersonalScopeOnly.includes(row.name);
 const publicCall=manifest.anonymous.includes(row.name),safe=manifest.safeBooleanHelpers.includes(row.name),self=manifest.selfScoped.includes(row.name),onboarding=manifest.onboarding.includes(row.name);
 const empty="(answer is null or answer in ('null'::jsonb,'false'::jsonb,'[]'::jsonb,'{}'::jsonb))";
 const returned=service&&manifest.workerOnly.includes(row.name)?'true':safe?(row.name==='ca_google_identity'?(actor.name==='non-google-owner-email'?"answer='false'::jsonb":"answer='true'::jsonb"):owner&&row.name!=='ca_can_read_group'?"answer='true'::jsonb":"answer='false'::jsonb"):self?(row.name==='remove_push_subscription'?"answer='true'::jsonb":"answer='[]'::jsonb"):publicCall||personal&&owner?empty:owner?'true':'false';
 const acceptedErrors=service&&manifest.workerOnly.includes(row.name)?'false':publicCall||onboarding?"state in ('42501','P0001','22023')":owner&&!personal&&!manifest.noAuthenticated.includes(row.name)?"state in ('P0001','22023','22007','23502','23503','23505','23514','40001')":"state='42501'";
 sql+=`begin; set local role ${actor.role}; set local request.jwt.claims=${q(JSON.stringify(actor.claims))};\ndo $matrix$ declare answer jsonb; state text; begin\n begin execute ${q(call)} into answer; state:='returned'; raise sqlstate 'Z0001'; exception when sqlstate 'Z0001' then null; when others then state:=sqlstate; end;\n if not ((${acceptedErrors}) or (state='returned' and (${returned}))) then raise exception 'ROLE_MATRIX_FAIL|${row.name}|${actor.name}|%',state;end if;\n raise notice 'ROLE_MATRIX_PASS|${row.name}|${actor.name}|%',state;end $matrix$;rollback;\n`;
}
const result=spawnSync(command,args,{input:sql,encoding:'utf8',maxBuffer:20*1024*1024});
query(cleanup);
const cases=[...result.stderr.matchAll(/ROLE_MATRIX_PASS\|([^|]+)\|([^|]+)\|([^\s]+)/g)].map(m=>({function:m[1],actor:m[2],outcome:m[3]}));
const passed=(result.stderr.match(/ROLE_MATRIX_PASS\|/g)||[]).length,failures=result.stderr.split('\n').filter(line=>line.includes('ERROR:')).map(line=>line.slice(line.indexOf('ERROR:')));
await mkdir('work/quality',{recursive:true});await writeFile('work/quality/rpc-role-matrix.json',JSON.stringify({source:'isolated fixture only',functions:rows.length,actors:actors.map(a=>a.name),expected:rows.length*actors.length,passed,failures,cases},null,2)+'\n');
console.log(JSON.stringify({functions:rows.length,expected:rows.length*actors.length,passed,failureCount:failures.length,failures:failures.slice(0,20)},null,2));if(result.status!==0||failures.length||passed!==rows.length*actors.length)process.exitCode=1;
