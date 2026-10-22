import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const current=JSON.parse(await readFile('eslint-suppressions.json','utf8'));
const base=process.env.QUALITY_BASE_REF||'origin/main';let previous;
try{previous=JSON.parse(execFileSync('git',['show',base+':eslint-suppressions.json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));}catch{const initial=execFileSync('git',['log','--diff-filter=A','--format=%H','--','eslint-suppressions.json'],{encoding:'utf8'}).trim().split('\n').at(-1);if(!initial)throw Error('No committed initial ESLint baseline exists.');previous=JSON.parse(execFileSync('git',['show',initial+':eslint-suppressions.json'],{encoding:'utf8'}));}
const count=data=>Object.values(data).reduce((sum,rules)=>sum+Object.values(rules).reduce((n,item)=>n+item.count,0),0);
for(const [file,rules]of Object.entries(current))for(const [rule,item]of Object.entries(rules))if(item.count>(previous[file]?.[rule]?.count||0))throw Error(`Suppression growth: ${file} ${rule}`);
console.log(`ESLint suppression count: ${count(previous)} → ${count(current)}`);
