import {expect,test} from 'vitest';
import config from '../../public-config.json';
import {validatePublicConfig} from '../../packages/core/config';
test('the shipped public configuration validates without changing it',()=>expect(validatePublicConfig(config)).toEqual(config));
test.each([{APP_URL:'http://example.invalid'},{BASE_URL:'//example.invalid/'},{BASE_URL:'/app/../'},{domainConfigured:'false'},{SUPABASE_PUBLISHABLE_KEY:['sb','secret','forbidden','test','value'].join('_')}])('configuration rejects insecure or wrongly typed fields: %j',patch=>expect(()=>validatePublicConfig({...config,...patch})).toThrow());
test('legacy privileged JWTs are rejected',()=>{const payload=btoa(JSON.stringify({role:'service_role'}));expect(()=>validatePublicConfig({...config,SUPABASE_PUBLISHABLE_KEY:'header.'+payload+'.signature'})).toThrow();});
