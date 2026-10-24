import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
const script=path.resolve('scripts/check-live-artifact.mjs');
test('live artifact gate compares exact published bytes and rejects a stale page',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ca-live-artifact-')),expected=path.join(directory,'expected');await mkdir(expected);
 const files={'deployment.json':JSON.stringify({sourceCommit:'fixture-head'}),'index.html':'<!doctype html><h1>Verified release</h1>', '.nojekyll':''};for(const [name,value]of Object.entries(files))await writeFile(path.join(expected,name),value);
 let stale=false;const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1);if(!(name in files)){res.writeHead(404).end();return;}res.end(stale&&name==='index.html'?'Old branch publisher':files[name]);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const run=()=>new Promise(resolve=>{const child=spawn(process.execPath,[script],{cwd:directory,env:{...process.env,CA_EXPECTED_ROOT:expected,CA_EXPECTED_COMMIT:'fixture-head',CA_LIVE_URL:'http://127.0.0.1:'+server.address().port+'/'},stdio:'ignore'});child.on('exit',resolve);});
 try{assert.equal(await run(),0);const report=()=>readFile(path.join(directory,'work/quality/live-artifact.json'),'utf8').then(JSON.parse);assert.equal((await report()).checked,2);stale=true;assert.notEqual(await run(),0);assert.equal((await report()).failures[0].file,'index.html');}finally{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
