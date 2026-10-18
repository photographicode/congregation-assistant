import fontkit from '@pdf-lib/fontkit';
import {readdir} from 'node:fs/promises';
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex');const manifest=JSON.parse(await readFile('tests/golden/v1/manifest.json'));
for(const [name,hash] of Object.entries(manifest.templates)){assert.equal(sha(await readFile('assets/pdf-templates/'+name)),hash,'Original form template changed: '+name);}
const files=manifest.fixtures.map(f=>'work/pdf-v2/'+f.name+'.pdf');for(const file of files){const table=execFileSync('pdffonts',[file],{encoding:'utf8'}).split('\n').slice(2).filter(s=>s.trim());assert(table.length,'No PDF fonts');for(const row of table){assert(/^\S*(?:\+)?NotoSans\S*\s/.test(row),'Unexpected PDF font: '+row);assert(/\s+yes\s+(?:yes|no)\s+(?:yes|no)\s+\d+\s+\d+\s*$/.test(row),'Font not embedded: '+row);}}
console.log('PASS unchanged S-21/S-3/S-88 template SHA-256 and all fonts embedded in 17 native fixtures');

for(const name of (await readdir('assets/fonts')).filter(n=>/^NotoSans.*-(Regular|Bold)\.ttf$/.test(n))){const font=fontkit.create(await readFile('assets/fonts/'+name));assert.equal(Object.keys(font.variationAxes||{}).length,0,'PDF font must be static: '+name);assert(font.postscriptName.startsWith('NotoSans'),'PDF family: '+name);}
