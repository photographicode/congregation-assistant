import {describe,it,expect} from 'vitest';
import {nameInput,serviceInput,publisherInput} from '../../packages/core/input-limits';
describe('untrusted form limits',()=>{
 it('preserves Unicode and lets rendering escape script-looking text',()=>{expect(nameInput.parse('  മരിയ തോമസ്  ')).toBe('മരിയ തോമസ്');expect(serviceInput.parse({hours:0,studies:0,comments:'<script>alert(1)</script>'}).comments).toContain('<script>');});
 it('rejects empty, oversized and invisible names',()=>{for(const name of ['', '  ','x'.repeat(121),'Ma\u200bria'])expect(nameInput.safeParse(name).success).toBe(false);});
 it('enforces numeric bounds and quarter hours',()=>{for(const input of [{hours:745,studies:0,comments:''},{hours:.1,studies:0,comments:''},{hours:0,studies:100,comments:''},{hours:0,studies:-1,comments:''},{hours:0,studies:1,comments:'x'.repeat(501)}])expect(serviceInput.safeParse(input).success).toBe(false);expect(serviceInput.safeParse({hours:744,studies:99,comments:''}).success).toBe(true);});
 it('bounds contact fields',()=>{expect(publisherInput.safeParse({name:'Maria',phone:'1'.repeat(21)}).success).toBe(false);expect(publisherInput.safeParse({name:'Maria',email:'a@b.test'}).success).toBe(true);});
});
