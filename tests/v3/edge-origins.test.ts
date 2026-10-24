import {it,expect} from 'vitest';
import {acceptsOrigin} from '../../supabase/functions/_shared/origins';
it('accepts configured exact origins and private originless workers only',()=>{
 for(const origin of [null,'https://congregationassistant.com','https://app.congregationassistant.com','https://photographicode.github.io'])expect(acceptsOrigin(origin)).toBe(true);
 for(const origin of ['null','https://congregationassistant.com.evil.test','http://congregationassistant.com','https://photographicode.github.io.evil.test','https://evil.test'])expect(acceptsOrigin(origin)).toBe(false);
});
