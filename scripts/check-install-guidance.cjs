/* Capability-based installation instructions; no real permissions or notifications requested. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{for(const [ua,touch,expected] of [
 ['Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1',0,'Share'],
 ['Mozilla/5.0 (iPhone) CriOS/130.0 Mobile Safari/604.1',0,'Safari'],
 ['Mozilla/5.0 (iPhone) OPiOS/5.0 Mobile Safari/604.1',0,'Safari'],
 ['Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1',5,'Share'],
 ['Mozilla/5.0 (Linux; Android 14) Chrome/130.0',0,'browser menu'],
 ['Mozilla/5.0 (Linux; Android 14) OPR/86.0',0,'browser menu'],
 ['Mozilla/5.0 (Linux; Android 14) Brave Chrome/130.0',0,'browser menu'],
 ['Mozilla/5.0 (Windows NT 10.0) Chrome/130.0',0,'install icon']]){
 const handlers={},modal=[],toasts=[];let standalone=false;
 const sandbox={navigator:{userAgent:ua,maxTouchPoints:touch},matchMedia:()=>({matches:standalone}),document:{getElementById:()=>null},location:{protocol:'http:'},setTimeout:()=>0,clearTimeout(){},console,Date,innerWidth:390};sandbox.window=sandbox;sandbox.addEventListener=(name,fn)=>handlers[name]=fn;sandbox.ui={openModal:id=>modal.push(id),showToast:t=>toasts.push(t)};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app-install.js'),'utf8'),sandbox);
 assert(sandbox.CAInstall.guidance().steps.join(' ').includes(expected),ua);await sandbox.installCongregationApp();assert.equal(modal.at(-1),'modal-install-app');
 let prevented=false,prompted=0;handlers.beforeinstallprompt({preventDefault:()=>prevented=true,prompt:async()=>prompted++,userChoice:Promise.resolve({outcome:'dismissed'})});await sandbox.installCongregationApp();assert(prevented);assert.equal(prompted,1);standalone=true;await sandbox.installCongregationApp();assert(toasts.at(-1).includes('already installed'));
 }console.log('PASS iPhone/iPad Safari, iOS alternative browsers, Android Chrome/Brave/Opera, desktop, native prompt and already-installed guidance');})().catch(e=>{console.error(e);process.exitCode=1});
