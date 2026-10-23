import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const file='docs/engineering/coverage-baseline.json',current=JSON.parse(await readFile(file,'utf8'));
const flatten=(value,prefix='')=>Object.entries(value).flatMap(([key,v])=>typeof v==='number'?[[prefix+key,v]]:flatten(v,prefix+key+':'));
for(const metric of ['lines','functions','statements','branches'])if(typeof current.thresholds[metric]!=='number')throw Error('Coverage metric missing: '+metric);
const values=new Map(flatten(current.thresholds));for(const [,v]of values)if(v<0||v>100)throw Error('Invalid coverage threshold');
let previous;try{previous=JSON.parse(execFileSync('git',['show','origin/main:'+file],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));}catch(error){if(error instanceof SyntaxError)throw error;}
if(previous)for(const [key,value]of flatten(previous.thresholds))if(!values.has(key)||values.get(key)<value)throw Error('Coverage baseline cannot decrease or remove a scope: '+key);
console.log('PASS coverage ratchet: global metrics and existing scopes cannot decrease');
