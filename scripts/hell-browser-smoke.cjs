const {chromium,firefox,webkit}=require('playwright'),{createServer}=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('dist'),server=createServer((request,response)=>{const url=new URL(request.url,'http://localhost'),candidate=path.resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname)),file=candidate.startsWith(root+path.sep)&&fs.existsSync(candidate)?candidate:path.join(root,'index.html');response.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(response);});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const results=[];
 try{
  for(const [name,type]of Object.entries({chromium,firefox,webkit})){
   const browser=await type.launch(name==='chromium'&&fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{});
   try{
    const context=await browser.newContext();await context.addInitScript(()=>localStorage.setItem('ca-v2-appearance',JSON.stringify({theme:'paper',style:'balanced',experienceChosen:true})));
    const errors=[],failed=[],cancelledProbes=[];const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    page.on('requestfailed',request=>{
     if(request.url().includes('.supabase.co'))return;
     const error=request.failure()?.errorText||'';
     const cancelledHealthProbe=request.method()==='HEAD'&&new URL(request.url()).pathname==='/version.json'&&['net::ERR_ABORTED','NS_BINDING_ABORTED','cancelled','Load request cancelled'].includes(error);
     if(cancelledHealthProbe)cancelledProbes.push({method:request.method(),error});else failed.push({url:request.url(),method:request.method(),error});
    });
    await page.route('**/*.supabase.co/**',route=>route.abort());await page.goto(`http://127.0.0.1:${server.address().port}/?demo=admin`);
    await page.getByRole('heading',{name:'Monthly submissions',exact:true}).waitFor();
    const greeting=page.getByRole('region',{name:'Your day',exact:true}).getByRole('heading',{level:1});await greeting.waitFor();assert((await greeting.textContent()).trim().length>0);
    await page.getByRole('region',{name:'Admin assistant'}).waitFor();assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    results.push({browser:name,home:true,greeting:true,assistant:true,cancelledHealthProbes:cancelledProbes});console.log('PASS browser',name);
   }finally{await browser.close();}
  }
  console.log(JSON.stringify({browsers:results,errors:0,unexpectedFailedRequests:0}));
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
