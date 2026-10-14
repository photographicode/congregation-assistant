import {readdir,readFile} from 'node:fs/promises';
async function walk(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(dir+'/'+e.name):dir+'/'+e.name))).flat();}
const config=JSON.parse(await readFile('apps/site/content/trust.json'));const patterns=[/\b(?:military-grade|bank-grade|100% secure|unhackable|guaranteed|zero risk|completely safe|official|approved by)\b/ig];if(!config.E2EE_CLAIMS_ENABLED)patterns.push(/end[- ]to[- ]end encrypted/ig);
const failures=[];for(const file of await walk('dist-site'))if(/\.(html|js|json)$/.test(file))for(const expression of patterns){const text=await readFile(file,'utf8');const matches=[...text.matchAll(expression)];if(matches.length)failures.push({file,phrases:[...new Set(matches.map(m=>m[0]))]});}
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exit(1);}console.log('PASS public claims linter; unavailable trust metrics are hidden');
