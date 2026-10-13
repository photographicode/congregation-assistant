// Fictional sessions and mocked APIs only; no live account or congregation used.
const assert = require('node:assert/strict');
module.exports = async function checkAuthRefresh(browser, base) {
  const storageKey = 'sb-ejosykrxjvwrhxfnputo-auth-token';
  const user = { id: '00000000-0000-4000-8000-000000000041', email: 'refresh-fixture@example.com', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const expires = Math.floor(Date.now()/1000)+3600;
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,email:user.email,aud:'authenticated',role:'authenticated',exp:expires})).toString('base64url'),'fixture-only'].join('.');
  const session = {access_token:token,refresh_token:'fixture-only',token_type:'bearer',expires_in:3600,expires_at:expires,user};
  const context = await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  try {
    await context.addInitScript(({storageKey,session})=>{if(window===window.top)localStorage.setItem(storageKey,JSON.stringify(session));},{storageKey,session});
    let membershipReads=0, frameLoads=0;
    await context.route('**/*.supabase.co/**',async route=>{
      const url=new URL(route.request().url()); let data=[];
      if(url.pathname.endsWith('/congregation_access')){membershipReads++;data=[{cong_id:'refresh-fixture',role:'admin',congregations:{name:'Fictional Refresh Congregation'}}];}
      else if(url.pathname.endsWith('/ca_v2_capabilities'))data={schema_version:2,groups:false,weekend:false,setup:false,private:false};
      else if(url.pathname.endsWith('/auth/v1/user'))data=user;
      await route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'},body:JSON.stringify(data)});
    });
    // Only the legacy document is replaced. The compiled parent, its real auth
    // client, BroadcastChannel and membership loading all execute normally.
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.searchParams.get('ui')==='legacy')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><body><label>Unsaved work<textarea id="draft"></textarea></label></body></html>'});
      await route.fallback();
    });
    const page=await context.newPage(); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('framenavigated',frame=>{if(frame!==page.mainFrame())frameLoads++;});
    await page.goto(base+'/v2/');
    await page.getByRole('heading',{name:'Good to have you here.'}).waitFor();
    for(const label of ['Schedule','Reports']){
      await page.locator('.rail').getByRole('button',{name:label,exact:true}).click();
      const frame=page.frameLocator('.legacy-frame');
      await frame.locator('#draft').fill('Unsaved '+label+' input');
      const readsBefore=membershipReads, loadsBefore=frameLoads;
      for(const event of ['SIGNED_IN','TOKEN_REFRESHED','SIGNED_IN']){
        await frame.locator('#draft').evaluate((node,{storageKey,session,event})=>{const channel=new BroadcastChannel(storageKey);channel.postMessage({event,session});setTimeout(()=>channel.close(),50);},{storageKey,session:{...session,user:{...user}},event});
        await page.waitForTimeout(200);
      }
      assert.equal(membershipReads,readsBefore,label+' must not reload membership on same-user auth events');
      assert.equal(frameLoads,loadsBefore,label+' iframe must not navigate again');
      assert.equal(await frame.locator('#draft').inputValue(),'Unsaved '+label+' input',label+' draft must survive');
    }
    await page.evaluate(storageKey=>{const channel=new BroadcastChannel(storageKey);channel.postMessage({event:'SIGNED_OUT',session:null});setTimeout(()=>channel.close(),50);},storageKey);
    await page.getByRole('button',{name:'Continue with Google'}).waitFor();
    assert.equal(await page.locator('.legacy-frame').count(),0,'Sign-out must remove protected tools');
    assert.deepEqual(errors,[]);
    console.log('PASS authenticated scheduler/reports keep iframe drafts across same-user SIGNED_IN and TOKEN_REFRESHED; sign-out still clears tools');
  } finally {await context.close();}
};
