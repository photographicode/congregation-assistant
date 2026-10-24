import ts from 'typescript';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const config=ts.readConfigFile('tsconfig.strict.json',ts.sys.readFile);if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,' '));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd());
const program=ts.createProgram(parsed.fileNames,parsed.options);
const diagnostics=[...parsed.errors,...ts.getPreEmitDiagnostics(program)].filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>({file:d.file?path.relative(process.cwd(),d.file.fileName).replaceAll('\\','/'):'<config>',code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ').replaceAll(process.cwd(),'<repo>')}));
const files={};for(const d of diagnostics){const f=files[d.file]??={count:0,diagnostics:{}};f.count++;const key=d.code+':'+d.message;f.diagnostics[key]=(f.diagnostics[key]||0)+1;}
const report={typescript:ts.version,total:diagnostics.length,files};
await mkdir('work/quality',{recursive:true});await writeFile('work/quality/strict-types.json',JSON.stringify(report,null,2)+'\n');
const baselinePath='docs/engineering/ts-baseline.json';
if(process.argv.includes('--initialize')){await writeFile(baselinePath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log('Initialized strict diagnostic baseline:',report.total);process.exit(0);}
const baseline=JSON.parse(await readFile(baselinePath,'utf8'));
let base=process.env.CA_QUALITY_BASE||'origin/'+(process.env.GITHUB_BASE_REF||'main');
if(execFileSync('git',['rev-parse',base],{encoding:'utf8'}).trim()===execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim())base='HEAD^';
const changed=new Set((execFileSync('git',['diff','--name-only',base],{encoding:'utf8'})+'\n'+execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'})).trim().split('\n'));
const failures=[];
for(const [file,current]of Object.entries(files)){if(changed.has(file))failures.push({file,rule:'changed file must have zero diagnostics',count:current.count});const previous=baseline.files[file];if(!previous||current.count>previous.count)failures.push({file,rule:'per-file count increased'});for(const [signature,count]of Object.entries(current.diagnostics))if(count>(previous?.diagnostics[signature]||0))failures.push({file,rule:'new diagnostic',signature});}
// Baselines themselves cannot grow in subsequent changes.
try{const previous=JSON.parse(execFileSync('git',['show',base+':'+baselinePath],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));for(const [file,current]of Object.entries(baseline.files)){if(current.count>(previous.files[file]?.count||0))failures.push({file,rule:'baseline increased'});for(const [signature,count]of Object.entries(current.diagnostics))if(count>(previous.files[file]?.diagnostics[signature]||0))failures.push({file,rule:'baseline signature added'});}}catch(error){if(error instanceof SyntaxError)throw error;}
console.log(JSON.stringify({baseline:baseline.total,current:report.total,changedFiles:changed.size,failures},null,2));if(failures.length)process.exitCode=1;
