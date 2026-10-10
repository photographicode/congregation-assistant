const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),hits=[],brand=/\bJW\b|jw\.org|wol\.jw|JW Hub|JW Library|JW Broadcasting|Watchtower|Watch Tower/i;
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules','artifacts','docs','supabase','scripts','archive','experiments'].includes(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory()){scan(f);continue;}if(!/\.(?:html|js|css|json|webmanifest|svg)$/.test(f))continue;const value=fs.readFileSync(f,'utf8');if(brand.test(value))hits.push(path.relative(root,f));}}
scan(root);assert.deepEqual(hits,[],'Third-party branding in app/site files: '+JSON.stringify(hits));
console.log('PASS original app/site branding: no prohibited third-party marks in runtime or marketing source');
