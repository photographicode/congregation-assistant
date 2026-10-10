/* Privacy regression: report filenames only, never matched addresses. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),failures=[],canonical=fs.readFileSync(path.join(root,'support-config.js'),'utf8');
const configPaths=new Set(['support-config.js','staging/support-config.js','public-site-preview/support-config.js']);
const attributionPaths=new Set(['assets/fonts/NOTO-LICENSE.txt','staging/assets/fonts/NOTO-LICENSE.txt','public-site-preview/assets/fonts/NOTO-LICENSE.txt']);
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules','artifacts'].includes(entry.name))continue;const file=path.join(dir,entry.name),rel=path.relative(root,file).replaceAll(path.sep,'/');if(entry.isDirectory()){scan(file);continue;}if(!/\.(?:html|js|cjs|mjs|json|sql|md|yml|yaml|txt|py|css|svg)$/.test(file))continue;
const source=fs.readFileSync(file,'utf8');if(configPaths.has(rel)){assert.equal(source,canonical,'Generated support configuration drift: '+rel);continue;}if(attributionPaths.has(rel))continue;
for(const line of source.split('\n')){if(!line.includes('@'))continue;for(const m of line.matchAll(/[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,20}/g))if(!/^[^@]+@example\.(?:com|org|net|test|invalid)$/i.test(m[0]))failures.push({file:rel,kind:'non-example email'});}}
}
scan(root);assert.deepEqual(failures,[],'Privacy scan failed: '+JSON.stringify(failures));
assert.equal([...canonical.matchAll(/[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,20}/g)].length,1,'Use one support configuration value');
console.log('PASS source privacy: examples only, one canonical support configuration with identical generated bundles; required third-party font attribution retained');
