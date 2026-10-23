import stylelint from 'stylelint';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const result=await stylelint.lint({files:['packages/ui/**/*.css','apps/web/src/**/*.css']});
const files={};let total=0;
for(const r of result.results){const file=path.relative(process.cwd(),r.source).replaceAll('\\','/');for(const w of r.warnings){const f=files[file]??={count:0,diagnostics:{}};const key=w.rule+':'+w.text;f.count++;total++;f.diagnostics[key]=(f.diagnostics[key]||0)+1;}if(r.invalidOptionWarnings?.length||r.parseErrors?.length)throw Error('Stylelint configuration/parse error in '+file);}
const report={measuredAt:'2026-10-24',total,files},baselineFile='docs/engineering/style-baseline.json';
await mkdir('work/quality',{recursive:true});await writeFile('work/quality/style-audit.json',JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--initialize')){await writeFile(baselineFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log('Initialized Stylelint baseline:',total);process.exit(0);}
const baseline=JSON.parse(await readFile(baselineFile,'utf8'));let base='origin/'+(process.env.GITHUB_BASE_REF||'main');if(execFileSync('git',['rev-parse',base],{encoding:'utf8'}).trim()===execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim())base='HEAD^';
const changed=new Set((execFileSync('git',['diff','--name-only',base],{encoding:'utf8'})+'\n'+execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'})).split('\n'));
const failures=[];for(const [file,current]of Object.entries(files)){if(changed.has(file))failures.push({file,rule:'changed CSS must have zero findings',count:current.count});for(const [signature,count]of Object.entries(current.diagnostics))if(count>(baseline.files[file]?.diagnostics[signature]||0))failures.push({file,rule:'new Stylelint finding',signature});}
let previous;try{previous=JSON.parse(execFileSync('git',['show',base+':'+baselineFile],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));}catch(error){if(error instanceof SyntaxError)throw error;}
if(previous)for(const [file,current]of Object.entries(baseline.files))for(const [signature,count]of Object.entries(current.diagnostics))if(count>(previous.files[file]?.diagnostics[signature]||0))failures.push({file,rule:'baseline cannot grow'});
console.log(JSON.stringify({baseline:baseline.total,current:total,failures},null,2));if(failures.length)process.exitCode=1;
