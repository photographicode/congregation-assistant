export function pagesConfig(config,env={}){
 const custom=env.CUSTOM_DOMAIN_READY==='true';
 const site=(env.CA_PAGES_URL||(custom?(env.SITE_URL||config.SITE_URL||config.PUBLIC_SITE_URL):(config.GITHUB_PAGES_SOURCE_URL||'https://photographicode.github.io/congregation-assistant'))).replace(/\/$/,'');
 const app=(custom?(env.APP_URL||config.APP_URL):site+'/app').replace(/\/$/,'');
 for(const value of [site,app]){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Use an HTTPS deployment URL without credentials, query or fragment.');}
 const siteURL=new URL(site),appURL=new URL(app),base=siteURL.pathname.replace(/\/$/,'')+'/',appBase=appURL.pathname.replace(/\/$/,'')+'/';
 if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)||!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(appBase))throw Error('Deployment paths must be absolute directory paths.');
 if(custom&&(/\.github\.io$/.test(siteURL.hostname)||siteURL.pathname!=='/'))throw Error('CUSTOM_DOMAIN_READY requires the owner-confirmed apex website URL. Keep it false for Pages fallbacks.');
 if(custom&&appURL.origin===siteURL.origin&&appBase!=='/app/')throw Error('A same-origin application must use /app/.');
 return {site,app,base,appBase,custom,externalApp:custom&&appURL.origin!==siteURL.origin,cname:custom?siteURL.hostname:null};
}
