import {readdir,readFile} from 'node:fs/promises';import path from 'node:path';
const production=process.argv.includes('--bundle');
async function walk(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).filter(e=>!['.git','node_modules','work','artifacts','docs','supabase','dist','dist-site','.openai'].includes(e.name)).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const files=await walk(production?'dist':'.');const problems=[];
const bad=/(?:app-v2-bridge|window\.ui|Unlock Database|Group Overseer Portal|Gender Matrix|Hope Designation|Poppins|<[^>]+\sonclick\s*=|\?ui=legacy)/i;
for(const file of files.filter(f=>/\.(?:html|css|tsx?|js|mjs)$/.test(f)&&!f.startsWith('scripts/'))){const source=await readFile(file,'utf8');if(bad.test(source))problems.push(file);if(/(?:apps\/web\/src|packages\/ui).*\.(?:tsx?|css)$/.test(file)&&/\p{Extended_Pictographic}/u.test(source))problems.push(file+' (pictographic UI)');}
if(!production){for(const file of files)if(/^(?:app.*\.(?:js|css)|weekend\.html|weekend-public\.js|service-worker\.js|public-links\.js|pdf-tools\.js)$/.test(file))problems.push(file+' (legacy root path)');}
if(problems.length){console.error('Cutover blocked by retained legacy paths:',[...new Set(problems)].join('\n'));process.exitCode=1;}else console.log('No legacy references in '+(production?'production bundle':'repository'));
